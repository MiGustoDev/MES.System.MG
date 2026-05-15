import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { History, SECTORS, Sector, SHIFT_TYPES, ShiftType, SECTOR_PRODUCTS, calculateStatus } from '../types';
import { Calendar, Beef, ChefHat, ListRestart, Package, Droplets, Info, TrendingUp, Target, Activity, Download, FileText, X } from 'lucide-react';
import { CalendarDropdown } from '../components/CalendarDropdown';
import { formatNumber } from '../utils/format';

const SECTOR_ICONS: Record<string, any> = {
  'Mesa de Carnes': Beef,
  'Cocina': ChefHat,
  'Picadillo': ListRestart,
  'Armado': Package,
  'Salsas': Droplets,
};

const SECTOR_UNITS: Record<string, string> = {
  'Mesa de Carnes': 'KG',
  'Cocina': 'Cocciones',
  'Picadillo': 'Bateas',
  'Armado': 'Bandejas',
  'Salsas': 'Unidades',
};

export function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [history, setHistory] = useState<History[]>([]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportRange, setExportRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isExporting, setIsExporting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, [selectedDate, selectedSector]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data: shiftsData } = await supabase
        .from('history')
        .select('shift_type')
        .eq('date', selectedDate);
      
      const shifts = Array.from(new Set(((shiftsData as any[]) || []).map(s => s.shift_type)));
      setAvailableShifts(shifts);
      
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('date', selectedDate)
        .order('product', { ascending: true });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRange = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .gte('date', exportRange.start)
        .lte('date', exportRange.end)
        .order('date', { ascending: true })
        .order('sector', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        alert('No hay datos en el rango seleccionado');
        return;
      }

      // Preparar CSV
      const headers = ['Fecha', 'Turno', 'Sector', 'Producto', 'Maquina', 'Planificado', 'Logrado', 'Diferencia', 'Estado', 'Cargador', 'Checker', 'Observaciones'];
      const csvRows = [headers.join(';')];

      data.forEach((item: any) => {
        const diff = item.difference ?? (item.produced - item.planned);
        const status = item.status ?? (diff > 0 ? 'Adelanto' : (diff === 0 ? 'OK' : 'Atraso'));
        
        const row = [
          item.date,
          item.shift_type,
          item.sector,
          item.product,
          item.machine || '',
          item.planned,
          item.produced,
          diff,
          status,
          item.cargador || '',
          item.checker || '',
          (item.observations || '').replace(/;/g, ',')
        ];
        csvRows.push(row.join(';'));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Historial_Produccion_${exportRange.start}_a_${exportRange.end}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowExportPanel(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  const getShiftData = (shift: string) => {
    const sectorHistory = history.filter(h => 
      h.sector.toLowerCase().trim() === selectedSector.toLowerCase().trim()
    );
    
    const shiftHistory = sectorHistory.filter(h => 
      h.shift_type.toLowerCase().trim() === shift.toLowerCase().trim()
    ).map(item => {
      const diff = item.difference ?? (item.produced - item.planned);
      const status = item.status ?? (diff > 0 ? 'Adelanto' : (diff === 0 ? 'OK' : 'Atraso'));
      return { ...item, difference: diff, status: status };
    });

    const totalPlanned = shiftHistory.reduce((sum, item) => sum + item.planned, 0);
    const totalProduced = shiftHistory.reduce((sum, item) => sum + item.produced, 0);
    const totalDifference = totalProduced - totalPlanned;
    const overallStatus = totalPlanned > 0 ? calculateStatus(totalDifference) : 'OK';

    return {
      history: shiftHistory,
      totalPlanned,
      totalProduced,
      totalDifference,
      overallStatus
    };
  };

  const hasDataInAnySector = history.length > 0;
  const hasDataInSelectedSector = history.some(h => h.sector.toLowerCase().trim() === selectedSector.toLowerCase().trim());
  
  const sectorsWithData = Array.from(new Set(history.map(h => h.sector)));

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center h-64">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {loading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[1px] rounded-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-4">
        <div className="text-center lg:text-left w-full lg:w-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Historial de Producción</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">Análisis detallado de la planta por jornada</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportPanel(!showExportPanel)}
            className={`p-3 rounded-xl transition-all ${
              showExportPanel 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'bg-white dark:bg-[#1a1c23] text-gray-500 border border-gray-200 dark:border-white/10 hover:border-blue-500'
            }`}
            title="Exportar datos"
          >
            <Download className="w-5 h-5" />
          </button>
          
          <CalendarDropdown
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </div>
      </div>

      {/* PANEL DE EXPORTACIÓN */}
      {showExportPanel && (
        <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-500/10 animate-in slide-in-from-top-4 duration-300 relative">
          <button 
            onClick={() => setShowExportPanel(false)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Exportar Reporte CSV</h3>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5">Selecciona el rango de fechas</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 w-full md:w-auto">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desde</span>
                <CalendarDropdown 
                  selectedDate={exportRange.start} 
                  onSelect={(date) => setExportRange(prev => ({ ...prev, start: date }))} 
                />
              </div>
              <div className="w-4 h-px bg-gray-300 dark:bg-white/10 hidden sm:block"></div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hasta</span>
                <CalendarDropdown 
                  selectedDate={exportRange.end} 
                  onSelect={(date) => setExportRange(prev => ({ ...prev, end: date }))} 
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowExportPanel(false)}
                className="flex-1 md:flex-none px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all border border-gray-200 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleExportRange}
                disabled={isExporting}
                className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Descargar Reporte</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Turno selection removed as all shifts are now displayed simultaneously */}

      <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300">
        {/* NAVEGACIÓN DE SECTORES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-transparent">
          {SECTORS.map((s, index) => {
            const Icon = SECTOR_ICONS[s];
            return (
              <button
                key={s}
                onClick={() => setSelectedSector(s)}
                className={`relative px-6 py-4 flex flex-col items-center gap-2 transition-all duration-300 group ${
                  selectedSector === s
                    ? 'bg-blue-600/5 dark:bg-blue-600/10'
                    : 'hover:bg-gray-100/50 dark:hover:bg-white/5'
                } ${index === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  selectedSector === s
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-gray-200/50 dark:bg-white/5 text-gray-400 group-hover:text-blue-500'
                }`}>
                  {Icon && <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                  selectedSector === s
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:group-hover:text-gray-300'
                }`}>
                  {s}
                </span>
                {selectedSector === s && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 shadow-[0_-2px_10px_rgba(37,99,235,0.5)] animate-in slide-in-from-bottom-1"></div>
                )}
              </button>
            );
          })}
        </div>

        {!hasDataInSelectedSector ? (
          <div className="p-20 text-center flex flex-col items-center gap-4 bg-white dark:bg-transparent">
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full mb-2">
              <Info className="w-10 h-10 text-gray-300 dark:text-white/10" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xl font-bold tracking-tight uppercase">
              SIN REGISTROS PARA {selectedSector.toUpperCase()}
            </p>
            <p className="text-gray-400 dark:text-gray-600 text-sm max-w-sm mx-auto">
              {!hasDataInAnySector 
                ? `No hay datos registrados para NINGÚN sector el día ${selectedDate.split('-').reverse().join('/')}.`
                : `No hay datos para ${selectedSector} hoy, pero sí existen registros en: ${sectorsWithData.join(', ')}.`
              }
            </p>
            {!hasDataInAnySector && (
              <p className="text-xs text-gray-500 mt-2 italic">
                Asegúrate de que los turnos hayan sido "Cerrados" en la pantalla de Producción para que aparezcan aquí.
              </p>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {SHIFT_TYPES.map((shift) => {
                const { history: shiftHistory, totalPlanned, totalProduced, overallStatus } = getShiftData(shift);
                const unit = SECTOR_UNITS[selectedSector].toLowerCase();

                return (
                  <div key={shift} className="flex flex-col gap-6">
                    {/* ENCABEZADO DE TURNO */}
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          shift === 'Mañana' ? 'bg-amber-500' : shift === 'Tarde' ? 'bg-orange-500' : 'bg-indigo-500'
                        } shadow-lg shadow-current/20`}></div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">
                          Turno {shift}
                        </h2>
                      </div>
                      {shiftHistory.length > 0 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          overallStatus === 'Adelanto' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                          overallStatus === 'Atraso' ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                          'border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20'
                        }`}>
                          {overallStatus.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {shiftHistory.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-gray-200 dark:border-white/5">
                        <Info className="w-8 h-8 text-gray-300 dark:text-white/10 mb-3" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Sin registros</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* KPI MINI CARDS */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50/50 dark:bg-white/[0.02] p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Meta</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white">{formatNumber(totalPlanned, 0)} <span className="text-[9px] text-gray-500">{unit}</span></p>
                          </div>
                          <div className="bg-gray-50/50 dark:bg-white/[0.02] p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Logrado</p>
                            <p className="text-sm font-black text-teal-600 dark:text-teal-400">{formatNumber(totalProduced, 0)} <span className="text-[9px] text-gray-500">{unit}</span></p>
                          </div>
                        </div>

                        {/* TABLA COMPACTA */}
                        <div className="bg-white dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50/80 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5">
                              <tr>
                                <th className="pl-4 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Producto</th>
                                <th className="px-2 py-4 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Plan/Prod</th>
                                <th className="pr-4 py-4 text-right text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Ef.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                              {shiftHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                                  <td className="pl-4 py-4">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors truncate max-w-[140px]" title={item.product}>
                                      {item.product}
                                    </p>
                                    {item.machine && (
                                      <p className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-tighter mt-0.5">{item.machine}</p>
                                    )}
                                  </td>
                                  <td className="px-2 py-4 text-right whitespace-nowrap">
                                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{formatNumber(item.planned, 0)}</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white mx-1.5">/</span>
                                    <span className={`text-xs font-black ${
                                      item.produced > item.planned ? 'text-amber-500' :
                                      item.produced === item.planned ? 'text-teal-500' :
                                      'text-red-500'
                                    }`}>{formatNumber(item.produced, 0)}</span>
                                  </td>
                                  <td className="pr-4 py-4 text-right">
                                    <div className={`inline-flex w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${
                                      item.status === 'Adelanto' ? 'bg-amber-500' :
                                      item.status === 'Atraso' ? 'bg-red-500' :
                                      'bg-teal-500'
                                    } shadow-sm shadow-current/20`} title={item.status}></div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
