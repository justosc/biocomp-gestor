import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Requiere usuario autenticado de la app (admin u operario). Evita invocación
    // anónima externa que permitiría spam de emails y enumeración de cargas.
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'user') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({} as any));
    const cargaId: string = body.cargaId || body.carga_id;
    if (!cargaId) return Response.json({ error: 'cargaId requerido' }, { status: 400 });

    const carga = await base44.asServiceRole.entities.Carga.get(cargaId);
    if (!carga) return Response.json({ ok: false, reason: 'carga no encontrada' });

    // Datos del creador (quien registró la carga)
    const creatorId = carga.created_by_id;
    let creador: any = null;
    if (creatorId) {
      try { creador = await base44.asServiceRole.entities.User.get(creatorId); } catch {}
    }
    const creadorNombre = creador?.full_name || creador?.email || 'Un operario';
    const creadorRole = creador?.role || '';

    // Si el creador es admin (fui yo), no notificar
    if (creadorRole === 'admin') {
      return Response.json({ ok: true, notificado: false, reason: 'creador es admin' });
    }

    // Notificar a todos los administradores
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (!admins || admins.length === 0) {
      return Response.json({ ok: true, notificado: false, reason: 'sin admins' });
    }

    const codigo = carga.codigo || cargaId.slice(-6);
    const fecha = carga.fechaRealInicio || '';
    const hora = carga.horaRealInicio || '';
    const subject = `Nueva carga ${codigo} registrada en BioComp`;
    const text =
      `${creadorNombre} registró la carga ${codigo} en el BioComp.` +
      (fecha ? `\nFecha de recepción: ${fecha}${hora ? ` ${hora}` : ''}` : '') +
      `\n\nRevisá el detalle en la app de BioComp Gestor.`;

    const enviados: string[] = [];
    for (const a of admins) {
      if (a.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: a.email, subject, text });
          enviados.push(a.email);
        } catch (e) {
          // continuar con los demás administradores
        }
      }
      // Notificación in-app para el centro de notificaciones
      try {
        await base44.asServiceRole.entities.Notificacion.create({
          tipo: 'carga_creada',
          titulo: `Nueva carga ${codigo}`,
          mensaje: `${creadorNombre} registró la carga ${codigo} en el BioComp`,
          cargaId,
          destinatarioId: a.id,
          leida: false,
        });
      } catch (e) {
        // continuar si falla la notificación in-app
      }
    }

    // No exponer PII en la respuesta: ni del creador ni los emails de los admins.
    return Response.json({ ok: true, notificado: enviados.length > 0, enviados_count: enviados.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}