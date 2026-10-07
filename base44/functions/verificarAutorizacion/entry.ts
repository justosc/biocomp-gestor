import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin siempre autorizado
    if (user.role === 'admin') {
      return Response.json({ autorizado: true, role: 'admin' });
    }

    const email = (user.email || '').toLowerCase().trim();

    // Buscar en la lista de pre-autorizaciones
    const invitaciones = await base44.asServiceRole.entities.Invitacion.filter({ email });
    const invitacion = invitaciones[0];

    if (invitacion) {
      // Auto-autorizar con el rol definido
      if (!user.autorizado || user.role !== invitacion.role) {
        await base44.asServiceRole.entities.User.update(user.id, {
          autorizado: true,
          role: invitacion.role
        });
      }
      if (invitacion.estado === 'pendiente') {
        await base44.asServiceRole.entities.Invitacion.update(invitacion.id, { estado: 'aceptada' });
      }
      return Response.json({ autorizado: true, role: invitacion.role });
    }

    // No estaba pre-autorizado
    if (!user.autorizado) {
      const existing = await base44.asServiceRole.entities.SolicitudAcceso.filter({ email });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.SolicitudAcceso.create({
          email,
          userId: user.id,
          estado: 'pendiente',
          fecha: new Date().toISOString().slice(0, 10)
        });
        // Notificar al admin (desarrollador)
        try {
          const admins = await base44.asServiceRole.entities.User.list('-created_date', 200);
          const adminEmail = admins.find(u => u.role === 'admin' && u.email)?.email;
          if (adminEmail) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: adminEmail,
              subject: 'Nueva solicitud de acceso - BioComp Gestor',
              body: `El usuario ${email} se registró y no estaba pre-autorizado.\n\nIngresá a la app > Usuarios para aprobar o rechazar su acceso.`
            });
          }
        } catch (e) { /* non-critical */ }
      }
      return Response.json({ autorizado: false, pendiente: true });
    }

    return Response.json({ autorizado: true, role: user.role });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}