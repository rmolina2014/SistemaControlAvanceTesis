/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Mes, Semana, Actividad, Task, KPI, EvidenciaRequerida } from '../types';
import { api } from '../services/api';

interface ABMManagerProps {
  data: Mes[];
  onRefresh: () => void;
}

export const ABMManager: React.FC<ABMManagerProps> = ({ data, onRefresh }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ type: string; id?: number; parentId?: number; data?: any } | null>(null);

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await api.update(editing.type, editing.id, editing.data);
      } else {
        await api.create(editing.type, { ...editing.data, [editing.type === 'actividades' ? 'semana_id' : editing.type === 'tareas' ? 'actividad_id' : 'tarea_id']: editing.parentId });
      }
      setEditing(null);
      onRefresh();
    } catch (error) {
      alert("Error al guardar");
    }
  };

  const handleDelete = async (type: string, id: number) => {
    const razon = prompt("Razón de la eliminación (obligatorio):");
    if (!razon) return;
    try {
      const res = await api.delete(type, id, razon);
      if (res.error) alert(res.error);
      else onRefresh();
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Gestor de Estructura</h2>
          <p className="text-slate-500 font-medium">ABM de cronograma, tareas y KPIs</p>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        {data.map(mes => (
          <div key={mes.id} className="mb-4">
            <button 
              onClick={() => toggle(`mes-${mes.id}`)}
              className="flex items-center gap-2 text-lg font-bold text-slate-800 hover:text-blue-600 transition-colors"
            >
              {expanded[`mes-${mes.id}`] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              Mes {mes.numero_mes}: {mes.nombre}
            </button>
            
            {expanded[`mes-${mes.id}`] && (
              <div className="ml-6 mt-2 space-y-4 border-l-2 border-slate-100 pl-4">
                {mes.semanas.map(semana => (
                  <div key={semana.id}>
                    <div className="flex items-center justify-between group">
                      <button 
                        onClick={() => toggle(`sem-${semana.id}`)}
                        className="flex items-center gap-2 font-bold text-slate-700 hover:text-blue-500"
                      >
                        {expanded[`sem-${semana.id}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        Semana {semana.numero_semana}: {semana.titulo}
                      </button>
                      {!semana.closed && (
                        <button 
                          onClick={() => setEditing({ type: 'actividades', parentId: semana.id, data: { descripcion: '', tipo: 'Investigacion', es_critica: 0 } })}
                          className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-50 rounded transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>

                    {expanded[`sem-${semana.id}`] && (
                      <div className="ml-6 mt-2 space-y-3 border-l-2 border-slate-50 pl-4">
                        {semana.actividades.map(act => (
                          <div key={act.id} className="group">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-600">
                                {act.descripcion} {act.es_critica ? <span className="text-[10px] text-red-500 font-black ml-2">CRÍTICA</span> : ''}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <button onClick={() => setEditing({ type: 'tareas', parentId: act.id, data: { descripcion: '' } })} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Plus size={14} /></button>
                                <button onClick={() => setEditing({ type: 'actividades', id: act.id, data: act })} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete('actividades', act.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                              </div>
                            </div>
                            
                            <div className="ml-6 mt-1 space-y-2">
                              {act.tareas.map(tarea => (
                                <div key={tarea.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">{tarea.descripcion}</span>
                                    <div className="flex gap-1">
                                      <button onClick={() => setEditing({ type: 'kpis', parentId: tarea.id, data: { nombre_metrica: '', tipo_dato: 'numerico', meta_objetivo: '', es_obligatorio: 1 } })} className="text-[10px] font-bold text-blue-500 hover:underline">Add KPI</button>
                                      <button onClick={() => setEditing({ type: 'evidencias_requeridas', parentId: tarea.id, data: { nombre_descriptivo: '', es_obligatoria: 1 } })} className="text-[10px] font-bold text-indigo-500 hover:underline">Add Evid</button>
                                      <button onClick={() => handleDelete('tareas', tarea.id)} className="text-red-400"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-2 space-y-1">
                                    {tarea.kpis.map(kpi => (
                                      <div key={kpi.id} className="flex items-center justify-between text-[10px] text-slate-500 bg-white p-1 px-2 rounded border border-slate-100">
                                        <span>KPI: {kpi.nombre_metrica} ({kpi.meta_objetivo})</span>
                                        <button onClick={() => handleDelete('kpis', kpi.id)} className="text-red-300"><Trash2 size={10} /></button>
                                      </div>
                                    ))}
                                    {tarea.evidencias.map(ev => (
                                      <div key={ev.id} className="flex items-center justify-between text-[10px] text-slate-500 bg-white p-1 px-2 rounded border border-slate-100">
                                        <span>Evid: {ev.nombre_descriptivo}</span>
                                        <button onClick={() => handleDelete('evidencias_requeridas', ev.id)} className="text-red-300"><Trash2 size={10} /></button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL EDITING */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-6 text-slate-900">
              {editing.id ? 'Editar' : 'Crear'} {editing.type.slice(0, -1)}
            </h3>
            
            <div className="space-y-4">
              {editing.type === 'actividades' && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                    <input 
                      type="text" 
                      value={editing.data.descripcion} 
                      onChange={e => setEditing({ ...editing, data: { ...editing.data, descripcion: e.target.value } })}
                      className="w-full p-3 border rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                    <select 
                      value={editing.data.tipo} 
                      onChange={e => setEditing({ ...editing, data: { ...editing.data, tipo: e.target.value } })}
                      className="w-full p-3 border rounded-xl mt-1"
                    >
                      {['Investigacion', 'Codigo', 'Redaccion', 'Configuracion', 'Evaluacion'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={!!editing.data.es_critica} 
                      onChange={e => setEditing({ ...editing, data: { ...editing.data, es_critica: e.target.checked ? 1 : 0 } })}
                    />
                    <label className="text-sm font-bold text-slate-700">Es Crítica</label>
                  </div>
                </>
              )}

              {editing.type === 'tareas' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                  <input 
                    type="text" 
                    value={editing.data.descripcion} 
                    onChange={e => setEditing({ ...editing, data: { ...editing.data, descripcion: e.target.value } })}
                    className="w-full p-3 border rounded-xl mt-1"
                  />
                </div>
              )}

              {editing.type === 'kpis' && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Métrica</label>
                    <input 
                      type="text" 
                      value={editing.data.nombre_metrica} 
                      onChange={e => setEditing({ ...editing, data: { ...editing.data, nombre_metrica: e.target.value } })}
                      className="w-full p-3 border rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Objetivo</label>
                    <input 
                      type="text" 
                      value={editing.data.meta_objetivo} 
                      onChange={e => setEditing({ ...editing, data: { ...editing.data, meta_objetivo: e.target.value } })}
                      className="w-full p-3 border rounded-xl mt-1"
                    />
                  </div>
                </>
              )}

              {editing.type === 'evidencias_requeridas' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Descriptivo</label>
                  <input 
                    type="text" 
                    value={editing.data.nombre_descriptivo} 
                    onChange={e => setEditing({ ...editing, data: { ...editing.data, nombre_descriptivo: e.target.value } })}
                    className="w-full p-3 border rounded-xl mt-1"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditing(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
