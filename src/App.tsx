/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  Download,
  Database,
  Wind,
  Activity,
  BarChart3,
  FileText,
  ChevronRight,
  Info,
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Mes, Phase, Semana } from './types';
import { api } from './services/api';
import { ABMManager } from './components/ABMManager';

const PHASES: Phase[] = [
  { id: 0, name: "Fase 0: Planificación", weeks: [1, 2, 3, 4], color: "bg-slate-500", icon: <FileText size={18} /> },
  { id: 1, name: "Fase 1: Preparación de Datos", weeks: [2, 3, 4, 5], color: "bg-blue-500", icon: <Database size={18} /> },
  { id: 2, name: "Fase 2: Configuración WRF", weeks: [6, 7, 8], color: "bg-emerald-500", icon: <Wind size={18} /> },
  { id: 3, name: "Fase 3: Asimilación de Datos", weeks: [8, 9, 10, 11, 12], color: "bg-indigo-500", icon: <Activity size={18} /> },
  { id: 4, name: "Fase 4: Evaluación", weeks: [12, 13, 14, 15, 16], color: "bg-amber-500", icon: <BarChart3 size={18} /> },
  { id: 5, name: "Fase 5: Integración y Entrega", weeks: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24], color: "bg-purple-500", icon: <CheckCircle2 size={18} /> },
];

export default function App() {
  const [data, setData] = useState<Mes[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionVerified, setConnectionVerified] = useState(false);

  const refreshData = async (isInitial = false) => {
    setLoading(true);
    try {
      const structure = await api.getStructure();
      setData(structure);
      if (!selectedWeekId && structure.length > 0) {
        setSelectedWeekId(structure[0].semanas[0].id);
      }
      if (isInitial && !connectionVerified) {
        alert("✅ Conexión con Supabase establecida con éxito.");
        setConnectionVerified(true);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData(true);
  }, []);

  const weeks = useMemo(() => data.flatMap(m => m.semanas), [data]);

  const updateTask = async (taskId: number, completed: boolean) => {
    await api.update('tareas', taskId, { completada: completed ? 1 : 0 });
    refreshData();
  };

  const updateKPI = async (kpiId: number, value: string) => {
    await api.update('kpis', kpiId, { valor_actual: value });
    refreshData();
  };

  const updateEvidence = async (evId: number, value: string) => {
    await api.update('evidencias_requeridas', evId, { evidence_value: value });
    refreshData();
  };

  const closeWeek = async (weekId: number) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;

    // Validation rules from PRD
    if (weekId > 1) {
      const prevWeek = weeks.find(w => w.id === weekId - 1);
      if (prevWeek && !prevWeek.closed) {
        alert(`BLOQUEO: Debe cerrar la Semana ${weekId - 1} primero.`);
        return;
      }
    }

    const allTasksDone = week.actividades.every(a => a.tareas.every(t => t.completada));
    if (!allTasksDone) {
      alert("ERROR: Todas las tareas deben estar completadas.");
      return;
    }

    await api.closeWeek(weekId);
    refreshData();
  };

  const exportToExcel = () => {
    const exportData = weeks.flatMap(w => w.actividades.flatMap(a => a.tareas.map(t => ({
      Semana: w.id,
      Fase: PHASES.find(p => p.id === w.id)?.name || 'N/A',
      Actividad: a.descripcion,
      Tarea: t.descripcion,
      Estado: t.completada ? "Completado" : "Pendiente",
      Cerrada: w.closed ? "SÍ" : "NO"
    }))));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriz_Control_SCTT_v3");
    XLSX.writeFile(wb, "SCTT_v3_Matriz_Control.xlsx");
  };

  const phaseProgress = useMemo(() => {
    return PHASES.map(phase => {
      const phaseWeeks = weeks.filter(w => phase.weeks.includes(w.id));
      const totalTasks = phaseWeeks.reduce((acc, w) => acc + w.actividades.reduce((acc2, a) => acc2 + a.tareas.length, 0), 0);
      const doneTasks = phaseWeeks.reduce((acc, w) => acc + w.actividades.reduce((acc2, a) => acc2 + a.tareas.filter(t => t.completada).length, 0), 0);
      return {
        ...phase,
        progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        isDone: phaseWeeks.length > 0 && phaseWeeks.every(w => w.closed)
      };
    });
  }, [weeks]);

  const globalProgress = useMemo(() => {
    const total = weeks.reduce((acc, w) => acc + w.actividades.reduce((acc2, a) => acc2 + a.tareas.length, 0), 0);
    const done = weeks.reduce((acc, w) => acc + w.actividades.reduce((acc2, a) => acc2 + a.tareas.filter(t => t.completada).length, 0), 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [weeks]);

  if (loading && data.length === 0) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 font-black text-blue-600 animate-pulse">CARGANDO SCTT v3.0...</div>;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3 text-blue-600 mb-1">
            <Activity size={28} strokeWidth={2.5} />
            <h1 className="text-2xl font-black tracking-tighter">SCTT v3.0</h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control Técnico de Tesis</p>
        </div>
        
        <nav className="flex-1 p-6 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => setActiveTab('tracker')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'tracker' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={20} /> Cronograma</button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'reports' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><FileSpreadsheet size={20} /> Reportes</button>
          <button onClick={() => setActiveTab('abm')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'abm' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Settings size={20} /> Gestor Estructura</button>
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Avance Global</span>
              <span className="text-xs font-black text-blue-600">{globalProgress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${globalProgress}%` }} />
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto p-12 space-y-12">
            <header className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight text-slate-900">Panel de Control Técnico</h2>
              <p className="text-slate-500 font-medium">Monitoreo de fases y cumplimiento de KPIs científicos</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {phaseProgress.map(phase => (
                <div key={phase.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl ${phase.color} text-white shadow-lg shadow-current/20`}>{phase.icon}</div>
                    {phase.isDone ? <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Completada</span> : <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">En Proceso</span>}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{phase.name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Progreso Técnico</span><span className="text-sm font-black text-slate-700">{phase.progress}%</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${phase.color} transition-all duration-1000`} style={{ width: `${phase.progress}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="max-w-6xl mx-auto p-12 flex flex-col lg:flex-row gap-10">
            <div className="w-full lg:w-80 space-y-6">
              <h3 className="text-xl font-black text-slate-900">Cronograma</h3>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {weeks.map(w => (
                  <button key={w.id} onClick={() => setSelectedWeekId(w.id)} className={`w-full group text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${selectedWeekId === w.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <span className={`text-sm font-bold ${selectedWeekId === w.id ? 'text-blue-700' : 'text-slate-700'}`}>Semana {w.id}</span>
                    <div className="flex items-center gap-2">{w.closed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <ChevronRight size={16} className="text-slate-300" />}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-8">
              {(() => {
                const week = weeks.find(w => w.id === selectedWeekId);
                if (!week) return null;
                const isLocked = selectedWeekId! > 1 && !weeks.find(prev => prev.id === selectedWeekId! - 1)?.closed;
                
                return (
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm min-h-[600px]">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-3xl font-black text-slate-900">{week.titulo}</h3>
                      {!week.closed && !isLocked && <button onClick={() => closeWeek(week.id)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2"><Lock size={18} /> Cerrar Semana</button>}
                    </div>

                    {isLocked && !week.closed ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200"><Lock size={32} className="text-slate-300 mb-4" /><h4 className="text-xl font-bold text-slate-800 mb-2">Semana Bloqueada</h4></div>
                    ) : (
                      <div className="space-y-8">
                        {week.actividades.map(act => (
                          <div key={act.id} className="space-y-4">
                            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                              <div className="w-1.5 h-6 bg-blue-500 rounded-full" /> {act.descripcion}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                              {act.tareas.map(task => (
                                <div key={task.id} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                  <div className="flex items-center gap-4 mb-4">
                                    <input type="checkbox" checked={task.completada} disabled={week.closed} onChange={e => updateTask(task.id, e.target.checked)} className="w-6 h-6 rounded-lg border-2 border-slate-300 text-blue-600" />
                                    <span className={`font-bold ${task.completada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.descripcion}</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-10">
                                    {task.kpis.map(kpi => (
                                      <div key={kpi.id} className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">KPI: {kpi.nombre_metrica} (Meta: {kpi.meta_objetivo})</label>
                                        <input type="text" value={kpi.valor_actual || ''} disabled={week.closed} onChange={e => updateKPI(kpi.id, e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                                      </div>
                                    ))}
                                    {task.evidencias.map(ev => (
                                      <div key={ev.id} className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Evidencia: {ev.nombre_descriptivo}</label>
                                        <input type="text" value={ev.evidence_value || ''} disabled={week.closed} onChange={e => updateEvidence(ev.id, e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
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
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="max-w-6xl mx-auto p-12 space-y-10">
            <header className="flex justify-between items-center">
              <h2 className="text-4xl font-black tracking-tight text-slate-900">Auditoría Técnica</h2>
              <button onClick={exportToExcel} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl shadow-emerald-100"><Download size={20} /> Exportar Matriz</button>
            </header>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Semana</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{weeks.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 text-sm font-black text-slate-900">S{w.id}</td>
                    <td className="p-6 text-sm font-medium text-slate-700">{w.actividades[0]?.descripcion || '---'}</td>
                    <td className="p-6">{w.closed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Lock size={14} className="text-slate-300" />}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'abm' && <ABMManager data={data} onRefresh={refreshData} />}
      </main>
    </div>
  );
}
