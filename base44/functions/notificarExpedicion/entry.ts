import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Push de notificación de expedición hacia la app de maduración (Base44).
// La app de maduración debe exponer un endpoint (function) `recibirExpedicion`
// que valide el header X-Api-Token con el mismo MADURACION_API_TOKEN y cree
// su propia notificación in-app para los administradores.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Solo admin puede disparar la notificación y marcar la expedición como enviada,
    // consistente con el RLS de Expedicion (update: solo admin).
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({} as any));
    const expedicionId: string = body.expedicionId || body.expedicion_id;
    if (!expedicionId) return Response.json({ error: 'expedicionId requerido' }, { status: 400 });

    let expedicion: any = null;
    try {
      expedicion = await base44.asServiceRole.entities.Expedicion.get(expedicionId);
    } catch {}
    if (!expedicion) return Response.json({ ok: false, reason: 'expedición no encontrada' });

    const webhookUrl = secrets.get('MADURACION_WEBHOOK_URL');
    const token = secrets.get('MADURACION_API_TOKEN');
    if (!webhookUrl) {
      return Response.json({ ok: false, notificado: false, reason: 'MADURACION_WEBHOOK_URL no configurado' });
    }

    const payload = {
      tipo: 'expedicion_biocomp',
      origen: 'BioComp',
      expedicion: {
        id: expedicion.id,
        codigo: expedicion.codigo,
        fechaRetiro: expedicion.fechaRetiro,
        fechaEstimadaIngreso: expedicion.fechaEstimadaIngreso,
        binsRetirados: expedicion.binsRetirados,
        litros: expedicion.litros,
        kg: expedicion.kg,
        transportista: expedicion.transportista,
        destino: expedicion.destino,
        obs: expedicion.obs,
      },
      notificacion: {
        titulo: `Expedición ${expedicion.codigo} — material para ingresar`,
        mensaje:
          `Llegan ${expedicion.binsRetirados} bins (${expedicion.litros}L · ${expedicion.kg}kg)` +
          ` del BioComp. Transportista: ${expedicion.transportista || '-'}` +
          (expedicion.fechaEstimadaIngreso ? `. Ingreso estimado: ${expedicion.fechaEstimadaIngreso}` : '') +
          (expedicion.destino ? `. Destino: ${expedicion.destino}` : ''),
      },
    };

    let notificado = false;
    let detalle: any = null;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': token || '',
        },
        body: JSON.stringify(payload),
      });
      notificado = res.ok;
      detalle = { status: res.status, body: await res.text().catch(() => '') };
    } catch (e: any) {
      detalle = { error: e.message };
    }

    // Marcar la expedición según resultado del push
    const now = new Date().toISOString();
    if (notificado) {
      await base44.asServiceRole.entities.Expedicion.update(expedicionId, {
        notificado: true,
        estado: 'enviado',
        fechaNotificacion: now,
      });
    }

    return Response.json({ ok: true, notificado, detalle, expedicion: payload.expedicion });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}