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
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- CONSTANTES Y TIPOS ---

interface Task {
  id: string;
  desc: string;
  completed: boolean;
  critical: boolean;
  kpiName: string;
  kpiValue: string;
  kpiMeta: string;
  evidence: string;
  evidenceType: 'link' | 'file' | 'hash' | 'text';
}

interface Week {
  id: number;
  phaseId: number;
  title: string;
  closed: boolean;
  tasks: Task[];
}

interface Phase {
  id: number;
  name: string;
  weeks: number[];
  color: string;
  icon: React.ReactNode;
}

const PHASES: Phase[] = [
  { id: 0, name: "Fase 0: Planificación", weeks: [1, 2, 3, 4], color: "bg-slate-500", icon: <FileText size={18} /> },
  { id: 1, name: "Fase 1: Preparación de Datos", weeks: [2, 3, 4, 5], color: "bg-blue-500", icon: <Database size={18} /> },
  { id: 2, name: "Fase 2: Configuración WRF", weeks: [6, 7, 8], color: "bg-emerald-500", icon: <Wind size={18} /> },
  { id: 3, name: "Fase 3: Asimilación de Datos", weeks: [8, 9, 10, 11, 12], color: "bg-indigo-500", icon: <Activity size={18} /> },
  { id: 4, name: "Fase 4: Evaluación", weeks: [12, 13, 14, 15, 16], color: "bg-amber-500", icon: <BarChart3 size={18} /> },
  { id: 5, name: "Fase 5: Integración y Entrega", weeks: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24], color: "bg-purple-500", icon: <CheckCircle2 size={18} /> },
];

// --- GENERACIÓN DE DATOS INICIALES ---

const generateInitialData = (): Week[] => {
  const weeks: Week[] = [];
  
  for (let i = 1; i <= 24; i++) {
    // Determinar fase principal para la semana (algunas se solapan, elegimos la más relevante)
    let phaseId = 0;
    if (i >= 21) phaseId = 5;
    else if (i >= 17) phaseId = 5;
    else if (i >= 13) phaseId = 4;
    else if (i >= 9) phaseId = 3;
    else if (i >= 6) phaseId = 2;
    else if (i >= 2) phaseId = 1;
    else phaseId = 0;

    const tasks: Task[] = [];
    
    // Tareas específicas por semana según PRD
    if (i === 1) {
      tasks.push({ id: `${i}-1`, desc: "Sistematizar referencias bibliográficas", completed: false, critical: true, kpiName: "Referencias", kpiValue: "", kpiMeta: ">= 20", evidence: "", evidenceType: 'text' });
      tasks.push({ id: `${i}-2`, desc: "Matriz 3D-Var vs Nudging", completed: false, critical: true, kpiName: "Criterios", kpiValue: "", kpiMeta: ">= 6", evidence: "", evidenceType: 'link' });
    } else if (i === 3) {
      tasks.push({ id: `${i}-1`, desc: "Conversión a SI (Dataset PGICH)", completed: false, critical: true, kpiName: "Variables SI", kpiValue: "", kpiMeta: "100%", evidence: "", evidenceType: 'file' });
      tasks.push({ id: `${i}-2`, desc: "Detección de valores atípicos (QC)", completed: false, critical: true, kpiName: "Log QC", kpiValue: "", kpiMeta: "Generado", evidence: "", evidenceType: 'file' });
    } else if (i === 5) {
      tasks.push({ id: `${i}-1`, desc: "Congelar Dataset v1.0", completed: false, critical: true, kpiName: "Hash MD5", kpiValue: "", kpiMeta: "Verificado", evidence: "", evidenceType: 'hash' });
    } else if (i === 7) {
      tasks.push({ id: `${i}-1`, desc: "Calcular RMSE Línea Base", completed: false, critical: true, kpiName: "RMSE T2m", kpiValue: "", kpiMeta: "< 2.5°C", evidence: "", evidenceType: 'file' });
    } else if (i === 9) {
      tasks.push({ id: `${i}-1`, desc: "Decisión Nudging vs 3D-Var", completed: false, critical: true, kpiName: "Justificación", kpiValue: "", kpiMeta: "Documentada", evidence: "", evidenceType: 'text' });
    } else if (i === 14) {
      tasks.push({ id: `${i}-1`, desc: "Test estadístico (t-test pareado)", completed: false, critical: true, kpiName: "p-valor", kpiValue: "", kpiMeta: "< 0.05", evidence: "", evidenceType: 'file' });
    } else if (i === 16) {
      tasks.push({ id: `${i}-1`, desc: "Validación Pipeline automatizado", completed: false, critical: true, kpiName: "Checksum", kpiValue: "", kpiMeta: "Válido", evidence: "", evidenceType: 'hash' });
    } else if (i === 22) {
      tasks.push({ id: `${i}-1`, desc: "Borrador Final Tesis", completed: false, critical: true, kpiName: "Estado", kpiValue: "", kpiMeta: "Aprobado", evidence: "", evidenceType: 'link' });
    } else {
      tasks.push({ id: `${i}-1`, desc: `Avance Técnico Semana ${i}`, completed: false, critical: false, kpiName: "Progreso", kpiValue: "", kpiMeta: "Documentado", evidence: "", evidenceType: 'text' });
    }

    weeks.push({
      id: i,
      phaseId,
      title: `Semana ${i}`,
      closed: false,
      tasks
    });
  }
  return weeks;
};

export default function App() {
  const [weeks, setWeeks] = useState<Week[]>(() => {
    const saved = localStorage.getItem('sctt_v2_data');
    return saved ? JSON.parse(saved) : generateInitialData();
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedWeekId, setSelectedWeekId] = useState(1);

  useEffect(() => {
    localStorage.setItem('sctt_v2_data', JSON.stringify(weeks));
  }, [weeks]);

  // --- LÓGICA DE NEGOCIO ---

  const updateTask = (weekId: number, taskId: string, fields: Partial<Task>) => {
    setWeeks(prev => prev.map(w => {
      if (w.id !== weekId) return w;
      return {
        ...w,
        tasks: w.tasks.map(t => t.id === taskId ? { ...t, ...fields } : t)
      };
    }));
  };

  const closeWeek = (weekId: number) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;

    // Regla 6.1: Semana anterior cerrada
    if (weekId > 1) {
      const prevWeek = weeks.find(w => w.id === weekId - 1);
      if (prevWeek && !prevWeek.closed) {
        alert(`BLOQUEO: Debe cerrar la Semana ${weekId - 1} primero.`);
        return;
      }
    }

    // Regla 6.1: Actividades críticas completas
    const pendingCritical = week.tasks.filter(t => t.critical && !t.completed);
    if (pendingCritical.length > 0) {
      alert(`ERROR: Actividades críticas pendientes: ${pendingCritical.map(t => t.desc).join(', ')}`);
      return;
    }

    // Regla 6.1: KPIs obligatorios con valor
    const missingKPIs = week.tasks.filter(t => t.critical && !t.kpiValue);
    if (missingKPIs.length > 0) {
      alert(`ERROR: KPIs obligatorios sin completar: ${missingKPIs.map(t => t.kpiName).join(', ')}`);
      return;
    }

    // Regla 6.1: Evidencias mínimas
    const missingEvidence = week.tasks.filter(t => t.critical && !t.evidence);
    if (missingEvidence.length > 0) {
      alert(`ERROR: Evidencias requeridas faltantes.`);
      return;
    }

    setWeeks(prev => prev.map(w => w.id === weekId ? { ...w, closed: true } : w));
  };

  const exportToExcel = () => {
    const data = weeks.flatMap(w => w.tasks.map(t => ({
      Semana: w.id,
      Fase: PHASES.find(p => p.id === w.phaseId)?.name,
      Actividad: t.desc,
      Estado: t.completed ? "Completado" : "Pendiente",
      KPI: t.kpiName,
      Valor_KPI: t.kpiValue,
      Meta_KPI: t.kpiMeta,
      Evidencia: t.evidence,
      Cerrada: w.closed ? "SÍ" : "NO"
    })));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriz_Control_SCTT_v2");
    XLSX.writeFile(wb, "SCTT_Matriz_Control_Tecnico.xlsx");
  };

  // --- CÁLCULOS ---

  const phaseProgress = useMemo(() => {
    return PHASES.map(phase => {
      const phaseWeeks = weeks.filter(w => phase.weeks.includes(w.id));
      const totalTasks = phaseWeeks.reduce((acc, w) => acc + w.tasks.length, 0);
      const completedTasks = phaseWeeks.reduce((acc, w) => acc + w.tasks.filter(t => t.completed).length, 0);
      return {
        ...phase,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        isDone: phaseWeeks.every(w => w.closed)
      };
    });
  }, [weeks]);

  const globalProgress = useMemo(() => {
    const total = weeks.reduce((acc, w) => acc + w.tasks.length, 0);
    const done = weeks.reduce((acc, w) => acc + w.tasks.filter(t => t.completed).length, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [weeks]);

  // --- COMPONENTES UI ---

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3 text-blue-600 mb-1">
            <Activity size={28} strokeWidth={2.5} />
            <h1 className="text-2xl font-black tracking-tighter">SCTT v2.0</h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control Técnico de Tesis</p>
        </div>
        
        <nav className="flex-1 p-6 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('tracker')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'tracker' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Calendar size={20} /> Cronograma
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'reports' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <FileSpreadsheet size={20} /> Reportes
          </button>
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

            {/* PHASE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {phaseProgress.map(phase => (
                <div key={phase.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl ${phase.color} text-white shadow-lg shadow-current/20`}>
                      {phase.icon}
                    </div>
                    {phase.isDone ? (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Completada</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">En Proceso</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{phase.name}</h3>
                  <p className="text-xs text-slate-400 font-medium mb-4">Semanas: {phase.weeks[0]} - {phase.weeks[phase.weeks.length - 1]}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Progreso Técnico</span>
                      <span className="text-sm font-black text-slate-700">{phase.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${phase.color} transition-all duration-1000`} 
                        style={{ width: `${phase.progress}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* RECENT ACTIVITY / STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-6">Estado de la Tesis</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Semanas Cerradas</p>
                      <p className="text-5xl font-black">{weeks.filter(w => w.closed).length}<span className="text-xl text-slate-500 font-medium"> / 24</span></p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">KPIs Críticos</p>
                      <p className="text-5xl font-black">{weeks.reduce((acc, w) => acc + w.tasks.filter(t => t.critical && t.completed).length, 0)}</p>
                    </div>
                  </div>
                  <div className="mt-10 flex gap-4">
                    <div className="flex -space-x-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                          S{i}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-slate-400 flex items-center gap-2">
                      <Info size={14} /> Última validación realizada hoy
                    </p>
                  </div>
                </div>
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-4">
                  <Activity size={40} />
                </div>
                <h4 className="text-xl font-bold text-slate-800">Red PGICH</h4>
                <p className="text-slate-400 text-sm font-medium mb-6">10 estaciones meteorológicas activas para asimilación</p>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Sistema Operativo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="max-w-6xl mx-auto p-12 flex flex-col lg:flex-row gap-10">
            {/* WEEK SELECTOR */}
            <div className="w-full lg:w-80 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900">Cronograma</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">24 SEMANAS</span>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {weeks.map(w => {
                  const phase = PHASES.find(p => p.id === w.phaseId);
                  const isSelected = selectedWeekId === w.id;
                  const isLocked = w.id > 1 && !weeks.find(prev => prev.id === w.id - 1)?.closed;

                  return (
                    <button 
                      key={w.id}
                      onClick={() => setSelectedWeekId(w.id)}
                      className={`w-full group text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${phase?.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                        <div>
                          <p className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>Semana {w.id}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{phase?.name.split(':')[0]}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.closed ? <CheckCircle2 size={16} className="text-emerald-500" /> : isLocked ? <Lock size={14} className="text-slate-300" /> : <ChevronRight size={16} className="text-slate-300" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* WEEK DETAIL */}
            <div className="flex-1 space-y-8">
              {(() => {
                const week = weeks.find(w => w.id === selectedWeekId);
                if (!week) return null;
                const phase = PHASES.find(p => p.id === week.phaseId);
                const isLocked = selectedWeekId > 1 && !weeks.find(prev => prev.id === selectedWeekId - 1)?.closed;
                
                return (
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm min-h-[600px] flex flex-col">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest ${phase?.color}`}>
                            {phase?.name}
                          </span>
                          {week.closed && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Semana Cerrada</span>}
                        </div>
                        <h3 className="text-3xl font-black text-slate-900">{week.title}</h3>
                      </div>
                      {!week.closed && !isLocked && (
                        <button 
                          onClick={() => closeWeek(week.id)}
                          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                        >
                          <Lock size={18} /> Cerrar Semana
                        </button>
                      )}
                    </div>

                    {isLocked && !week.closed ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                          <Lock size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">Semana Bloqueada</h4>
                        <p className="text-slate-400 max-w-xs font-medium">Debe completar y cerrar la Semana {selectedWeekId - 1} para habilitar este hito técnico.</p>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                          {week.tasks.map(task => (
                            <div key={task.id} className="group bg-slate-50/50 hover:bg-white p-8 rounded-[2rem] border border-transparent hover:border-slate-200 transition-all duration-300">
                              <div className="flex items-start gap-6">
                                <div className="pt-1">
                                  <input 
                                    type="checkbox" 
                                    checked={task.completed}
                                    disabled={week.closed}
                                    onChange={(e) => updateTask(week.id, task.id, { completed: e.target.checked })}
                                    className="w-6 h-6 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed transition-all"
                                  />
                                </div>
                                <div className="flex-1 space-y-6">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className={`text-lg font-bold transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {task.desc}
                                      </h4>
                                      {task.critical && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Requisito Crítico</span>}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KPI: {task.kpiName}</label>
                                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Meta: {task.kpiMeta}</span>
                                      </div>
                                      <input 
                                        type="text"
                                        value={task.kpiValue}
                                        disabled={week.closed}
                                        onChange={(e) => updateTask(week.id, task.id, { kpiValue: e.target.value })}
                                        placeholder="Ingrese valor técnico..."
                                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidencia ({task.evidenceType})</label>
                                      <div className="relative">
                                        <input 
                                          type="text"
                                          value={task.evidence}
                                          disabled={week.closed}
                                          onChange={(e) => updateTask(week.id, task.id, { evidence: e.target.value })}
                                          placeholder={task.evidenceType === 'hash' ? "Hash MD5..." : "URL, ruta o descripción..."}
                                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-semibold"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                          <FileText size={18} />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-slate-900">Auditoría Técnica</h2>
                <p className="text-slate-500 font-medium">Consolidado de KPIs y trazabilidad de evidencias por fase</p>
              </div>
              <button 
                onClick={exportToExcel}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
              >
                <Download size={20} /> Exportar Matriz (.xlsx)
              </button>
            </header>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Semana</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fase Técnica</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad Crítica</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">KPI / Valor</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weeks.map(w => {
                      const phase = PHASES.find(p => p.id === w.phaseId);
                      const criticalTask = w.tasks.find(t => t.critical) || w.tasks[0];
                      
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-6">
                            <span className="text-sm font-black text-slate-900">S{w.id}</span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${phase?.color}`} />
                              <span className="text-xs font-bold text-slate-600">{phase?.name}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <p className="text-sm font-medium text-slate-700 max-w-xs truncate">{criticalTask.desc}</p>
                          </td>
                          <td className="p-6">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{criticalTask.kpiName}</p>
                              <p className="text-sm font-black text-blue-600">{criticalTask.kpiValue || '---'}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex justify-center">
                              {w.closed ? (
                                <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                  <CheckCircle2 size={18} />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
                                  <Lock size={14} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
