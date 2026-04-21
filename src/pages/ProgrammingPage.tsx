import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Programming, SECTOR_PRODUCTS, SECTORS, SHIFT_TYPES, Sector, ShiftType } from '../types';
import { Calendar, Copy, Save, RefreshCw, Plus, Trash2, TrendingUp, Pencil, Check, Package, FileText, ClipboardList, X } from 'lucide-react';
import { CalendarDropdown } from '../components/CalendarDropdown';

export function ProgrammingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(SHIFT_TYPES[0]);
  const [programming, setProgramming] = useState<Programming[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [machineNames, setMachineNames] = useState<string[]>([]);
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [tempMachineName, setTempMachineName] = useState('');
  const [showExcelPanel, setShowExcelPanel] = useState(false);
  const [excelPasteData, setExcelPasteData] = useState<string>('');
  const [excelComparison, setExcelComparison] = useState<Record<string, number>>({});
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; machineName: string | null }>({
    machineName: null,
  });
  const [converterResults, setConverterResults] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadConverterData = () => {
      const saved = localStorage.getItem('converter_results');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const map: Record<string, number> = {};
          parsed.forEach((row: any) => {
            const key = (row.product || row.gusto || '').trim();
            if (key) {
              map[key] = row.armarBand;
            }
          });
          setConverterResults(map);
        } catch (e) {
          console.error('Error parsing converter results:', e);
        }
      } else {
        setConverterResults({});
      }
    };

    loadConverterData();
    window.addEventListener('converter-updated', loadConverterData);
    window.addEventListener('focus', loadConverterData);
    
    return () => {
      window.removeEventListener('converter-updated', loadConverterData);
      window.removeEventListener('focus', loadConverterData);
    };
  }, [selectedSector, selectedShift]);

  useEffect(() => {
    if (selectedSector === 'Armado') {
      const existingMachines = Array.from(new Set(
        programming
          .filter((p: Programming) => p.sector === 'Armado' && (p.shift_type ?? 'Mañana') === selectedShift && p.machine)
          .map((p: Programming) => p.machine!)
      )).sort();
      
      if (existingMachines.length > 0) {
        setMachineNames(existingMachines);
      } else {
        setMachineNames(['MÁQUINA 1', 'MÁQUINA 2', 'MÁQUINA 3']);
      }
    }
  }, [selectedSector, selectedShift, loading]);

  useEffect(() => {
    loadProgramming();
  }, [selectedDate]);

  const buildAllDefaultRows = (date: string) => {
    const rows: Programming[] = [];
    SECTORS.forEach((sector) => {
      const products = SECTOR_PRODUCTS[sector as Sector];
      products.forEach((product) => {
        SHIFT_TYPES.forEach((shiftType) => {
          rows.push({
            id: `temp-${date}-${sector}-${product}-${shiftType}`,
            date,
            sector: sector as Sector,
            product,
            shift_type: shiftType as ShiftType,
            planned_kg: 0,
            created_at: new Date().toISOString(),
          });
        });
      });
    });
    return rows;
  };

  const programmingKey = (sector: string, product: string, shiftType: ShiftType, machine?: string) => `${sector}||${product}||${shiftType}||${machine ?? ''}`;

  const loadProgramming = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('programming') as any)
        .select('*')
        .eq('date', selectedDate)
        .order('product', { ascending: true }) as { data: any[] | null; error: any };

      if (error) throw error;
      
      const defaultRows = buildAllDefaultRows(selectedDate);
      
      if (!data || data.length === 0) {
        setProgramming(defaultRows);
        return;
      }

      const dataByKey = new Map(
        (data as any[]).map((row) => [programmingKey(row.sector, row.product, (row.shift_type ?? 'Mañana') as ShiftType, row.machine), row])
      );

      const rows = defaultRows.map((defaultRow) => {
        const key = programmingKey(defaultRow.sector, defaultRow.product, (defaultRow.shift_type ?? 'Mañana') as ShiftType, defaultRow.machine);
        const existing = dataByKey.get(key);
        return existing ?? defaultRow;
      });

      // For Armado, we might have extra rows (machines) that are not in defaultRows
      if (selectedSector === 'Armado') {
        const extraRows = (data as any[])
          .filter(row => row.sector === 'Armado' && row.machine)
          .map(row => row as Programming);
        
        // Combine keeping existing if they were already in rows (to avoid duplicates)
        const rowIds = new Set(rows.map(r => r.id));
        extraRows.forEach(extra => {
          if (!rowIds.has(extra.id)) {
            rows.push(extra);
          }
        });
      }

      setProgramming(rows as Programming[]);
    } catch (error) {
      console.error('Error loading programming:', error);
      showMessage('error', 'Error al cargar la programación');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateRow = (id: string, field: keyof Programming, value: any) => {
    setProgramming(programming.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const updateMachineName = (oldName: string, newName: string) => {
    setMachineNames(machineNames.map(m => m === oldName ? newName : m));
    setProgramming(programming.map(p => 
      (p.sector === 'Armado' && p.machine === oldName) 
        ? { ...p, machine: newName } 
        : p
    ));
  };

  const handleMachineNameSubmit = (oldName: string) => {
    if (tempMachineName.trim() && tempMachineName !== oldName) {
      updateMachineName(oldName, tempMachineName.toUpperCase());
    }
    setEditingMachine(null);
  };

  const handleExcelPaste = (text: string) => {
    setExcelPasteData(text);
    const lines = text.split('\n');
    const data: Record<string, number> = {};
    
    lines.forEach(line => {
      // Intentar procesar formatos comunes: "PRODUCTO CANTIDAD" o "PRODUCTO\tCANTIDAD"
      const parts = line.split(/[\t\s]{2,}|[\t]/);
      if (parts.length >= 2) {
        const product = parts[0].trim().toUpperCase();
        const quantity = parseFloat(parts[1].replace(',', '.').replace(/[^0-9.]/g, ''));
        if (product && !isNaN(quantity)) {
          data[product] = (data[product] || 0) + quantity;
        }
      }
    });
    setExcelComparison(data);
  };

  const saveProgramming = async () => {
    setSaving(true);
    try {
      const { error: deleteError } = await (supabase
        .from('programming') as any)
        .delete()
        .eq('date', selectedDate);

      if (deleteError) throw deleteError;

      const dataToInsert = programming
        .filter(p => p.planned_kg > 0)
        .map(p => ({
          date: selectedDate,
          sector: p.sector,
          product: p.product,
          shift_type: p.shift_type ?? 'Mañana',
          planned_kg: Number.isFinite(p.planned_kg) ? p.planned_kg : 0,
          machine: p.machine || null,
        }));

      if (dataToInsert.length > 0) {
        const { error: insertError } = await (supabase
          .from('programming') as any)
          .insert(dataToInsert);

        if (insertError) throw insertError;
      }

      showMessage('success', `Programación guardada correctamente`);
      await loadProgramming();
    } catch (error) {
      console.error('Error saving programming:', error);
      showMessage('error', 'Error al guardar la programación');
    } finally {
      setSaving(false);
    }
  };

  const copyFromPreviousDay = async () => {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const prevDateStr = previousDate.toISOString().split('T')[0];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('programming')
        .select('*')
        .eq('date', prevDateStr);

      if (error) throw error;

      if (!data || data.length === 0) {
        showMessage('error', `No hay programación del día anterior`);
        setProgramming(buildAllDefaultRows(selectedDate));
        setLoading(false);
        return;
      }

      const dataByKey = new Map(
        (data as any[]).map((row) => [programmingKey(row.sector, row.product, (row.shift_type ?? 'Mañana') as ShiftType, row.machine), row])
      );

      const copiedData = buildAllDefaultRows(selectedDate).map((row) => {
        const key = programmingKey(row.sector, row.product, (row.shift_type ?? 'Mañana') as ShiftType, row.machine);
        const existing = dataByKey.get(key);
        if (!existing) return row;

        return {
          ...row,
          planned_kg: (existing as any).planned_kg,
        };
      });

      // Special case for Armado machines that might not be in defaults
      const extraCopied = (data as any[])
        .filter(row => row.sector === 'Armado' && row.machine)
        .map(row => ({
          ...row,
          id: `temp-${selectedDate}-${row.machine}-${row.product}-${Math.random()}`,
          date: selectedDate,
          created_at: new Date().toISOString()
        }));

      setProgramming([...copiedData, ...extraCopied]);
      showMessage('success', `Copiada programación del día anterior`);
    } catch (error) {
      console.error('Error copying from previous day:', error);
      showMessage('error', 'Error al copiar del día anterior');
    } finally {
      setLoading(false);
    }
  };

  const condenseMachines = (machines: string[]) => {
    if (machines.length === 0) return 'Sin asignar';
    if (machines.length === 1) return machines[0];
    
    // Agrupar por prefijo (ej: "MAQUINA 1", "MAQUINA 2" -> "MAQUINA 1, 2")
    const groups: Record<string, string[]> = {};
    machines.forEach(m => {
      const parts = m.split(' ');
      if (parts.length > 1) {
        const prefix = parts.slice(0, -1).join(' ');
        const suffix = parts[parts.length - 1];
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(suffix);
      } else {
        if (!groups[m]) groups[m] = [''];
      }
    });

    return Object.entries(groups).map(([prefix, suffixes]) => {
      if (suffixes.length === 1 && suffixes[0] === '') return prefix;
      return `${prefix} ${suffixes.join(', ')}`;
    }).join(' | ');
  };

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'Mañana': return 'M';
      case 'Tarde': return 'T';
      case 'Noche': return 'N';
      default: return 'M';
    }
  };

  const condenseByShift = (rows: Programming[]) => {
    const byShift: Record<string, string[]> = {};
    rows.forEach(p => {
      const shift = p.shift_type ?? 'Mañana';
      if (!byShift[shift]) byShift[shift] = [];
      if (!byShift[shift].includes(p.machine!)) byShift[shift].push(p.machine!);
    });

    return Object.entries(byShift).map(([shift, machines]) => {
      return `${getShiftBadge(shift)}: ${condenseMachines(machines)}`;
    });
  };

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center h-64">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  //     </div>
  //   );
  // }

  const visibleProgramming = programming.filter(
    (row) => 
      row.sector === selectedSector && 
      (row.shift_type ?? 'Mañana') === selectedShift
  );

  // Filtros de programación para el sector Armado
  // dailyArmadoProgramming se usa para el HUD (Objetivo Diario compartido entre todos los turnos)
  const dailyArmadoProgramming = programming.filter(p => p.sector === 'Armado');
  
  // currentShiftArmado se usa para renderizar las tarjetas de máquinas del turno seleccionado
  const currentShiftArmado = dailyArmadoProgramming.filter(p => (p.shift_type ?? 'Mañana') === selectedShift);

  const totalsByProduct = dailyArmadoProgramming.reduce((acc, p) => {
    acc[p.product] = (acc[p.product] || 0) + (p.planned_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`space-y-6 ${selectedSector === 'Armado' ? '-mx-2 md:mx-0 pr-[85px] md:pr-0' : ''} relative`}>
      {loading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[1px] rounded-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
      {/* Modern Confirmation Modal with Smooth Transitions */}
      <div className={`fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${confirmModal.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-100'}`}>
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500 ${confirmModal.isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setConfirmModal({ isOpen: false, machineName: null })}
        />
        <div className={`relative bg-white dark:bg-[#1a1c23] w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-white/10 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${confirmModal.isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-12 opacity-0'}`}>
          <div className="absolute top-0 right-0 p-6">
            <button 
              onClick={() => setConfirmModal({ isOpen: false, machineName: null })}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">
              ELIMINAR {confirmModal.machineName}
            </h3>
            
            <p className="text-gray-500 dark:text-gray-400 font-bold mb-10 leading-relaxed px-4">
              ¿Estás seguro que deseas eliminar esta línea de producción? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setConfirmModal({ isOpen: false, machineName: null })}
                className="flex-1 py-4 px-6 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all border border-gray-200 dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const machineName = confirmModal.machineName;
                  if (machineName) {
                    setProgramming(programming.filter(p => p.machine !== machineName || p.sector !== 'Armado' || (p.shift_type ?? 'Mañana') !== selectedShift));
                    setMachineNames(machineNames.filter(m => m !== machineName));
                  }
                  setConfirmModal({ isOpen: false, machineName: null });
                }}
                className="flex-1 py-4 px-6 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="w-full lg:w-auto text-center lg:text-left">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300 tracking-tight">Programación Diaria</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Gestiona el plan de producción global</p>
          
          <div className="flex flex-row justify-between gap-3 mt-6 w-full lg:hidden">
             <button
                onClick={copyFromPreviousDay}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-1 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-bold shadow-lg shadow-purple-600/20"
              >
                <Copy className="w-4 h-4 flex-shrink-0" />
                <span className="text-[9px] uppercase tracking-widest text-left leading-tight">
                  <span className="block">Copiar Día</span>
                  <span className="block">Anterior</span>
                </span>
              </button>
              
              <button
                onClick={saveProgramming}
                disabled={saving || programming.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-1 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-600/30"
              >
                <Save className="w-4 h-4 flex-shrink-0" />
                <span className="text-[9px] uppercase tracking-widest text-left leading-tight">
                  <span className="block">Guardar</span>
                  <span className="block">Programación</span>
                </span>
              </button>
          </div>

          <div className="hidden lg:flex flex-col gap-3 mt-6 w-full sm:w-fit">
             <button
                onClick={copyFromPreviousDay}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-purple-600/20 w-full"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Día Anterior</span>
              </button>
              
              <button
                onClick={saveProgramming}
                disabled={saving || programming.length === 0}
                className="flex items-center justify-center space-x-2 px-8 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-600/30 text-xs uppercase tracking-widest w-full"
              >
                <Save className="w-5 h-5 flex-shrink-0" />
                <span>Guardar Programación</span>
              </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto mt-1">
          <div className="flex items-center gap-2 flex-1 lg:flex-initial">
             <button
                onClick={() => loadProgramming()}
                title="Refrescar datos"
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

            <CalendarDropdown
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl shadow-sm border animate-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col items-center gap-6">
        <div className={`${selectedSector === 'Armado' ? 'grid grid-cols-2' : 'flex flex-wrap'} md:flex md:flex-wrap gap-2 justify-center w-full max-w-[400px] md:max-w-none px-4 md:px-0`}>
          {SHIFT_TYPES.map((shift, index) => (
            <button
              key={shift}
              onClick={() => setSelectedShift(shift)}
              className={`px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                selectedShift === shift
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-500 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
              } ${selectedSector === 'Armado' && index === 2 ? 'col-span-2 md:col-span-1' : ''}`}
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
              className={`px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all ${
                selectedSector === sector
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-500 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8 pb-12">
        {(selectedSector === 'Picadillo' ? ['BATEAS', 'MATERIA PRIMA PROCESADA'] : [
          selectedSector === 'Mesa de Carnes' ? 'COCCIONES' : 
          selectedSector === 'Salsas' ? 'UNIDADES' : 
          selectedSector === 'Armado' ? 'BANDEJAS' : 
          'COCCIONES'
        ]).map((sectionTitle) => {
          const isPicadilloMP = sectionTitle === 'MATERIA PRIMA PROCESADA';
          const picadilloMPList = ['HUEVO', 'MUZZARELLA PICADA ARMADO', 'PANCETA FETEADA', 'CHEDDAR PICADO', 'BOLLOS PA', 'JAMON FETEADO', 'JAMON CUBETEADO', 'PROVOLETA PICADA', 'SARDO PICADO', 'CHEDDAR AC', 'CHEDDAR EB', 'CHEDDAR TONADITA', 'PESADO CH', 'CHERRY', 'CIRUELA', 'PESADO 4Q', 'PESADO RJ', 'BOLLOS JQ'];
          
          if (selectedSector === 'Armado') {
            return (
              <div key={sectionTitle} className="relative">
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/50 dark:bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <Plus className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Líneas de Armado</h3>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5">Distribución de carga por máquina</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">

                      <button
                        onClick={() => {
                          const nextNum = machineNames.length + 1;
                          setMachineNames([...machineNames, `MÁQUINA ${nextNum}`]);
                        }}
                        className="group flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        <span>Añadir Máquina</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-8 px-2">
                    {machineNames.map((machineName: string) => {
                      const machineRows = currentShiftArmado.filter(p => p.machine === machineName);
                      const totalBnd = machineRows.reduce((sum, r) => sum + (Number.isFinite(r.planned_kg) ? r.planned_kg : 0), 0);

                      return (
                        <div key={machineName} className="group/card">
                          <div className="h-full bg-white dark:bg-[#1a1c23] rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col transition-all duration-500 hover:border-blue-500/40 relative">
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none group-hover/card:bg-blue-500/10 transition-colors duration-500"></div>
                            
                            <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50/50 dark:bg-black/20 border-b dark:border-white/10 flex justify-between items-center relative z-10">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] flex-shrink-0"></div>
                                
                                {editingMachine === machineName ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      autoFocus
                                      value={tempMachineName}
                                      onChange={(e) => setTempMachineName(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleMachineNameSubmit(machineName)}
                                      className="bg-transparent border-none text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] focus:ring-0 p-0 w-full outline-none"
                                    />
                                    <button onClick={() => handleMachineNameSubmit(machineName)} className="text-green-500 hover:scale-110 transition-transform"><Check className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group/name cursor-pointer" onClick={() => {
                                    setEditingMachine(machineName);
                                    setTempMachineName(machineName);
                                  }}>
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">{machineName}</span>
                                    <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover/name:opacity-100 transition-all" />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setConfirmModal({ isOpen: true, machineName });
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover/card:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto max-h-[600px] scrollbar-none relative z-10">
                              {machineRows.map((row) => (
                                <div key={row.id} className="relative bg-gray-50/50 dark:bg-black/20 p-2 rounded-2xl border border-gray-100 dark:border-white/5 transition-all duration-300 hover:border-blue-500/30 group/row flex items-center gap-2">
                                  <div className="flex-[1.5] min-w-0 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 px-3 py-2 transition-all group-hover/row:border-blue-500/20 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-3.5 h-3.5 text-blue-500 opacity-50 flex-shrink-0" />
                                      <select
                                        value={row.product}
                                        onChange={(e) => updateRow(row.id, 'product', e.target.value)}
                                        className="w-full bg-transparent border-none text-[13px] font-black text-gray-900 dark:text-white p-0 focus:ring-0 cursor-pointer uppercase tracking-tight truncate"
                                      >
                                        {SECTOR_PRODUCTS.Armado.map(prod => (
                                          <option key={prod} value={prod} className="bg-white dark:bg-[#1a1c23]">{prod}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="w-32 relative group/input">
                                    <input
                                      type="number"
                                      value={row.planned_kg === 0 ? '' : row.planned_kg}
                                      onChange={(e) => updateRow(row.id, 'planned_kg', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                      placeholder="0"
                                      className="w-full pl-9 pr-3 py-2 text-xl font-black text-right bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-gray-900 dark:text-white transition-all outline-none placeholder:opacity-10 shadow-sm"
                                    />
                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2"><span className="text-[7px] font-black text-blue-500 bg-blue-500/10 px-1 py-0.5 rounded uppercase tracking-tighter">Bandejas</span></div>
                                  </div>
                                  <button onClick={() => setProgramming(programming.filter(p => p.id !== row.id))} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newRow: Programming = {
                                    id: `temp-${Date.now()}-${Math.random()}`,
                                    date: selectedDate,
                                    sector: 'Armado',
                                    product: SECTOR_PRODUCTS.Armado[0],
                                    shift_type: selectedShift,
                                    planned_kg: 0,
                                    machine: machineName,
                                    created_at: new Date().toISOString(),
                                  };
                                  setProgramming([...programming, newRow]);
                                }}
                                className="w-full py-5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[2rem] text-gray-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-2 group/addbtn mt-2"
                              >
                                <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-full group-hover/addbtn:bg-blue-500/10 transition-colors"><Plus className="w-5 h-5 transition-transform group-hover/addbtn:rotate-90 group-hover/addbtn:scale-110" /></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cargar Producto</span>
                              </button>
                            </div>
                            <div className="px-5 py-6 md:px-8 md:py-8 bg-gray-50/80 dark:bg-black/40 border-t dark:border-white/10 flex justify-between items-center relative z-10">
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Máquina</p>
                                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{totalBnd} <span className="text-xs text-blue-500 uppercase">bandejas</span></p>
                              </div>
                              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20"><TrendingUp className="w-6 h-6 text-white" /></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`fixed ${isScrolled ? 'top-0' : 'top-[64px]'} bottom-0 right-0 z-40 transform transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${showExcelPanel ? 'translate-x-0 w-full md:w-[450px]' : 'translate-x-[calc(100%-85px)] md:translate-x-[calc(100%-150px)] w-[85px] md:w-[150px]'}`}>
                  {!showExcelPanel && (
                    <button onClick={() => setShowExcelPanel(true)} className="absolute inset-y-0 left-0 w-full flex flex-col bg-blue-600 dark:bg-[#1a1c23] backdrop-blur-md transition-colors cursor-pointer group/peek border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.5)]">
                      <div className="p-3 md:p-5 bg-blue-700/50 w-full flex items-center justify-center md:justify-between border-b border-white/10">
                        <ClipboardList className="w-6 h-6 text-white flex-shrink-0" />
                        <span className="hidden md:block text-xs font-black text-white uppercase tracking-widest">Objetivo Diario</span>
                      </div>
                      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden px-1 md:px-4 pt-1 pb-8 md:py-8 space-y-3 md:space-y-5 scrollbar-none text-left">
                        {Object.entries(excelComparison).map(([product, target]) => {
                          const programmed = totalsByProduct[product] || 0;
                          const diff = programmed - target;
                          
                          // Obtener filas de programación para este producto
                          const productRows = dailyArmadoProgramming
                            .filter(p => p.product === product && p.planned_kg > 0 && p.machine);
                          
                          const isUnassigned = productRows.length === 0;
                          const isOK = diff === 0;
                          const isAhead = diff > 0;
                          const isDelayed = diff < 0 && !isUnassigned;

                          let cardClass = "bg-white/10 border-white/20";
                          let badgeClass = "bg-blue-600 shadow-blue-600/20 border-blue-400/20";
                          let diffClass = "bg-red-500 shadow-red-300/30";

                          if (isUnassigned) {
                            cardClass = "bg-gray-500/10 border-gray-500/30 opacity-70";
                            badgeClass = "bg-gray-500/40 border-white/10";
                            diffClass = "bg-gray-700 text-white/40";
                          } else if (isOK) {
                            cardClass = "bg-emerald-500/20 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)]";
                            badgeClass = "bg-emerald-600 border-emerald-400/30 shadow-emerald-600/20";
                            diffClass = "bg-emerald-500";
                          } else if (isAhead) {
                            cardClass = "bg-orange-500/20 border-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.1)]";
                            badgeClass = "bg-orange-600 border-orange-400/30 shadow-orange-600/20";
                            diffClass = "bg-orange-500";
                          } else if (isDelayed) {
                            cardClass = "bg-red-500/20 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.1)]";
                            badgeClass = "bg-red-600 border-red-400/30 shadow-red-600/20";
                            diffClass = "bg-red-500";
                          }

                          return (
                            <div key={product} className={`w-full rounded-xl md:rounded-[1.5rem] p-2 md:p-5 border transition-all duration-500 relative ${cardClass} mt-2 md:mt-4 shadow-lg shadow-black/20`}>
                              <div className="flex flex-col items-center justify-center w-full px-1 mb-2 gap-0.5">
                                {isUnassigned ? (
                                  <span className="text-[7px] font-black text-white/40 px-2 py-0.5 rounded-md uppercase border border-white/5 bg-white/5 tracking-widest text-center">Sin asignar</span>
                                ) : (
                                  condenseByShift(productRows).map((line, idx) => (
                                    <span key={idx} className={`text-[7px] font-black text-white px-2 py-0.5 rounded-md uppercase shadow-lg border text-center whitespace-nowrap overflow-hidden w-full ${badgeClass}`}>
                                      {line}
                                    </span>
                                  ))
                                )}
                              </div>
                                <div className="flex justify-between items-start mb-2 md:mb-3 pt-1">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1 md:gap-3">
                                      <span className={`text-[11px] md:text-sm font-black uppercase tracking-tight truncate max-w-[40px] md:max-w-[80px] ${isOK ? 'text-emerald-400' : 'text-white'}`}>{product}</span>
                                      {isOK && <Check className="w-3 md:w-5 h-3 md:h-5 text-emerald-400 shrink-0" />}
                                    </div>
                                  </div>
                                  <div className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg text-[9px] md:text-[10px] font-black shadow-lg text-white ${diffClass}`}>{isOK ? 'OK' : (diff > 0 ? '+' : '') + diff}</div>
                                </div>
                               <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                 <div className="flex flex-col shrink-0"><span className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-0.5 md:mb-1">PLAN</span><span className="text-[11px] md:text-sm font-black text-white leading-none">{target}</span></div>
                                 <div className="hidden md:block w-px h-6 bg-white/10"></div>
                                 <div className={`flex flex-col shrink-0 ${isOK ? 'text-emerald-400' : 'text-blue-400'}`}><span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none mb-0.5 md:mb-1">CARG.</span><span className="text-[11px] md:text-sm font-black text-white leading-none">{programmed}</span></div>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-3 md:p-6 bg-black/40 border-t border-white/20">
                        <div className="flex flex-col gap-4 md:gap-6">
                          <div className="flex flex-col items-center text-center"><span className="text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5 md:mb-1">Meta</span><span className="text-xl md:text-3xl font-black text-white tracking-tighter shadow-sm">{Object.values(excelComparison).reduce((a, b) => a + b, 0)}</span></div>
                          <div className="flex flex-col items-center text-center">
                            <span className="text-[9px] md:text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 md:mb-2">Diff</span>
                            <div className={`w-full py-1.5 md:py-3 rounded-xl md:rounded-2xl text-lg md:text-2xl font-black shadow-2xl border-2 flex items-center justify-center ${
                              (Object.values(totalsByProduct).reduce((a, b) => a + b, 0) - Object.values(excelComparison).reduce((a, b) => a + b, 0)) >= 0 
                              ? 'bg-teal-500 border-teal-300 text-white shadow-teal-500/10' : 'bg-red-500 border-red-400 text-white shadow-red-500/20'
                            }`}>
                              {Object.values(totalsByProduct).reduce((a, b) => a + b, 0) - Object.values(excelComparison).reduce((a, b) => a + b, 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  <div className={`h-full bg-white dark:bg-[#1a1c23] border-l border-gray-200 dark:border-white/10 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.2)] ${!showExcelPanel ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="px-4 md:px-8 py-3 md:py-5 bg-blue-600 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setShowExcelPanel(false)} className="md:cursor-default p-1 md:p-0 rounded-xl md:rounded-none hover:bg-white/20 md:hover:bg-transparent transition-all" title="Cerrar panel">
                          <ClipboardList className="w-6 h-6 text-white" />
                        </button>
                        <div><h4 className="text-base font-black text-white uppercase tracking-wider">Objetivo Diario</h4><p className="text-[10px] font-bold text-blue-100 uppercase opacity-70 tracking-widest">Referencia de Carga</p></div>
                      </div>
                      <button onClick={() => { setExcelPasteData(''); setExcelComparison({}); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all hover:rotate-90" title="Limpiar datos"><Trash2 className="w-5 h-5 text-white" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-none">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2"><h5 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Área de Pegado</h5><span className="text-[9px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Control-V para pegar</span></div>
                        <textarea value={excelPasteData} onChange={(e) => handleExcelPaste(e.target.value)} placeholder="Ejemplo: PRODUCTO 1500" className="w-full h-40 p-6 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[2.5rem] text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none shadow-inner" />
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2"><h5 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Comparativa de Carga</h5></div>
                        <div className="space-y-3">
                          {Object.keys(excelComparison).length === 0 ? (
                            <div className="py-20 text-center bg-gray-50/50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10"><p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-[0.2em]">No hay datos cargados</p></div>
                          ) : (
                            Object.entries(excelComparison).map(([product, target]) => {
                               const programmed = totalsByProduct[product] || 0;
                               const diff = programmed - target;
                               
                               const productRows = dailyArmadoProgramming
                                 .filter(p => p.product === product && p.planned_kg > 0 && p.machine);
                               
                               const isUnassigned = productRows.length === 0;
                               const isOK = diff === 0;
                               const isAhead = diff > 0;
                               const isDelayed = diff < 0 && !isUnassigned;

                               let cardClass = "bg-[#1a1c23]/90 border-white/5";
                               let glowColor = "bg-blue-500";
                               let diffClass = "bg-red-500 border-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.4)]";
                               let progBarClass = "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]";

                               if (isUnassigned) {
                                 cardClass = "bg-white/[0.02] border-white/5 opacity-60";
                                 glowColor = "bg-gray-500";
                                 diffClass = "bg-gray-700 border-gray-600 text-white/40";
                                 progBarClass = "bg-gray-600";
                               } else if (isOK) {
                                 cardClass = "bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]";
                                 glowColor = "bg-emerald-400";
                                 diffClass = "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                                 progBarClass = "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]";
                               } else if (isAhead) {
                                 cardClass = "bg-gradient-to-br from-orange-500/10 to-orange-500/[0.02] border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.1)]";
                                 glowColor = "bg-orange-400";
                                 diffClass = "bg-orange-500/10 border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]";
                                 progBarClass = "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]";
                               }

                               return (
                                <div key={product} className={`group/comp relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 ${cardClass}`}>
                                  <div className={`absolute -top-10 -right-10 w-40 h-40 blur-[80px] opacity-10 transition-opacity duration-700 group-hover/comp:opacity-20 ${glowColor}`}></div>
                                  <div className="relative z-10 flex flex-col gap-8">
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] leading-none">CÓDIGO</p>
                                          <div className="flex items-center gap-4">
                                            <p className="text-3xl font-black text-white tracking-tighter leading-none uppercase">{product}</p>
                                            {isOK && <Check className="w-5 h-5 text-emerald-500" />}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {productRows.length > 0 ? (
                                            <div className="flex flex-col gap-1.5">
                                              {condenseByShift(productRows).map((line, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 group-hover/comp:border-white/10 transition-all">
                                                  <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                                                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">
                                                    {line}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20"><span className="text-[9px] font-black text-red-500/60 uppercase tracking-widest">Sin asignar</span></div>
                                          )}
                                        </div>
                                      </div>
                                      <div className={`px-5 py-2 rounded-2xl text-base font-black border-2 transition-transform group-hover/comp:scale-105 ${diffClass}`}>
                                        {isOK ? 'LISTO' : (diff > 0 ? '+' : '') + diff}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-px bg-white/10 rounded-[2rem] overflow-hidden border border-white/10">
                                      <div className="bg-white/[0.03] p-6 transition-colors group-hover/comp:bg-white/[0.06]"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">PLAN</span><span className="text-3xl font-black text-white leading-none tracking-tight">{target}</span></div>
                                      <div className={`p-6 transition-all ${isOK ? 'bg-emerald-500/10' : 'bg-white/[0.03]'}`}><span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isOK ? 'text-emerald-400' : 'text-blue-400'}`}>CARGADO</span><span className="text-3xl font-black text-white leading-none tracking-tight">{programmed}</span></div>
                                    </div>
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-end px-1"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</span><span className={`text-sm font-black ${isOK ? 'text-emerald-400' : 'text-white/40'}`}>{Math.round((programmed / target) * 100)}%</span></div>
                                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-[3px] border border-white/5"><div className={`h-full rounded-full transition-all duration-1000 ease-in-out ${progBarClass}`} style={{ width: `${Math.min(100, (programmed / target) * 100)}%` }} /></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-50 dark:bg-black/20 border-t dark:border-white/10">
                        <div className="flex justify-between items-center mb-4"><p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Balance General</p><span className="px-3 py-1 bg-blue-500 text-[10px] font-black text-white rounded-full uppercase tracking-widest">OK</span></div>
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                          <div className="p-3 md:p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">Programado</p><p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{Object.values(totalsByProduct).reduce((a, b) => a + b, 0)}</p></div>
                          <div className="p-3 md:p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Total Objetivo</p><p className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{Object.values(excelComparison).reduce((a, b) => a + b, 0)}</p></div>
                        </div>
                    </div>
                  </div>
                </div>

                {showExcelPanel && <div className="fixed inset-0 bg-black/5 z-30 transition-opacity duration-500" onClick={() => setShowExcelPanel(false)} />}
              </div>
            );
          }

          const COCINA_ONLY = ['PC', 'MT', 'MPP'];
          const PICADILLO_ONLY = ['JQ', 'JH', 'CH', 'RJ', '4Q', 'PA'];
          const BOTH_SECTORS = ['EB', 'BB', 'CS', 'CP', 'CA', 'CC', 'PO', 'AC', 'VP', 'QC', 'CZ', 'V'];

          let filteredRows = visibleProgramming;
          if (selectedSector === 'Cocina') {
            filteredRows = visibleProgramming.filter(p => {
              const prod = p.product.trim().toUpperCase();
              return COCINA_ONLY.includes(prod) || BOTH_SECTORS.includes(prod);
            });
          } else if (selectedSector === 'Picadillo') {
            if (isPicadilloMP) {
              filteredRows = visibleProgramming.filter(p => picadilloMPList.includes(p.product));
            } else {
              filteredRows = visibleProgramming.filter(p => {
                const prod = p.product.trim().toUpperCase();
                return PICADILLO_ONLY.includes(prod) || BOTH_SECTORS.includes(prod);
              });
            }
          }

          const isModernSector = ['Mesa de Carnes', 'Cocina', 'Picadillo', 'Salsas'].includes(selectedSector);

          if (isModernSector) {
            const sectorThemes: Record<string, { color: string, ring: string, bullet: string }> = {
              'Cocina': { color: 'text-blue-500', ring: 'focus:border-blue-500/50', bullet: 'bg-blue-500' },
              'Picadillo': { color: 'text-amber-500', ring: 'focus:border-amber-500/50', bullet: 'bg-amber-500' },
              'Mesa de Carnes': { color: 'text-rose-500', ring: 'focus:border-rose-500/50', bullet: 'bg-rose-500' },
              'Salsas': { color: 'text-emerald-500', ring: 'focus:border-emerald-500/50', bullet: 'bg-emerald-500' },
            };
            const theme = sectorThemes[selectedSector] || sectorThemes['Cocina'];

            return (
              <div key={sectionTitle} className="max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-12">
                <div className="flex items-center justify-between mb-8 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-6 rounded-full ${theme.bullet}`}></div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{sectionTitle}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-white/10 px-3 py-1 rounded-full">PLANIFICACIÓN DIARIA</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 px-2 sm:px-0">
                  {filteredRows.map((row) => {
                    const refValue = converterResults[row.product.trim()];
                    const hasRef = refValue !== undefined;
                    const formattedRef = hasRef 
                      ? (refValue % 1 !== 0 ? refValue.toString().replace('.', ',') : refValue)
                      : '0';

                    return (
                      <div key={row.id} className="group flex items-center justify-between bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.08] p-4 sm:p-5 transition-all duration-300 border border-gray-100 dark:border-white/5 rounded-3xl shadow-sm hover:shadow-xl">
                        {/* Left: Product Info */}
                        <div className="flex items-center gap-4 sm:gap-6">
                           <div className="flex flex-col min-w-[70px] sm:min-w-[90px]">
                            <p className="text-[9px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-0.5">{row.shift_type || 'MAÑANA'}</p>
                            <h4 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">{row.product}</h4>
                          </div>
                        </div>

                        {/* Right: Data & Input unit - Tightened */}
                        <div className="flex items-center gap-5 sm:gap-8">
                          {/* Reference Block */}
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-widest mb-0.5 whitespace-nowrap">Ref. Armar</span>
                            <span className="text-lg font-black text-blue-500 dark:text-blue-400 leading-none">{formattedRef}</span>
                          </div>

                          {/* Mini Input Box */}
                          <div className="relative flex flex-col items-end">
                             <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 px-1">PLANIFICADO</span>
                             <input 
                              type="number" 
                              value={row.planned_kg === 0 ? '' : row.planned_kg} 
                              onChange={(e) => updateRow(row.id, 'planned_kg', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                              min="0" 
                              step="0.1" 
                              placeholder="0" 
                              className={`w-24 sm:w-32 bg-gray-100/50 dark:bg-black/40 border-2 border-transparent ${theme.ring} px-2 py-2 text-xl sm:text-2xl font-black text-gray-900 dark:text-white text-right focus:bg-white dark:focus:bg-black transition-all outline-none rounded-xl`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (filteredRows.length === 0) return null;

          return (
            <div key={sectionTitle} className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300">
              <h3 className="px-8 py-5 text-xs font-black bg-gray-50 dark:bg-black/20 text-gray-400 border-b dark:border-white/10 text-center uppercase tracking-[0.3em]">{sectionTitle}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-black/10 border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-3 sm:px-8 py-4 text-left text-[9px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest w-[40%] sm:w-1/3">Producto</th>
                      <th className="px-1 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest w-[20%] sm:w-40">Turno</th>
                      <th className="px-3 sm:px-8 py-4 text-right text-[9px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest">Planificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-3 sm:px-8 py-3 sm:py-4"><span className="text-[11px] sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors uppercase tracking-tight">{row.product}</span></td>
                        <td className="px-1 sm:px-8 py-3 sm:py-4 text-center"><span className="inline-flex px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 uppercase tracking-widest">{row.shift_type ?? 'Mañana'}</span></td>
                        <td className="px-3 sm:px-8 py-3 sm:py-4 text-right">
                          <div className="flex items-center justify-end gap-6 sm:gap-12">
                            <div className="text-right">
                               <p className="text-[8px] sm:text-[10px] font-black text-blue-500/40 uppercase tracking-widest leading-none mb-1 text-center">Bnd. Armar</p>
                               <p className="text-sm sm:text-xl font-black text-blue-600 dark:text-blue-400 leading-none text-center">
                                 {converterResults[row.product.trim()] !== undefined 
                                   ? (converterResults[row.product.trim()] % 1 !== 0 
                                       ? converterResults[row.product.trim()].toString().replace('.', ',') 
                                       : converterResults[row.product.trim()])
                                   : '-'}
                               </p>
                            </div>
                            <input 
                              type="number" 
                              value={row.planned_kg === 0 ? '' : row.planned_kg} 
                              onChange={(e) => updateRow(row.id, 'planned_kg', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                              min="0" 
                              step="0.1" 
                              placeholder="0" 
                              className="w-24 sm:w-36 inline-block px-4 sm:px-6 py-2 sm:py-3 text-lg sm:text-2xl font-black text-right bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner" 
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
