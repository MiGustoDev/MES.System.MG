import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Production, SECTORS, SHIFT_TYPES, Sector, ShiftType, SECTOR_PRODUCTS } from '../types';
import { Calendar, PlayCircle, Save, StopCircle, AlertTriangle, Pencil, Check, TrendingUp, Package, Eye, Lock, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CalendarDropdown } from '../components/CalendarDropdown';
import { formatNumber } from '../utils/format';
import { NumericInput } from '../components/NumericInput';

const SECTOR_UNITS: Record<string, string> = {
  'Mesa de Carnes': 'KG',
  'Cocina': 'Cocciones',
  'Picadillo': 'Bateas',
  'Armado': 'Bandejas',
  'Salsas': 'Unidades',
};

export function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(SHIFT_TYPES[0]);
  const [production, setProduction] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dayStatus, setDayStatus] = useState<'pending' | 'started' | 'closed'>('pending');
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; action: () => void } | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [expandedObservations, setExpandedObservations] = useState<Record<string, boolean>>({});
  const { canEditProduction, role } = useAuth();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const hasEditPermission = canEditProduction(selectedSector);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadProduction()
      ]);
      setLoading(false);
    };
    loadData();
  }, [selectedDate, selectedShift, selectedSector]);

  const loadProduction = async () => {
    try {
      const { data: histExists } = await supabase
        .from('history')
        .select('id')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift)
        .limit(1);

      const { data: prodExists } = await supabase
        .from('production')
        .select('id')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift)
        .limit(1);

      if (histExists && histExists.length > 0) {
        setDayStatus('closed');
      } else if (prodExists && prodExists.length > 0) {
        setDayStatus('started');
      } else {
        setDayStatus('pending');
      }

      const { data: prodData, error: prodError } = await (supabase
        .from('production') as any)
        .select('*')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift)
        .eq('sector', selectedSector);

      if (prodError) throw prodError;

      if (prodData && prodData.length > 0) {
        setProduction(prodData);
      } else {
        // Si no hay producción iniciada, traer lo programado como base
        const { data: progData, error: progError } = await (supabase
          .from('programming') as any)
          .select('*')
          .eq('date', selectedDate)
          .eq('shift_type', selectedShift)
          .eq('sector', selectedSector);
        
        if (progError) throw progError;
        
        if (progData) {
          const initialData = progData.map((p: any) => ({
            id: `temp-${p.id}`,
            date: selectedDate,
            sector: p.sector,
            product: p.product,
            shift_type: p.shift_type,
            planned: p.planned_kg,
            produced: 0,
            machine: p.machine,
            cargador: p.cargador,
            checker: p.checker,
            observations: p.observations
          }));
          setProduction(initialData);
        } else {
          setProduction([]);
        }
      }
    } catch (error) {
      console.error('Error loading production:', error);
      showMessage('error', 'Error al cargar la producción');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateProduced = (id: string, value: number) => {
    setProduction(production.map(p => p.id === id ? { ...p, produced: value } : p));
  };

  const updatePlanned = (id: string, value: number) => {
    setProduction(production.map(p => p.id === id ? { ...p, planned: value } : p));
  };

  const updateObservations = (id: string, value: string) => {
    setProduction(production.map(p => p.id === id ? { ...p, observations: value } : p));
  };

  const updateMachinePersonnel = (machineName: string, field: 'cargador' | 'checker', value: string) => {
    setProduction(production.map(p => p.machine === machineName ? { ...p, [field]: value } : p));
  };

  const saveProduction = async () => {
    setSaving(true);
    try {
      const dataToSave = production
        .filter(p => p.sector === selectedSector)
        .map(p => ({
          id: p.id.startsWith('temp-') ? undefined : p.id,
        date: p.date,
        sector: p.sector,
        product: p.product,
        shift_type: p.shift_type,
        planned: p.planned,
        produced: Number.isFinite(p.produced) ? p.produced : 0,
        observations: p.observations || null,
        cargador: p.cargador || null,
        checker: p.checker || null,
        machine: p.machine || null,
      }));

      const { error } = await (supabase
        .from('production') as any)
        .upsert(dataToSave);

      if (error) throw error;
      
      showMessage('success', 'Avance guardado (Turno aún abierto)');
      await loadProduction();
    } catch (error) {
      console.error('Error saving production:', error);
      showMessage('error', 'Error al guardar el avance');
    } finally {
      setSaving(false);
    }
  };

  const startDay = async () => {
    setSaving(true);
    try {
      const { data: programming, error: progError } = await (supabase
        .from('programming') as any)
        .select('*')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift);

      if (progError) throw progError;

      if (!programming || programming.length === 0) {
        showMessage('error', 'No hay programación para este día/turno');
        return;
      }

      const initialProduction = programming.map((p: any) => ({
        date: selectedDate,
        sector: p.sector,
        product: p.product,
        shift_type: p.shift_type,
        planned: p.planned_kg,
        produced: 0,
        machine: p.machine,
        cargador: p.cargador,
        checker: p.checker,
      }));

      const { error: prodError } = await (supabase
        .from('production') as any)
        .insert(initialProduction);

      if (prodError) throw prodError;

      showMessage('success', 'Producción iniciada correctamente');
      await loadProduction();
    } catch (error) {
      console.error('Error starting production:', error);
      showMessage('error', 'Error al iniciar la producción');
    } finally {
      setSaving(false);
      setConfirmModal(null);
    }
  };

  const closeDay = async () => {
    setSaving(true);
    try {
      const historyData = production.map(p => {
        const diff = p.produced - p.planned;
        return {
          date: p.date,
          sector: p.sector,
          product: p.product,
          shift_type: p.shift_type,
          planned: p.planned,
          produced: p.produced,
          difference: diff,
          status: diff > 0 ? 'Adelanto' : (diff === 0 ? 'OK' : 'Atraso'),
          machine: p.machine,
          cargador: p.cargador,
          checker: p.checker,
          observations: p.observations
        };
      });

      const { error: histError } = await (supabase
        .from('history') as any)
        .insert(historyData);

      if (histError) throw histError;

      const { error: deleteError } = await (supabase
        .from('production') as any)
        .delete()
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift);

      if (deleteError) throw deleteError;

      showMessage('success', 'Turno cerrado y guardado en historial');
      await loadProduction();
    } catch (error) {
      console.error('Error closing production:', error);
      showMessage('error', 'Error al cerrar el turno');
    } finally {
      setSaving(false);
      setConfirmModal(null);
    }
  };

  const handleStartDayClick = () => {
    setConfirmModal({
      show: true,
      title: 'INICIAR TURNO',
      message: `¿Deseas iniciar la producción del Turno ${selectedShift} para el día ${selectedDate.split('-').reverse().join('/')}?`,
      action: startDay
    });
  };

  const handleCloseDayClick = () => {
    setConfirmModal({
      show: true,
      title: 'CERRAR TURNO',
      message: `¿Deseas cerrar el Turno ${selectedShift}? Se guardará en el historial y no podrá modificarse.`,
      action: closeDay
    });
  };
const calculateDifference = (produced: number, planned: number) => produced - planned;
  const calculateStatus = (difference: number) => {
    if (difference > 0) return 'Adelanto';
    if (difference < 0) return 'Atraso';
    return 'OK';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentSectorProduction = production.filter(p => p.sector === selectedSector);
  const totalPlanned = currentSectorProduction.reduce((sum, p) => sum + p.planned, 0);
  const totalProduced = currentSectorProduction.reduce((sum, p) => sum + p.produced, 0);
  const totalDiff = totalProduced - totalPlanned;
  const overallStatus = totalDiff > 0 ? 'Adelanto' : totalDiff < 0 ? 'Atraso' : 'OK';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1c23] rounded-[2.5rem] p-8 max-w-md w-full border border-white/10 shadow-2xl scale-in-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tight">{confirmModal.title}</h3>
            <p className="text-gray-400 text-center mb-8 font-medium">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-6 py-3 bg-white/5 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.action}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Producción Operativa</h1>
          <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-1">Control de planta segmentado por turnos</p>
        </div>
        <CalendarDropdown selectedDate={selectedDate} onSelect={setSelectedDate} />
      </div>

      {/* SELECTORS */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex bg-white/5 p-1.5 rounded-full border border-white/10 shadow-2xl">
          {SHIFT_TYPES.map((shift) => (
            <button
              key={shift}
              onClick={() => setSelectedShift(shift)}
              className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                selectedShift === shift
                  ? 'bg-amber-600 text-white shadow-[0_0_20px_rgba(217,119,6,0.5)] scale-105'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Turno {shift}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-6 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all border ${
                selectedSector === sector
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-600/20'
                  : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
        {[
          { label: 'PLAN TURNO', value: `${formatNumber(totalPlanned, 0)} ${SECTOR_UNITS[selectedSector]}`, color: 'text-white' },
          { label: 'PRODUCIDO', value: `${formatNumber(totalProduced, 0)} ${SECTOR_UNITS[selectedSector].toLowerCase()}`, color: 'text-emerald-400' },
          { label: 'DIFERENCIA', value: `${totalDiff >= 0 ? '+' : ''}${formatNumber(totalDiff, 0)} ${SECTOR_UNITS[selectedSector].toLowerCase()}`, color: totalDiff >= 0 ? 'text-emerald-400' : 'text-rose-400' },
          { label: 'EFICIENCIA', value: overallStatus, color: overallStatus === 'Adelanto' ? 'text-yellow-400' : overallStatus === 'Atraso' ? 'text-rose-500' : 'text-emerald-500' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl transition-all hover:scale-[1.02]">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">{kpi.label}</p>
            <h3 className={`text-3xl font-black ${kpi.color} tracking-tighter`}>{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0">
        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 mr-4">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            dayStatus === 'started' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
            dayStatus === 'closed' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 
            'bg-gray-600'
          }`} />
          <span className={`text-[11px] font-black tracking-[0.2em] ${
            dayStatus === 'started' ? 'text-emerald-400' : 
            dayStatus === 'closed' ? 'text-blue-500' : 
            'text-gray-500'
          }`}>
            TURNO {selectedShift.toUpperCase()} {dayStatus === 'started' ? 'ACTIVO' : dayStatus === 'closed' ? 'FINALIZADO' : 'PENDIENTE'}
          </span>
        </div>

        {hasEditPermission && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleStartDayClick}
              disabled={saving || dayStatus === 'closed' || dayStatus === 'started'}
              className="flex items-center gap-2 px-6 py-3.5 bg-teal-600/20 text-teal-400 border border-teal-500/30 rounded-2xl hover:bg-teal-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none"
            >
              <PlayCircle className="w-4 h-4" />
              Iniciar {selectedShift}
            </button>
            <button
              onClick={saveProduction}
              disabled={saving || production.length === 0 || dayStatus === 'closed'}
              className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-30 shadow-xl shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              Guardar Avance
            </button>
            <button
              onClick={handleCloseDayClick}
              disabled={saving || dayStatus !== 'started'}
              className="flex items-center gap-2 px-6 py-3.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-30 shadow-xl shadow-orange-600/20"
            >
              <StopCircle className="w-4 h-4" />
              Cerrar Turno
            </button>
          </div>
        )}
      </div>

      {selectedSector === 'Armado' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12 px-4 sm:px-0">
          {Array.from(new Set(
            production
              .filter(p => p.sector === selectedSector && p.machine)
              .map(p => p.machine!)
          )).sort().map((machineName) => {
            const machineRows = production.filter(p => p.sector === selectedSector && p.machine === machineName);
            const totalPlannedM = machineRows.reduce((sum, r) => sum + r.planned, 0);
            const totalProducedM = machineRows.reduce((sum, r) => sum + r.produced, 0);

            return (
              <div key={machineName} className="group/card">
                <div className="bg-[#1a1c23] rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col transition-all duration-500 hover:border-blue-500/40 shadow-2xl">
                  <div className="px-8 py-6 bg-black/20 border-b border-white/10 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{machineName}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Cargador</label>
                        <input 
                          type="text"
                          placeholder="Nro..."
                          value={machineRows[0]?.cargador || ''}
                          onChange={(e) => updateMachinePersonnel(machineName, 'cargador', e.target.value)}
                          disabled={dayStatus === 'closed' || !hasEditPermission}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Checker</label>
                        <input 
                          type="text"
                          placeholder="Nombre..."
                          value={machineRows[0]?.checker || ''}
                          onChange={(e) => updateMachinePersonnel(machineName, 'checker', e.target.value)}
                          disabled={dayStatus === 'closed' || !hasEditPermission}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {machineRows.map((row) => {
                      const difference = calculateDifference(row.produced, row.planned);
                      const status = calculateStatus(difference);

                      return (
                        <div key={row.id} className="p-4 bg-black/20 rounded-2xl border border-white/5 group-hover/card:border-white/10 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-black text-white uppercase tracking-tight flex-1 break-words mr-2">{row.product}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              status === 'Adelanto' ? 'bg-yellow-400/10 text-yellow-400' :
                              status === 'Atraso' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {status.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <div className="space-y-1">
                              <p className="text-[7px] font-black text-gray-500 uppercase">Plan</p>
                              <p className="text-[11px] font-bold text-white">{formatNumber(row.planned, 0)}</p>
                            </div>
                            <div className="col-span-2">
                                <NumericInput 
                                  value={row.produced}
                                  onChange={(val) => updateProduced(row.id, val)}
                                  disabled={dayStatus === 'closed' || !hasEditPermission}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-black text-right text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-30"
                                />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-auto p-6 bg-black/30 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Total Máquina</p>
                        <p className="text-lg font-black text-white">{formatNumber(totalProducedM, 0)} / {formatNumber(totalPlannedM, 0)}</p>
                      </div>
                      <div className={`px-4 py-1.5 rounded-xl text-xs font-black ${
                        totalProducedM >= totalPlannedM ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {Math.round((totalProducedM / totalPlannedM) * 100) || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA DE TABLA PARA OTROS SECTORES */
        <div className="bg-[#1a1c23] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/20 border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Producto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Plan ({selectedShift})</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Producido ({SECTOR_UNITS[selectedSector]})</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Diferencia</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {production
                  .filter(p => p.sector === selectedSector)
                  .map((row) => {
                  const difference = calculateDifference(row.produced, row.planned);
                  const status = calculateStatus(difference);

                  return (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-white uppercase tracking-tight">{row.product}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-gray-500">
                          {formatNumber(row.planned, 1)} {SECTOR_UNITS[selectedSector].toUpperCase()}
                        </span>
                      </td>
                      <td className="px-8 py-6 max-w-[200px]">
                        <NumericInput
                          value={row.produced}
                          onChange={(val) => updateProduced(row.id, val)}
                          disabled={dayStatus === 'closed' || !hasEditPermission}
                          className="w-full px-4 py-3 text-lg font-black text-right bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-30 shadow-inner"
                        />
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-lg font-black ${
                          difference > 0 ? 'text-emerald-400' : difference < 0 ? 'text-rose-400' : 'text-gray-600'
                        }`}>
                          {difference >= 0 ? '+' : ''}{formatNumber(difference, 1)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${
                          status === 'Adelanto' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
                          status === 'Atraso' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
