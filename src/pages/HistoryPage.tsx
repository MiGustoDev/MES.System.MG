import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { History, SECTORS, Sector, SHIFT_TYPES, ShiftType, SECTOR_PRODUCTS, calculateStatus } from '../types';
import { Calendar, Beef, ChefHat, ListRestart, Package, Droplets, Info, TrendingUp, Target, Activity } from 'lucide-react';
import { formatNumber } from '../utils/format';

const SECTOR_ICONS: Record<string, any> = {
  'Mesa de Carnes': Beef,
  'Cocina': ChefHat,
  'Picadillo': ListRestart,
  'Armado': Package,
  'Salsas': Droplets,
};

export function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(SHIFT_TYPES[0]);
  const [history, setHistory] = useState<History[]>([]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, [selectedDate, selectedShift]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data: shiftsData } = await supabase
        .from('history')
        .select('shift_type')
        .eq('date', selectedDate);
      
      const shifts = Array.from(new Set(((shiftsData as any[]) || []).map(s => s.shift_type)));
      setAvailableShifts(shifts);
      
      let query = supabase
        .from('history')
        .select('*')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift)
        .order('sector', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const sectorProducts = SECTOR_PRODUCTS[selectedSector] as readonly string[];
    return item.sector === selectedSector && sectorProducts.includes(item.product);
  });
  
  const totalPlanned = filteredHistory.reduce((sum, item) => sum + item.planned, 0);
  const totalProduced = filteredHistory.reduce((sum, item) => sum + item.produced, 0);
  const totalDifference = totalProduced - totalPlanned;
  const overallStatus = totalPlanned > 0 ? calculateStatus(totalDifference) : 'OK';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Historial de Producción</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">Análisis detallado de la planta por jornada</p>
        </div>
        
        <div 
          className="relative w-full sm:w-auto min-w-[160px] px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-3 transition-all cursor-pointer hover:border-blue-500 dark:hover:border-blue-500/50 group text-sm sm:text-base pr-8 shadow-sm"
          onClick={() => dateInputRef.current?.showPicker()}
        >
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
          />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-bold">{selectedDate.split('-').reverse().join('/')}</span>
          </div>
          <Calendar className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors absolute right-3" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {SHIFT_TYPES.map((shift) => (
            <button
              key={shift}
              onClick={() => setSelectedShift(shift as ShiftType)}
              className={`px-8 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] transition-all relative ${
                selectedShift === shift
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.3)]'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-500 border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              Turno {shift}
              {availableShifts.includes(shift) && selectedShift !== shift && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full shadow-lg"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300">
        {/* NAVEGACIÓN DE SECTORES - SIEMPRE VISIBLE */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-transparent">
          {SECTORS.map((s) => {
            const Icon = SECTOR_ICONS[s];
            return (
              <button
                key={s}
                onClick={() => setSelectedSector(s)}
                className={`relative px-6 py-4 flex flex-col items-center gap-2 transition-all duration-300 group ${
                  selectedSector === s
                    ? 'bg-blue-600/5 dark:bg-blue-600/10'
                    : 'hover:bg-gray-100/50 dark:hover:bg-white/5'
                }`}
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

        {filteredHistory.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-4 bg-white dark:bg-transparent">
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full mb-2">
              <Info className="w-10 h-10 text-gray-300 dark:text-white/10" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xl font-bold tracking-tight uppercase">SIN REGISTROS PARA {selectedSector.toUpperCase()}</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm max-w-xs mx-auto">
              Prueba cambiando de sector o turno para el día {selectedDate.split('-').reverse().join('/')}.
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* KPI CARDS POR SECTOR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-gray-50/30 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
              {[
                { label: 'META SECTOR', value: `${formatNumber(totalPlanned, 0)} kg`, icon: Target, color: 'text-gray-900 dark:text-white' },
                { label: 'REAL LOGRADO', value: `${formatNumber(totalProduced, 0)} kg`, icon: TrendingUp, color: 'text-teal-600 dark:text-teal-400' },
                { label: 'ESTADO ACTUAL', value: overallStatus.toUpperCase(), icon: Activity, color: overallStatus === 'Adelanto' ? 'text-amber-500' : overallStatus === 'Atraso' ? 'text-red-600' : 'text-teal-500' }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{kpi.label}</p>
                    <p className={`text-xl font-black ${kpi.color} leading-none`}>{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* TABLA DE PRODUCTOS */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-100 dark:border-white/5">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Producto</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Planificado</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Logrado</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Diferencia</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Eficiencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-5 font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.product}</td>
                      <td className="px-8 py-5 text-right text-gray-900 dark:text-white font-medium">{formatNumber(item.planned, 1)} <span className="text-[10px] text-gray-400 font-bold ml-1">KG</span></td>
                      <td className="px-8 py-5 text-right text-gray-900 dark:text-white font-black">{formatNumber(item.produced, 1)} <span className="text-[10px] text-gray-400 font-bold ml-1">KG</span></td>
                      <td className="px-8 py-5 text-right">
                        <span className={`text-sm font-black px-3 py-1 rounded-lg ${
                          item.difference > 0 ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                          item.difference < 0 ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                          'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                        }`}>
                          {item.difference >= 0 ? '+' : ''}{formatNumber(item.difference, 1)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center font-black">
                        <span className={`text-[10px] tracking-widest px-3 py-1.5 rounded-full border ${
                          item.status === 'Adelanto' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                          item.status === 'Atraso' ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                          'border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
