import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MANUAL_CONTEXT = `
=== MANUAL DE MANTENIMIENTO BIOCOMP 1545 (Kollvik) ===

SISTEMA DE CARGA:
- La tolva tiene tapa con actuador eléctrico (manual o automático).
- Si hay avería eléctrica/mecánica en el actuador: desconectar máquina, abrir caja de registros del frontal, retirar tornillo de anclaje al eje de la tapa, quitar pasador del anclaje inferior.
- Rodamientos del eje de la tapa: revisar y engrasar mínimo 2 veces/año. Si hay ruido, sustituir.
- Relés de apertura/cierre de la puerta de carga: 20KA1 (apertura) y 20KA2 (cierre). Finales de carrera: 8KA1 y 8KA2.
- La palanca de la compuerta NO debe hacer contacto con la pared del frontal.

SISTEMA DE DESCARGA:
- Compuerta con actuador eléctrico. La compuerta debe tener contacto uniforme con el conducto.
- Avería en actuador: desconectar máquina, abrir caja de registros del anclaje superior, retirar tornillo del brazo inferior y la biela del pantógrafo, soltar 4 tornillos de la base.
- Relés descarga: 20KA3 (apertura) y 20KA4 (cierre). Finales de carrera: 8KA3 y 8KA4.
- Limpiar el conducto de descarga periódicamente.

AGITADOR (Accionamiento):
- Cadena del agitador: engrasar manualmente con brocha al menos 1 vez/mes.
- Tensado de cadena: si el desplazamiento supera 30mm al presionar el ramal inferior, hay que tensar.
  Pasos: aflojar 8 tornillos de bancada, girar tuercas inferiores en sentido horario, hasta flecha máx 30mm, contraturcar.
- Piñón motriz desgastado: retirar cubrición (4 tornillos), retirar casquillo, extraer piñón con extractor de garras.
- ¡IMPORTANTE! Siempre DESCONECTAR la máquina antes de engrasar, tensar o sustituir piñones.
- Relés agitador: 1GV2 (térmico protección), 19KA3/19KA4 (giro derecha/izquierda), 5KM3/5KM4 (reseteo).

AGITADOR (Palas):
- Palas cortantes: tienen 2 filos. Si uno está desafilado, dar vuelta la pala. Si ambos están malos, afilar o sustituir.
- Palas impulsoras: si hay doblado excesivo o desgaste, enderezar o sustituir.
- Rodamientos del agitador: engrasar con engrasadores al menos 1 vez/año.

TANQUE:
- Elementos a vigilar: puertas de inspección (bisagras, manetas, sensores), juntas, anillo de rodadura central.
- Detector de posición: 2 luces deben estar encendidas. Distancia sensor-chapa: máximo 5mm.
- Térmico tanque: 1GV1. Relés: 19KA1 (giro derecha), 19KA2 (giro izquierda), 5KM1/5KM2 (reseteo).
- Juntas: revisar periódicamente que estén entre el tanque y los frontales.
- Fugas de lixiviado: sellar con silicona después de apretar tornillos.
- Anillo de rodadura: si hay deformaciones, llamar al servicio técnico de Kollvik.
- Anti-derivas: ruedas en el centro del tanque que evitan deriva axial. Deben girar con la mano con resistencia moderada. Engrasar tornillos de regulación periódicamente.
- Si deriva longitudinal: localizar interruptor disparado (lado izquierdo frente a zona de carga), alejar el interruptor aflojando tornillos hasta que ya no presione el anillo pero siga en contacto.

AIREACIÓN - Sistema de Impulsión:
- Ventilador de impulsión: succiona aire exterior para oxigenar. Arranca cuando temperatura es 1°C inferior a la mínima del programa.
- Tobera de admisión: limpiar rejilla con cepillo o agua a presión (giro bayoneta para extraer).
- Cuello de entrada: limpiar rejilla de salida por el registro con cierre cartola. Máquina debe estar PARADA.
- Codo: limpiar interior si hay costras. Máquina PARADA. Esperar que se enfríe.
- Fallo ventilador impulsión: verificar 2GV2 (protección) y 5KM7 (reseteo) en cuadro de control.

AIREACIÓN - Sistema de Extracción:
- Ventilador de extracción: extrae gases del interior.
- Rejilla de entrada: limpiar con cepillo empujando material hacia tolva. Máquina en modo manual.
- Fallo ventilador extracción: verificar 2GV1 (protección) y 5KM6 (reseteo).

RESISTENCIAS (Calefactor):
- Calientan el aire de entrada. Funcionan SIEMPRE junto con el ventilador de impulsión.
- Si la zona de la tubería no se calienta en 5-10 min: la resistencia no funciona O el ventilador no arrancó.
- Termostatos en caja de bornas estanca: uno naranja (regulador de temperatura) y uno de 2 posiciones (armado=botón hacia adentro / disparado=botón hacia afuera). Verificar que esté en posición armada.
- Fallo resistencias: verificar 2GV3 (protección) y 5KM5 (reseteo).

TRANSMISIÓN - Cadena principal:
- Engrasar cadena cada 2 meses con brocha en modo manual.
- Tensado óptimo: cadena no se desplace más de 20mm.
- Grupo tope: varilla roscada debe estar perpendicular y en contacto con la bancada. Revisar 1 vez/mes.
- Si bancada sube: varilla tope no está en contacto, roscadar hasta hacer contacto.
- Si bancada baja: cadena alargada por uso, regular interruptor.
- Rodamientos de piñón motriz: engrasar cada 2000 horas de trabajo.

TRANSMISIÓN - Ruedas viradoras:
- Soportan el tanque. Engrasar con engrasadores al menos 1 vez/año.
- Ruedas deben estar centradas en su soporte. Si se desplazaron, llamar a Kollvik.
- Ruido en ruedas: posible rodamiento dañado, sustituir soporte.

SISTEMA DE TEMPERATURA - Sondas PT100:
- 2 sondas PT100 (entrada y salida): extraer tubo y limpiar con trapo húmedo.
- Las sondas suelen registrar temperatura menor que la real del compost.
- Verificar periódicamente que estén en contacto con el compost, sin material adherido.

SISTEMA DE TEMPERATURA - Termómetro infrarrojo:
- 2 termómetros infrarrojos en zona central del tanque.
- Miden a través de un conducto con disco de cobre en el fondo.
- Mantenimiento: limpiar cabezal óptico, verificar orientación y distancia al conducto.
- Limpieza del disco de cobre: girar tanque hasta posicionar el conducto, desmontar, limpiar o sustituir.
- Si se sustituye disco: pintar de color NEGRO una cara y orientarla hacia el sensor infrarrojo.

LIMPIEZA EXTERIOR:
- Paño o esponja húmeda. NO usar manguera a presión cerca de puertas (hay elementos electrónicos).
- Cuadro de control: SIEMPRE paño húmedo, NUNCA manguera.
- Cierres de seguridad: mantener limpios de residuo.
- DESCONECTAR la máquina antes de limpiar.

LIMPIEZA INTERIOR (tanque):
- Extraer tubos emisores de infrarrojo, realizar maniobra de inspección, limpiar con manguera a presión desde ventanas de inspección.
- Bandejas de lixiviado: verificar que no estén colmatadas 1 vez/mes.

=== PROGRAMAS DE CONTROL DEL BIOCOMP ===

PARÁMETROS CLAVE A CONTROLAR:
- Temperatura: rango óptimo 45-65°C (fase termófila). Mayor temp = mayor degradación.
- Humedad: rango óptimo 40-60%. <40% = seco, >60% = húmedo.
- Oxigenación: ventilación controla el oxígeno y la humedad.

PANTALLA SINÓPTICO - Variables:
- TT: Tiempo total de ciclo del elemento (minutos).
- Ton: Tiempo de funcionamiento del elemento dentro del ciclo (minutos).
- TRE: Tiempo real transcurrido en el ciclo actual (cronómetro). Tiempo restante = TT - TRE.
- Días de Etapa: duración en días de la etapa programada.
- Días de Compostado: días de la fase de compostaje dentro de la etapa.
- Número de Etapa: etapas en ejecución o programadas.
- Acond. Aire: ON/OFF de las resistencias.

SONDAS EN SINÓPTICO:
- PT100 IN: temperatura entrada (°C)
- PT100 OUT: temperatura salida (°C)
- IR IZDA: infrarrojo izquierdo (°C)
- IR DRCHA: infrarrojo derecho (°C)

CONDICIONES INICIALES (para arrancar la máquina):
- Selector en modo automático ✓
- Botón de puesta en tensión pulsado ✓
- Compuerta de carga cerrada ✓
- Compuerta de descarga cerrada ✓
- Tapas izquierda y derecha colocadas ✓
- Sin alarmas activas ✓
- Datos de proceso válidos ✓

RESET DE ALARMAS:
- Solo resetear DESPUÉS de resolver la causa del problema.
- Si se resetea sin resolver la causa, la alarma vuelve a dispararse.
- Avisos de mantenimiento: aparecen cada mes o dos meses. Confirmar la tarea realizada y luego resetear.

PARÁMETROS NORMALES DE FUNCIONAMIENTO:
- Ciclo tanque: 720 min | Tanque ON: 15 min
- Ciclo agitador: 720 min | Agitador ON: 15 min
- Ciclo ventilador extractor: 60 min | Extractor ON: 20 min
- Ciclo ventilador impulsión: 60 min | Impulsión ON: 20 min
- Velocidad ventiladores: RÁPIDA
- Acond. Aire: ON

CONDICIONES DE HUMEDAD EXCESIVA:
Causa: residuos muy húmedos o condensación excesiva.
Soluciones:
1. Agregar más viruta (estructurante) para absorber humedad y esponjar la mezcla.
2. Modificar programa: aumentar ventilación a 30-45 min, ciclos de volteo cada 4-6h.
- Ciclo tanque: 360 min (4-8h) | Tanque ON: 20-30 min
- Ciclo agitador: 360 min | Agitador ON: 25-30 min
- Ventiladores ON: 30-45 min
Si el compost forma bolas (efecto "bola de nieve"): acortar ciclos a 240 min, ventilación ON 40 min.
Riesgo: ciclos <240 min pueden apelmazar demasiado los residuos.

CONDICIONES DE SEQUEDAD:
Causa: alta evaporación por temperaturas elevadas o ventilación excesiva.
Indicadores: compost color marrón claro, grano fino como arena o polvo. Al apretar en la mano no se une.
Zona más seca: siempre la zona de descarga (más cerca del aire caliente). Regar más esa zona.
Soluciones:
1. Aportar agua hasta humedad 40-60% (preferible quedarse corto).
2. Bajar ventilación a 15-20 min si estaba alta.
Indicador de humedad óptima: al apretar compost en la mano, se une pero no queda adherido. Si se moldea como arcilla, está al 60% (límite superior).

MODO MANUAL:
- Pasar selector del frontal del cuadro eléctrico de AUTO a MANUAL.
- Pantalla Manual 1: tanque (girar izda/dcha/parar), agitador (girar izda/dcha/parar), ventiladores (marcha/paro/velocidad).
- Para cambiar sentido de giro: esperar 10 segundos entre el PARO y la nueva dirección.
- Tanque y agitador NUNCA pueden girar en sentidos contrarios simultáneamente.
- Pantalla Manual 2: compuertas de carga/descarga (abrir/cerrar), puertas de inspección, resistencias+ventilador impulsión.

MANIOBRA DE INSPECCIÓN:
1. Sinóptico → INSPECCIÓN → usuario H / contraseña I → candado → INI.
2. Cerrojos con luz verde (cerrados). Al pulsar INI, luz verde se apaga → abrir puertas.
3. Al abrir puertas: luz ámbar encendida (desenclavado).
4. Para finalizar: cerrar puertas, enclavar cerrojos (luz ámbar apaga), pulsar FIN → luz verde vuelve.
- Detectores de posición: sensibles a distancia, máximo 8mm de separación a la chapa metálica.

MANIOBRA DE CARGA (automático):
Sinóptico → CARGA → usuario H / contraseña I → candado → INI (carga) → FIN (termina, cierra compuerta, giro de distribución, queda en posición de inspección).

MANIOBRA DE DESCARGA (automático):
Solo disponible si tiempo de descarga NO es cero.
Sinóptico → DESCARGA → usuario H / contraseña I → candado → INI → FIN (cierra, giro de distribución, posición de inspección).
`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, history } = await req.json();
    if (!message || typeof message !== 'string' || message.length > 1000) {
      return Response.json({ error: 'Mensaje inválido' }, { status: 400 });
    }

    const messages = [
      {
        role: 'system',
        content: `Sos un asistente técnico experto en el compostador BioComp 1545 de Kollvik. 
Respondés en español argentino, de forma clara y concisa.
Cuando describís pasos, usá una lista numerada.
Si el problema requiere llamar al servicio técnico de Kollvik, decílo explícitamente.
Basate ÚNICAMENTE en el siguiente conocimiento técnico del manual:

${MANUAL_CONTEXT}

Si la pregunta no está relacionada con el BioComp 1545, avisá amablemente que solo podés ayudar con ese equipo.`
      },
      ...(Array.isArray(history) ? history.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content).slice(0, 500)
      })) : []),
      { role: 'user', content: message }
    ];

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: messages.map(m => `${m.role === 'system' ? '[SISTEMA]' : m.role === 'user' ? '[OPERARIO]' : '[ASISTENTE]'}: ${m.content}`).join('\n\n'),
    });

    return Response.json({ reply: response });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}