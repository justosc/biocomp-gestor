import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Genera un resumen ejecutivo narrativo de la semana del BioComp usando IA.
// Recibe las métricas ya agregadas desde el cliente (filtradas por RLS) y
// devuelve un texto en español para insertar en el PDF del informe semanal.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'user') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({} as any));
    const { desde, hasta, metrics } = body;
    if (!metrics) return Response.json({ error: 'metrics requerido' }, { status: 400 });

    const prompt = buildPrompt(desde, hasta, metrics);
    const result: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
    });
    const resumen = typeof result === 'string' ? result : (result?.response || result?.text || '');

    return Response.json({ ok: true, resumen });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildPrompt(desde: string, hasta: string, m: any): string {
  const tipos = Array.isArray(m.tiposOrganicos) && m.tiposOrganicos.length > 0
    ? m.tiposOrganicos.map((t: any) => `${t.tipo}: ${Math.round(t.litros)}L (${Math.round(t.kg)}kg)`).join(', ')
    : 'sin detalle por tipo';

  const criticoLine = (m.criticoL > 0 || m.criticoKg > 0)
    ? `- Crítico descartado (papa, cebolla — no entra al BioComp): ${Math.round(m.criticoL)} L · ${Math.round(m.criticoKg)} kg`
    : '- Crítico descartado: 0 (no hubo)';
  const tempBaja = (m.tempMinVal != null && m.tempMinVal < 38);

  return `Sos un asistente operativo del BioComp (máquina de compostaje de residuos orgánicos de Puntos Limpios). Escribís un resumen ejecutivo breve y directo para gerencia.

DATOS DE LA SEMANA del ${desde} al ${hasta}:

Recepción (lo que entró):
- Cargas recibidas: ${m.cargasRecibidas}
- Recepción orgánica total: ${Math.round(m.recepcionL)} L · ${Math.round(m.recepcionKg)} kg
- Material liviano: ${Math.round(m.livianoL)} L · ${Math.round(m.livianoKg)} kg
- Material denso: ${Math.round(m.densoL)} L · ${Math.round(m.densoKg)} kg
${criticoLine}
- Tipos de orgánico cargados: ${tipos}

Descarga (compost maduro que salió):
- Material descargado: ${Math.round(m.descargadoL)} L · ${Math.round(m.descargadoKg)} kg en ${m.binsUsados} bins
- Descargas realizadas: ${m.descargas}

Temperatura del proceso:
- Temperatura máxima: ${m.tempMaxVal}°C (${m.tempMaxCuando})
- Temperatura mínima: ${m.tempMinVal}°C (${m.tempMinCuando})
- Lecturas de temperatura: ${m.tratamientos}

Calidad:
- Inspecciones realizadas: ${m.inspecciones}

REGLAS:
- Escribí en español, ortografía correcta, prosa fluida. Sin listas ni bullets.
- Máximo 3 párrafos cortos. Menos es más: ido al punto, sin relleno ni rodeos.
- Toda cantidad de material va SIEMPRE en kg y litros (ambas unidades).
- Mencioná obligatoriamente: cuánto entró y cuánto se descargó, las temperaturas máx y mín, y la composición (liviano vs denso).
- Si hubo crítico descartado, aclaralo con su cantidad en kg y litros.
${tempBaja ? '- ATENCIÓN: se registró una temperatura por debajo de 38°C, lo que indica que el proceso se enfría y la actividad biológica frena. Mencionalo como alerta.\n' : ''}No inventes datos que no estén arriba.`;
}