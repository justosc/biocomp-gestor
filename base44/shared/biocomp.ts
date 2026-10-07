// Pure calculation functions shared between frontend and backend.
// No imports allowed here — keep it dependency-free.

export const DEFAULT_SETTINGS = {
  sede: 'Vicente López',
  capacidadBinL: 800,
  binsTotales: 4,
  capacidadTachoL: 220,
  taraTacho220Kg: 12,
  virutaBolsaL: 80,
  virutaBolsaKg: 17,
  diasEstabilizacion: 20,
  factorFinalVerdura: 0.20,   // residuo nitrogenado liviano — disminuye 80% en 20 días
  factorFinalCarne: 0.20,     // residuo nitrogenado denso — disminuye 80% en 20 días
  factorFinalVirutaMasa: 0.25,     // residuo carbono estructurante — disminuye 75% en 20 días
  factorFinalVirutaVolumen: 0.25,  // el estructurante se degrada 75% (mismo factor de masa)
  tempIdealMinC: 45,
  tempIdealMaxC: 50,
  tableroOffsetC: 5,
  humedadIdealMinPercent: 40,
  humedadIdealPercent: 60,
  litrosSemanaReferencia: 1280,
  kgSemanaReferencia: 700,
};

// --- Curva de deshidratación (modelo Kollvik) ---
// Peso: caída lineal hasta factorFinal en diasTotal días.
// Volumen: caída abrupta al inicio — 50% día 2, 20% día 3, 5.3%/día después (factor 0.947).
// La densidad (kg/L) sube con el tiempo porque el volumen cae más rápido que el peso.

export function decayMasaLineal(inicialKg, diasTranscurridos, diasTotal, factorFinal) {
  if (inicialKg <= 0) return 0;
  const d = Math.max(0, Math.min(diasTranscurridos - 1, diasTotal));
  const perdidaTotal = inicialKg * (1 - factorFinal);
  const perdidaPorDia = perdidaTotal / diasTotal;
  return Math.max(inicialKg * factorFinal, inicialKg - perdidaPorDia * d);
}

export function decayVolumen(inicialL, diasTranscurridos) {
  if (inicialL <= 0) return 0;
  let v = inicialL;
  const d = Math.floor(Math.max(0, diasTranscurridos));
  for (let i = 2; i <= d + 1; i++) {
    if (i === 2) v = v * 0.5;
    else if (i === 3) v = v * 0.8;
    else v = v * 0.947;
  }
  return v;
}

// La viruta estructurante también se deshidrata, pero mucho más lento que el
// orgánico: absorbe humedad y se contrae. Su volumen decae de forma lineal
// (no con la caída abrupta del orgánico) hasta factorFinalVirutaVolumen.
export function decayVolumenViruta(inicialL, diasTranscurridos, diasTotal, factorFinal) {
  if (inicialL <= 0) return 0;
  const d = Math.max(0, Math.min(diasTranscurridos, diasTotal));
  const factor = factorFinal ?? 0.80;
  const perdidaTotal = inicialL * (1 - factor);
  const perdidaPorDia = perdidaTotal / diasTotal;
  return Math.max(inicialL * factor, inicialL - perdidaPorDia * d);
}

export function diasTranscurridos(fechaIngreso, horaIngreso) {
  if (!fechaIngreso) return 0;
  const time = horaIngreso || '00:00';
  const [hh, mm] = String(time).split(':').map(n => parseInt(n, 10) || 0);
  const inicio = new Date(fechaIngreso + 'T00:00:00');
  inicio.setHours(hh, mm, 0, 0);
  const ahora = new Date();
  const diffMs = ahora - inicio;
  if (diffMs <= 0) return 0;
  return diffMs / 86400000; // días fraccionados reales desde la hora de ingreso
}

// --- Helpers de categoría (compatibilidad hacia atrás) ---
// Nuevos registros usan tachosLiviano/tachosDenso/subtotalLiviano*/subtotalDenso*.
// Registros viejos usan tachosVerdura/tachosCarne/densos*/subtotalVerdura*/subtotalCarne*.
// El material crítico (papa, cebolla) se descarta: se registra pero NO entra al
// total orgánico ni al BioComp.

export function getLiviano(recepc) {
  if (!recepc) return { L: 0, Kg: 0 };
  return {
    L: recepc.subtotalLivianoL ?? recepc.subtotalVerduraL ?? 0,
    Kg: recepc.subtotalLivianoKg ?? recepc.subtotalVerduraKg ?? 0,
  };
}

export function getDenso(recepc) {
  if (!recepc) return { L: 0, Kg: 0 };
  // En registros viejos, los "densos" (cítricos, palta, ajo) se suman al denso.
  return {
    L: recepc.subtotalDensoL ?? ((recepc.subtotalCarneL ?? 0) + (recepc.densosLitros ?? 0)),
    Kg: recepc.subtotalDensoKg ?? ((recepc.subtotalCarneKg ?? 0) + (recepc.densosKg ?? 0)),
  };
}

export function getCritico(recepc) {
  if (!recepc) return { L: 0, Kg: 0 };
  return { L: recepc.criticoLitros ?? 0, Kg: recepc.criticoKg ?? 0 };
}

// --- Estimación por carga ---

export function estimacionCargaHoy(recepc, acond, fechaIngreso, settings, horaIngreso) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const dias = diasTranscurridos(fechaIngreso, horaIngreso);

  const livianoL = getLiviano(recepc).L;
  const livianoKg = getLiviano(recepc).Kg;
  const densoL = getDenso(recepc).L;
  const densoKg = getDenso(recepc).Kg;
  const virutaL = acond?.virutaRealL || 0;
  const virutaKg = acond?.virutaRealKg || 0;
  const virutaL_hoy = decayVolumenViruta(virutaL, dias, s.diasEstabilizacion, s.factorFinalVirutaVolumen);
  const virutaKg_hoy = decayMasaLineal(virutaKg, dias, s.diasEstabilizacion, s.factorFinalVirutaMasa);

  const livianoL_hoy = decayVolumen(livianoL, dias);
  const livianoKg_hoy = decayMasaLineal(livianoKg, dias, s.diasEstabilizacion, s.factorFinalVerdura);
  const densoL_hoy = decayVolumen(densoL, dias);
  const densoKg_hoy = decayMasaLineal(densoKg, dias, s.diasEstabilizacion, s.factorFinalCarne);

  // litros/kg = masa orgánica deshidratada (liviano + denso). Sigue la curva del
  // Excel y se usa para densidad/humedad (calibrada 40-60%). litrosTotal/kgTotal =
  // orgánico + viruta deshidratados: lo que realmente está adentro del BioComp y
  // lo que se descarga (el compost retirado incluye la viruta estructurante).
  const litros = livianoL_hoy + densoL_hoy;
  const kg = livianoKg_hoy + densoKg_hoy;
  return {
    litros,
    kg,
    litrosTotal: litros + virutaL_hoy,
    kgTotal: kg + virutaKg_hoy,
    virutaL: virutaL_hoy,
    virutaKg: virutaKg_hoy,
    virutaLInicial: virutaL,
    virutaKgInicial: virutaKg,
    dias: Math.round(dias * 10) / 10,
    esMadura: dias >= s.diasEstabilizacion,
    componentes: { livianoL_hoy, livianoKg_hoy, densoL_hoy, densoKg_hoy, virutaL_hoy, virutaKg_hoy }
  };
}

// --- Modelo FIFO ---

export function calcFIFOFraccionRestante(cargasActivas, totalDescargadoL, baseCurva = true) {
  const ordenadas = [...cargasActivas].sort((a, b) =>
    (a.fechaRealIngresoBiocomp || '').localeCompare(b.fechaRealIngresoBiocomp || '')
  );

  let restante = totalDescargadoL;
  const fraccion = {};

  ordenadas.forEach(c => {
    const litrosBase = baseCurva ? (c._estHoy?.litrosTotal || c._estHoy?.litros || 0) : (c._totalEntradaL || 0);
    const consumido = Math.min(restante, litrosBase);
    restante -= consumido;
    fraccion[c.id] = litrosBase > 0 ? Math.max(0, (litrosBase - consumido) / litrosBase) : 0;
  });

  return fraccion;
}

export function masaRealTotal(cargasActivas, totalDescargadoL) {
  const fraccion = calcFIFOFraccionRestante(cargasActivas, totalDescargadoL, true);
  let totalL = 0, totalKg = 0;
  cargasActivas.forEach(c => {
    const f = fraccion[c.id] || 0;
    if (f > 0 && c._estHoy && c.estado !== 'descargada') {
      totalL += c._estHoy.litrosTotal * f;
      totalKg += c._estHoy.kgTotal * f;
    }
  });
  return { litros: totalL, kg: totalKg, fraccion };
}

// Masa orgánica deshidratada (sin viruta) — para densidad/humedad calibrada al Excel.
export function masaOrganicaTotal(cargasActivas, totalDescargadoL) {
  const fraccion = calcFIFOFraccionRestante(cargasActivas, totalDescargadoL, true);
  let totalL = 0, totalKg = 0;
  cargasActivas.forEach(c => {
    const f = fraccion[c.id] || 0;
    if (f > 0 && c._estHoy && c.estado !== 'descargada') {
      totalL += c._estHoy.litros * f;
      totalKg += c._estHoy.kg * f;
    }
  });
  return { litros: totalL, kg: totalKg, fraccion };
}

export function masaBrutaTotal(cargasActivas, totalDescargadoL) {
  const fraccion = calcFIFOFraccionRestante(cargasActivas, totalDescargadoL, false);
  let totalL = 0, totalKg = 0;
  cargasActivas.forEach(c => {
    const f = fraccion[c.id] || 0;
    if (f > 0 && c.estado !== 'descargada') {
      totalL += (c._totalEntradaL || 0) * f;
      totalKg += (c._totalEntradaKg || 0) * f;
    }
  });
  return { litros: totalL, kg: totalKg, fraccion };
}

// --- Proyección a madurez ---

export function estimacionCargaMadura(recepc, acond, settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const livianoKg = getLiviano(recepc).Kg * s.factorFinalVerdura;
  const densoKg = getDenso(recepc).Kg * s.factorFinalCarne;
  const livianoL = decayVolumen(getLiviano(recepc).L, s.diasEstabilizacion);
  const densoL = decayVolumen(getDenso(recepc).L, s.diasEstabilizacion);
  const virutaKg = (acond?.virutaRealKg || 0) * s.factorFinalVirutaMasa;
  const virutaL = (acond?.virutaRealL || 0) * s.factorFinalVirutaVolumen;
  // Masa madura orgánica (sigue el Excel) + viruta deshidratada a su factor final.
  return {
    litros: livianoL + densoL,
    kg: livianoKg + densoKg,
    litrosTotal: livianoL + densoL + virutaL,
    kgTotal: livianoKg + densoKg + virutaKg,
  };
}

export function masaMaduraTotal(cargasActivas, totalDescargadoL, settings) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const conMadurez = cargasActivas.map(c => ({
    id: c.id,
    estado: c.estado,
    fechaRealIngresoBiocomp: c.fechaRealIngresoBiocomp,
    madura: estimacionCargaMadura(c._recepc, c._acond, s),
  }));
  const ordenadas = [...conMadurez].sort((a, b) =>
    (a.fechaRealIngresoBiocomp || '').localeCompare(b.fechaRealIngresoBiocomp || '')
  );
  let restante = totalDescargadoL;
  const fraccion = {};
  ordenadas.forEach(c => {
    const lb = c.madura.litrosTotal || c.madura.litros;
    const cons = Math.min(restante, lb);
    restante -= cons;
    fraccion[c.id] = lb > 0 ? Math.max(0, (lb - cons) / lb) : 0;
  });
  let totalL = 0, totalKg = 0;
  conMadurez.forEach(c => {
    const f = fraccion[c.id] || 0;
    if (f > 0 && c.estado !== 'descargada') {
      totalL += c.madura.litrosTotal * f;
      totalKg += c.madura.kgTotal * f;
    }
  });
  return { litros: totalL, kg: totalKg, fraccion };
}

// --- Densidad ---

export function densidadGL(kg, litros) {
  if (kg <= 0) return 0;
  return (litros / kg) * 1000;
}

export function densidadPercent(kg, litros) {
  if (kg <= 0) return 0;
  return (litros / kg) * 100;
}

// En el compost la humedad y la densidad se calculan como litros ÷ kg:
// humedad % = (litros / kg) * 100, y densidad g/L = (litros / kg) * 1000.
export function humedadPercent(kg, litros) {
  return densidadPercent(kg, litros);
}

// --- Código correlativo ---

export function generarCodigoCarga(cargasExistentes) {
  if (!cargasExistentes || cargasExistentes.length === 0) return 'C-0001';
  const nums = cargasExistentes.map(c => {
    const m = c.codigo?.match(/C-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = Math.max(...nums, 0);
  return 'C-' + String(max + 1).padStart(4, '0');
}

// --- Cálculo de viruta necesaria ---
// Liviano 1:1, Denso 2:1 (el denso aporta proteína y necesita más estructurante).

export function virutaNecesaria(recepc) {
  const livianoL = getLiviano(recepc).L;
  const densoL = getDenso(recepc).L;
  return livianoL + densoL * 2;
}

// --- Totales de recepción ---
// totalOrgánico = liviano + denso (lo que entra al BioComp).
// Crítico y descarte se descartan: no entran al total orgánico.

export function calcularTotalesRecepcion(tachosLiviano, tachosDenso, taraDefault) {
  const tara = taraDefault || 12;

  const subtotalLiviano = (tachosLiviano || []).reduce((acc, t) => {
    const litros = Number(t.litros) || 0;
    const bruto = Number(t.pesoBrutoKg) || 0;
    const taraKg = Number(t.taraKg) || tara;
    return { L: acc.L + litros, Kg: acc.Kg + Math.max(0, bruto - taraKg) };
  }, { L: 0, Kg: 0 });

  const subtotalDenso = (tachosDenso || []).reduce((acc, t) => {
    const litros = Number(t.litros) || 0;
    const bruto = Number(t.pesoBrutoKg) || 0;
    const taraKg = Number(t.taraKg) || tara;
    return { L: acc.L + litros, Kg: acc.Kg + Math.max(0, bruto - taraKg) };
  }, { L: 0, Kg: 0 });

  const totalOrganicoL = subtotalLiviano.L + subtotalDenso.L;
  const totalOrganicoKg = subtotalLiviano.Kg + subtotalDenso.Kg;
  const densidadOrganica = totalOrganicoL > 0 ? (totalOrganicoKg / totalOrganicoL) * 1000 : 0;

  return {
    subtotalLivianoL: Math.round(subtotalLiviano.L * 10) / 10,
    subtotalLivianoKg: Math.round(subtotalLiviano.Kg * 10) / 10,
    subtotalDensoL: Math.round(subtotalDenso.L * 10) / 10,
    subtotalDensoKg: Math.round(subtotalDenso.Kg * 10) / 10,
    totalOrganicoL: Math.round(totalOrganicoL * 10) / 10,
    totalOrganicoKg: Math.round(totalOrganicoKg * 10) / 10,
    densidadOrganica: Math.round(densidadOrganica * 10) / 10,
  };
}

// --- Bins necesarios ---

export function binsNecesarios(litros, capacidadBinL) {
  return Math.ceil(litros / (capacidadBinL || 800));
}