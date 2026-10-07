import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action, userId, role, solicitudId } = body;

    if (action === 'aprobar') {
      await base44.asServiceRole.entities.User.update(userId, {
        autorizado: true,
        role: role || 'user'
      });
      if (solicitudId) {
        await base44.asServiceRole.entities.SolicitudAcceso.update(solicitudId, {
          estado: 'aprobada',
          roleAsignado: role || 'user'
        });
      }
      return Response.json({ ok: true });
    }

    if (action === 'rechazar') {
      if (solicitudId) {
        await base44.asServiceRole.entities.SolicitudAcceso.update(solicitudId, { estado: 'rechazada' });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}