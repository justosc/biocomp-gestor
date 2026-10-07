import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Endpoint de CONSULTA (pull) para la app de maduración.
// Devuelve el estado de acopio (bins ocupados, compost acumulado) y las
// expediciones (pendientes de recibir + ya enviadas) para que la app de
// maduración sepa cuánto hay acopiado y qué material viene en camino.
// Autorización: header X-Api-Token o query ?token= con MADURACION_API_TOKEN.
export default async function(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const tokenHeader = req.headers.get('X-Api-Token') || '';
    const tokenQuery = url.searchParams.get('token') || '';
    const token = secrets.get('MADURACION_API_TOKEN');
    if (!token || (tokenHeader !== token && tokenQuery !== token)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    const [bins, descargas, expediciones] = await Promise.all([
      base44.asServiceRole.entities.Bin.list('-created_date', 200),
      base44.asServiceRole.entities.Descarga.list('-created_date', 500),
      base44.asServiceRole.entities.Expedicion.list('-created_date', 500),
    ]);

    const binsOcupados = bins.filter((b: any) => b.estado === 'ocupado');
    const totalDescargadoL = descargas.reduce((s: number, d: any) => s + (d.litrosDescargados || 0), 0);
    const totalDescargadoKg = descargas.reduce((s: number, d: any) => s + (d.kgDescargados || 0), 0);

    // Expediciones que la app de maduración todavía no registró como recibidas
    const expedicionesPendientes = expediciones
      .filter((e: any) => e.estado !== 'recibido')
      .map((e: any) => ({
        id: e.id,
        codigo: e.codigo,
        fechaRetiro: e.fechaRetiro,
        fechaEstimadaIngreso: e.fechaEstimadaIngreso,
        binsRetirados: e.binsRetirados,
        litros: e.litros,
        kg: e.kg,
        transportista: e.transportista,
        destino: e.destino,
        estado: e.estado,
        notificado: e.notificado,
        obs: e.obs,
      }));

    // Marca la expedición como recibida (la app de maduración la confirma)
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({} as any));
      const expedicionId: string = body.expedicionId || body.expedicion_id;
      if (expedicionId) {
        await base44.asServiceRole.entities.Expedicion.update(expedicionId, { estado: 'recibido' });
        return Response.json({ ok: true, recibido: expedicionId });
      }
    }

    return Response.json({
      ok: true,
      origen: 'BioComp',
      acopio: {
        binsOcupados: binsOcupados.length,
        bins: binsOcupados.map((b: any) => ({ id: b.id, fecha: b.fecha, litros: b.litros, obs: b.obs })),
        compostAcumuladoL: Math.round(totalDescargadoL),
        compostAcumuladoKg: Math.round(totalDescargadoKg),
        totalDescargas: descargas.length,
      },
      expedicionesPendientes,
      totalExpediciones: expediciones.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}