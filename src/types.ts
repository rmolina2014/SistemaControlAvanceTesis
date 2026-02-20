/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface Task {
  id: number;
  actividad_id: number;
  descripcion: string;
  estimacion_horas: number | null;
  completada: boolean;
  orden_actividad: number;
  kpis: KPI[];
  evidencias: EvidenciaRequerida[];
}

export interface KPI {
  id: number;
  tarea_id: number;
  nombre_metrica: string;
  tipo_dato: 'numerico' | 'booleano' | 'porcentaje' | 'texto';
  meta_objetivo: string;
  unidad: string | null;
  valor_actual: string | null;
  es_obligatorio: boolean;
  valor_minimo: number | null;
  valor_maximo: number | null;
}

export interface EvidenciaRequerida {
  id: number;
  tarea_id: number;
  nombre_descriptivo: string;
  tipo_archivo_esperado: string | null;
  descripcion_requerimientos: string | null;
  es_obligatoria: boolean;
  evidence_value: string | null;
}

export interface Actividad {
  id: number;
  semana_id: number;
  descripcion: string;
  tipo: 'Investigacion' | 'Codigo' | 'Redaccion' | 'Configuracion' | 'Evaluacion';
  criterio_cierre: string | null;
  es_critica: boolean;
  orden_semanal: number;
  tareas: Task[];
}

export interface Semana {
  id: number;
  mes_id: number;
  numero_semana: number;
  titulo: string;
  closed: boolean;
  actividades: Actividad[];
}

export interface Mes {
  id: number;
  numero_mes: number;
  nombre: string;
  descripcion: string | null;
  semanas: Semana[];
}

export interface Phase {
  id: number;
  name: string;
  weeks: number[];
  color: string;
  icon: React.ReactNode;
}
