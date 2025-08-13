// utils/dataAnalyzer.js
import { format } from 'date-fns';
import { maxBy, minBy } from 'lodash-es';

function safeFormat(date, formatString, metricName, groupData) {
  try {
    // Intenta formatear la fecha como siempre
    return format(date, formatString);
  } catch (error) {
    // Si falla, ¡hemos encontrado al culpable!
    console.error(`\n--- ¡ERROR DE FORMATO DE FECHA DETECTADO! ---`);
    console.error(`Métrica problemática: ${metricName}`);
    console.error(`Valor que causó el error:`, date);
    console.error(`Tipo del valor: ${typeof date}`);
    console.error(`Estado completo del grupo en el momento del error:`, groupData);
    console.error(`--------------------------------------------\n`);
    // Retorna un valor visible en el CSV para saber dónde falló
    return 'FECHA_INVALIDA';
  }
}

const round = (num) => (typeof num === 'number' ? parseFloat(num.toFixed(2)) : null);

function createIncrementalAnalyzer(groupByFn) {
  const state = new Map();
  
  return {
    processRecord(record) {
      const groupKey = groupByFn(record.date);
      if (!groupKey) return;
      
      let groupState = state.get(groupKey);
      
      if (!groupState) {
        // Primer registro para este grupo: Solo inicializamos el estado.
        state.set(groupKey, {
          // Contadores y sumas
          count: 1,
          sum_tmed: record.tmed ?? 0,
          sum_tmax: record.tmax ?? 0,
          sum_tmin: record.tmin ?? 0,
          sum_prec: record.prec ?? 0,
          sum_velmedia: record.velmedia ?? 0,
          // Guardamos el objeto completo para los extremos.
          max_tmed: { value: record.tmed, date: record.date },
          max_tmax: { value: record.tmax, date: record.date },
          max_tmin: { value: record.tmin, date: record.date },
          max_prec: { value: record.prec, date: record.date },
          max_racha: { value: record.racha, date: record.date },
          max_velmedia: { value: record.velmedia, date: record.date },
          min_tmed: { value: record.tmed, date: record.date },
          min_tmax: { value: record.tmax, date: record.date },
          min_tmin: { value: record.tmin, date: record.date },
          min_prec: { value: record.prec, date: record.date },
        });
      } else {
        // Registros siguientes: Solo actualizamos el estado existente.
        groupState.count++;
        if (record.tmed !== null) groupState.sum_tmed += record.tmed;
        if (record.tmax !== null) groupState.sum_tmax += record.tmax;
        if (record.tmin !== null) groupState.sum_tmin += record.tmin;
        if (record.prec !== null) groupState.sum_prec += record.prec;
        if (record.velmedia !== null) groupState.sum_velmedia += record.velmedia;
        
        const candidate = {
          tmed: { value: record.tmed, date: record.date },
          tmax: { value: record.tmax, date: record.date },
          tmin: { value: record.tmin, date: record.date },
          prec: { value: record.prec, date: record.date },
          racha: { value: record.racha, date: record.date },
          velmedia: { value: record.velmedia, date: record.date },
        };
        
        const filterNulls = (arr) => arr.filter(item => item && item.value !== null);
        
        // La actualización con lodash es segura aquí porque groupState ya existe.
        groupState.max_tmed = maxBy(filterNulls([groupState.max_tmed, candidate.tmed]), 'value') || groupState.max_tmed;
        groupState.max_tmax = maxBy(filterNulls([groupState.max_tmax, candidate.tmax]), 'value') || groupState.max_tmax;
        groupState.max_tmin = maxBy(filterNulls([groupState.max_tmin, candidate.tmin]), 'value') || groupState.max_tmin;
        groupState.max_prec = maxBy(filterNulls([groupState.max_prec, candidate.prec]), 'value') || groupState.max_prec;
        groupState.max_racha = maxBy(filterNulls([groupState.max_racha, candidate.racha]), 'value') || groupState.max_racha;
        groupState.max_velmedia = maxBy(filterNulls([groupState.max_velmedia, candidate.velmedia]), 'value') || groupState.max_velmedia;
        
        groupState.min_tmed = minBy(filterNulls([groupState.min_tmed, candidate.tmed]), 'value') || groupState.min_tmed;
        groupState.min_tmax = minBy(filterNulls([groupState.min_tmax, candidate.tmax]), 'value') || groupState.min_tmax;
        groupState.min_tmin = minBy(filterNulls([groupState.min_tmin, candidate.tmin]), 'value') || groupState.min_tmin;
        groupState.min_prec = minBy(filterNulls([groupState.min_prec, candidate.prec]), 'value') || groupState.min_prec;
      }
    },
    
    getResults() {
      const results = [];
      for (const [groupKey, groupState] of state.entries()) {
        // Esta sección ya era robusta gracias al optional chaining (?.), por lo que no necesita cambios.
        results.push({
          fecha: groupKey,
          avg_tmed: round(groupState.sum_tmed / groupState.count),
          avg_tmax: round(groupState.sum_tmax / groupState.count),
          avg_tmin: round(groupState.sum_tmin / groupState.count),
          avg_prec: round(groupState.sum_prec / groupState.count),
          avg_velmedia: round(groupState.sum_velmedia / groupState.count),
          
          max_tmed: groupState.max_tmed?.value ?? null, d_max_tmed: groupState.max_tmed?.date ? safeFormat(groupState.max_tmed.date, 'dd/MM/yyyy', 'max_tmed', groupState) : null,
      max_tmax: groupState.max_tmax?.value ?? null, d_max_tmax: groupState.max_tmax?.date ? safeFormat(groupState.max_tmax.date, 'dd/MM/yyyy', 'max_tmax', groupState) : null,
      max_tmin: groupState.max_tmin?.value ?? null, d_max_tmin: groupState.max_tmin?.date ? safeFormat(groupState.max_tmin.date, 'dd/MM/yyyy', 'max_tmin', groupState) : null,
      max_prec: groupState.max_prec?.value ?? null, d_max_prec: groupState.max_prec?.date ? safeFormat(groupState.max_prec.date, 'dd/MM/yyyy', 'max_prec', groupState) : null,
      max_racha: groupState.max_racha?.value ?? null, d_max_racha: groupState.max_racha?.date ? safeFormat(groupState.max_racha.date, 'dd/MM/yyyy', 'max_racha', groupState) : null,
      max_velmedia: groupState.max_velmedia?.value ?? null, d_max_velmedia: groupState.max_velmedia?.date ? safeFormat(groupState.max_velmedia.date, 'dd/MM/yyyy', 'max_velmedia', groupState) : null,
      
      min_tmed: groupState.min_tmed?.value ?? null, d_min_tmed: groupState.min_tmed?.date ? safeFormat(groupState.min_tmed.date, 'dd/MM/yyyy', 'min_tmed', groupState) : null,
      min_tmax: groupState.min_tmax?.value ?? null, d_min_tmax: groupState.min_tmax?.date ? safeFormat(groupState.min_tmax.date, 'dd/MM/yyyy', 'min_tmax', groupState) : null,
      min_tmin: groupState.min_tmin?.value ?? null, d_min_tmin: groupState.min_tmin?.date ? safeFormat(groupState.min_tmin.date, 'dd/MM/yyyy', 'min_tmin', groupState) : null,
      min_prec: groupState.min_prec?.value ?? null, d_min_prec: groupState.min_prec?.date ? safeFormat(groupState.min_prec.date, 'dd/MM/yyyy', 'min_prec', groupState) : null,
        });
      }
      return results.sort((a, b) => a.fecha.localeCompare(b.fecha));
    },
  };
}

export const crearAnalizadorMensual = () => createIncrementalAnalyzer((d) => format(d, 'yyyy-MM'));
export const crearAnalizadorAnual = () => createIncrementalAnalyzer((d) => format(d, 'yyyy'));