/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mes } from '../types';

export const api = {
  async getStructure(): Promise<Mes[]> {
    const response = await fetch('/api/structure');
    const raw = await response.json();
    
    // Transform flat join result into nested hierarchy
    const meses: Mes[] = [];
    
    raw.forEach((row: any) => {
      let mes = meses.find(m => m.id === row.mes_id);
      if (!mes) {
        mes = { id: row.mes_id, numero_mes: row.numero_mes, nombre: row.mes_nombre, descripcion: null, semanas: [] };
        meses.push(mes);
      }
      
      let semana = mes.semanas.find(s => s.id === row.semana_id);
      if (!semana) {
        semana = { id: row.semana_id, mes_id: row.mes_id, numero_semana: row.numero_semana, titulo: row.semana_titulo, closed: !!row.semana_closed, actividades: [] };
        mes.semanas.push(semana);
      }
      
      if (row.actividad_id) {
        let actividad = semana.actividades.find(a => a.id === row.actividad_id);
        if (!actividad) {
          actividad = { 
            id: row.actividad_id, 
            semana_id: row.semana_id, 
            descripcion: row.actividad_desc, 
            tipo: row.actividad_tipo, 
            es_critica: !!row.es_critica, 
            criterio_cierre: null, 
            orden_semanal: 0, 
            tareas: [] 
          };
          semana.actividades.push(actividad);
        }
        
        if (row.tarea_id) {
          let tarea = actividad.tareas.find(t => t.id === row.tarea_id);
          if (!tarea) {
            tarea = { 
              id: row.tarea_id, 
              actividad_id: row.actividad_id, 
              descripcion: row.tarea_desc, 
              estimacion_horas: null, 
              completada: !!row.tarea_completada, 
              orden_actividad: 0, 
              kpis: [], 
              evidencias: [] 
            };
            actividad.tareas.push(tarea);
          }
          
          if (row.kpi_id) {
            if (!tarea.kpis.find(k => k.id === row.kpi_id)) {
              tarea.kpis.push({
                id: row.kpi_id,
                tarea_id: row.tarea_id,
                nombre_metrica: row.nombre_metrica,
                tipo_dato: row.tipo_dato,
                meta_objetivo: row.meta_objetivo,
                unidad: null,
                valor_actual: row.valor_actual,
                es_obligatorio: !!row.es_obligatorio,
                valor_minimo: null,
                valor_maximo: null
              });
            }
          }
          
          if (row.evidence_req_id) {
            if (!tarea.evidencias.find(e => e.id === row.evidence_req_id)) {
              tarea.evidencias.push({
                id: row.evidence_req_id,
                tarea_id: row.tarea_id,
                nombre_descriptivo: row.evidence_nombre,
                tipo_archivo_esperado: null,
                descripcion_requerimientos: null,
                es_obligatoria: !!row.es_obligatoria,
                evidence_value: row.evidence_value
              });
            }
          }
        }
      }
    });
    
    return meses;
  },

  async create(entity: string, data: any) {
    const response = await fetch(`/api/abm/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async update(entity: string, id: number, data: any) {
    const response = await fetch(`/api/abm/${entity}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  async delete(entity: string, id: number, razon: string) {
    const response = await fetch(`/api/abm/${entity}/${id}?razon=${encodeURIComponent(razon)}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  async closeWeek(id: number) {
    const response = await fetch(`/api/weeks/${id}/close`, { method: 'POST' });
    return response.json();
  }
};
