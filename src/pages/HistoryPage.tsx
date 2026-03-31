import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { History, SECTORS, Sector, SHIFT_TYPES, ShiftType, SECTOR_PRODUCTS } from '../types';
import { Calendar, Beef, ChefHat, ListRestart, Package, Droplets, Info } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, [selectedDate, selectedShift]);

  const loadHistory = async () => {
    setLoading(true);
    try {
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
  
  const groupedByDate = filteredHistory.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, History[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Historial de Producción</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300 font-medium">Análisis detallado de la planta por jornada</p>
        </div>
        
        {/* Selector de Fecha Única - Estilo Unificado */}
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
              className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                selectedShift === shift
                  ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-500 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              Turno {shift}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-200 dark:border-white/5 p-16 text-center transition-all duration-300 flex flex-col items-center gap-4">
            <Info className="w-12 h-12 text-gray-300 dark:text-white/10 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-xl font-medium italic">No se encontraron registros en la fecha seleccionada</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm">Prueba seleccionando otro día o turno.</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => {
            const totalPlanned = items.reduce((sum, item) => sum + item.planned, 0);
            const totalProduced = items.reduce((sum, item) => sum + item.produced, 0);
            const totalDifference = items.reduce((sum, item) => sum + item.difference, 0);
            const overallStatus = totalDifference > 0 ? 'Adelanto' : totalDifference === 0 ? 'OK' : 'Atraso';

            return (
              <div key={date} className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300">
                <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] px-8 py-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                        {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <p className="text-blue-200 text-[10px] font-black tracking-[0.2em] uppercase">
                          Reporte de Eficiencia MES.MG
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      {[
                        { label: 'Plan Total', value: totalPlanned, color: 'text-white' },
                        { label: 'Producido', value: totalProduced, color: 'text-teal-400' },
                        { label: 'Estado', value: overallStatus, color: overallStatus === 'Adelanto' ? 'text-amber-400' : overallStatus === 'Atraso' ? 'text-red-500' : 'text-teal-400' }
                      ].map((kpi, idx) => (
                        <div key={idx} className="bg-white/5 px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 min-w-[110px]">
                          <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">{kpi.label}</p>
                          <p className={`text-lg font-black ${kpi.color}`}>
                            {typeof kpi.value === 'number' ? `${kpi.value.toFixed(0)} kg` : kpi.value.toUpperCase()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* NAVEGACIÓN DE SECTORES - REDISEÑADA */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 border-b border-gray-200 dark:border-white/5">
                    {SECTORS.map((s) => {
                      const Icon = SECTOR_ICONS[s];
                      return (
                        <button
                          key={s}
                          onClick={() => setSelectedSector(s)}
                          className={`relative px-6 py-4 flex flex-col items-center gap-2 transition-all duration-300 group ${
                            selectedSector === s
                              ? 'bg-blue-600/5 dark:bg-blue-600/10'
                              : 'bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className={`p-2 rounded-xl transition-all duration-300 ${
                            selectedSector === s
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 rotate-0'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-blue-500 group-hover:rotate-12'
                          }`}>
                            {Icon && <Icon className="w-5 h-5" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                            selectedSector === s
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-300'
                          }`}>
                            {s}
                          </span>
                          {selectedSector === s && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 shadow-[0_-2px_10px_rgba(37,99,235,0.5)]"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-white/5">
                      <tr>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Producto</th>
                        <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Planificado</th>
                        <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Producción Real</th>
                        <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Diferencia</th>
                        <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Eficiencia</th>
                        <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Turno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <td className="px-8 py-5 font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.product}</td>
                            <td className="px-8 py-5 text-right text-gray-900 dark:text-white font-medium">{item.planned.toFixed(1)} <span className="text-[10px] text-gray-400 font-bold ml-1">KG</span></td>
                            <td className="px-8 py-5 text-right text-gray-900 dark:text-white font-black">{item.produced.toFixed(1)} <span className="text-[10px] text-gray-400 font-bold ml-1">KG</span></td>
                            <td className="px-8 py-5 text-right">
                              <span className={`text-sm font-black px-3 py-1 rounded-lg ${
                                item.difference > 0 ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                                item.difference < 0 ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                                'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'
                              }`}>
                                {item.difference >= 0 ? '+' : ''}{item.difference.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center font-black">
                              <span className={`text-[10px] tracking-widest px-3 py-1.5 rounded-full border ${
                                item.status === 'Adelanto' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                                item.status === 'Atraso' ? 'border-red-200 bg-red-50 text-red-700' :
                                'border-teal-200 bg-teal-50 text-teal-700'
                              }`}>
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">{item.shift_type}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
