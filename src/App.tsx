/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- UTILIDADES DE DATOS ---
const generateInitialData = () => {
  const weeks = [];
  for (let i = 1; i <= 24; i++) {
    weeks.push({
      id: i,
      month: Math.ceil(i / 4),
      title: `Semana ${i}: Ejecución Técnica`,
      closed: false,
      tasks: [
        { id: `${i}-1`, desc: `Actividad Técnica Crítica S${i}`, completed: false, kpiName: "RMSE / Precisión", kpiValue: "", critical: true, evidence: "" },
        { id: `${i}-2`, desc: `Documentación de Avance S${i}`, completed: false, kpiName: "Páginas", kpiValue: "", critical: false, evidence: "" }
      ]
    });
  }
  return weeks;
};

export default function App() {
  const [weeks, setWeeks] = useState(() => {
    const saved = localStorage.getItem('sctt_data');
    return saved ? JSON.parse(saved) : generateInitialData();
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedWeekId, setSelectedWeekId] = useState(1);

  // Persistencia automática
  useEffect(() => {
    localStorage.setItem('sctt_data', JSON.stringify(weeks));
  }, [weeks]);

  // --- LÓGICA DE NEGOCIO ---
  const updateTask = (weekId: number, taskId: string, fields: any) => {
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
    
    // Validación: Semana anterior cerrada
    if (weekId > 1) {
      const prevWeek = weeks.find(w => w.id === weekId - 1);
      if (prevWeek && !prevWeek.closed) {
        alert(`Error: Debe cerrar la Semana ${weekId - 1} primero.`);
        return;
      }
    }

    // Validación: KPIs Críticos
    const pendingCritical = week.tasks.some(t => t.critical && !t.kpiValue);
    if (pendingCritical) {
      alert("Error: Existen KPIs críticos sin completar.");
      return;
    }

    setWeeks(prev => prev.map(w => w.id === weekId ? { ...w, closed: true } : w));
  };

  const exportToExcel = () => {
    const data = weeks.flatMap(w => w.tasks.map(t => ({
      Semana: w.id,
      Mes: w.month,
      Actividad: t.desc,
      Estado: t.completed ? "Completado" : "Pendiente",
      KPI: t.kpiName,
      Valor: t.kpiValue,
      Evidencia: t.evidence,
      Semana_Cerrada: w.closed ? "SÍ" : "NO"
    })));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriz de Control");
    XLSX.writeFile(wb, "Matriz_Control_Tecnico.xlsx");
  };

  // --- CÁLCULOS DASHBOARD ---
  const totalTasks = weeks.reduce((acc, w) => acc + w.tasks.length, 0);
  const completedTasks = weeks.reduce((acc, w) => acc + w.tasks.filter(t => t.completed).length, 0);
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <FileSpreadsheet size={24} /> SCTT v1.0
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('tracker')} 
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'tracker' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <Calendar size={20} /> Cronograma
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'reports' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <FileSpreadsheet size={20} /> Reportes
          </button>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <header>
              <h2 className="text-3xl font-bold">Estado del Proyecto</h2>
              <p className="text-gray-500">Resumen de avance de 24 semanas</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 uppercase font-semibold">Progreso Global</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-bold">{progress}%</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full mb-2 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 uppercase font-semibold">Semanas Cerradas</p>
                <p className="text-4xl font-bold mt-2">{weeks.filter(w => w.closed).length} / 24</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 uppercase font-semibold">Estado Actual</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">AL DÍA</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(m => {
                const isMonthDone = weeks.filter(w => w.month === m).every(w => w.closed);
                return (
                  <div key={m} className={`p-4 rounded-lg border text-center transition-colors ${isMonthDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <p className="text-xs font-bold text-gray-400">MES {m}</p>
                    <div className="mt-2 text-2xl">{isMonthDone ? '✅' : '⏳'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
            {/* Lista de Semanas */}
            <div className="w-full md:w-1/3 space-y-2">
              <h3 className="font-bold mb-4">Cronograma</h3>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2">
                {weeks.map(w => (
                  <button 
                    key={w.id}
                    onClick={() => setSelectedWeekId(w.id)}
                    className={`w-full text-left p-3 rounded-lg border flex items-center justify-between transition ${selectedWeekId === w.id ? 'border-blue-500 bg-blue-50' : 'bg-white border-gray-200 hover:border-gray-400'}`}
                  >
                    <span className="text-sm font-medium">Semana {w.id}</span>
                    {w.closed ? <CheckCircle2 size={16} className="text-green-500" /> : <Lock size={16} className="text-gray-300" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Detalle de Semana */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              {(() => {
                const week = weeks.find(w => w.id === selectedWeekId);
                if (!week) return null;
                const isLocked = selectedWeekId > 1 && !weeks.find(w => w.id === selectedWeekId - 1)?.closed;
                
                return (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">{week.title}</h3>
                      {week.closed && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Cerrada</span>}
                    </div>

                    {isLocked && !week.closed ? (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-700">
                        <AlertCircle />
                        <p className="text-sm font-medium">Esta semana está bloqueada hasta que se cierre la semana anterior.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {week.tasks.map(task => (
                          <div key={task.id} className="p-4 border border-gray-100 rounded-lg space-y-4 bg-gray-50/30">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={task.completed}
                                disabled={week.closed}
                                onChange={(e) => updateTask(week.id, task.id, { completed: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span className={`flex-1 font-medium ${task.completed ? 'line-through text-gray-400' : ''}`}>
                                {task.desc} {task.critical && <span className="text-xs text-red-500 font-bold ml-2">(CRÍTICO)</span>}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-8">
                              <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">{task.kpiName}</label>
                                <input 
                                  type="text"
                                  value={task.kpiValue}
                                  disabled={week.closed}
                                  onChange={(e) => updateTask(week.id, task.id, { kpiValue: e.target.value })}
                                  placeholder="Ingrese valor..."
                                  className="w-full mt-1 p-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Evidencia (Ruta/Link)</label>
                                <input 
                                  type="text"
                                  value={task.evidence}
                                  disabled={week.closed}
                                  onChange={(e) => updateTask(week.id, task.id, { evidence: e.target.value })}
                                  placeholder="URL o ruta local..."
                                  className="w-full mt-1 p-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {!week.closed && (
                          <button 
                            onClick={() => closeWeek(week.id)}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2 shadow-lg"
                          >
                            <Lock size={18} /> CERRAR SEMANA {week.id}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold">Reportes y Matrices</h2>
                <p className="text-gray-500">Exportación de datos para auditoría técnica</p>
              </div>
              <button 
                onClick={exportToExcel}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 shadow-lg shadow-green-200"
              >
                <Download size={20} /> Exportar Matriz (.xlsx)
              </button>
            </header>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase">Semana</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase">Actividad</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase">KPI</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase">Cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {weeks.flatMap(w => w.tasks.slice(0, 1)).map(t => {
                      const week = weeks.find(w => w.id === parseInt(t.id.split('-')[0]));
                      return (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-medium text-sm">Semana {t.id.split('-')[0]}</td>
                          <td className="p-4 text-sm">{t.desc}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${t.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {t.completed ? 'COMPLETO' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{t.kpiValue || '-'}</td>
                          <td className="p-4">
                            {week?.closed ? <CheckCircle2 size={18} className="text-green-500" /> : <span className="text-lg">⏳</span>}
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
