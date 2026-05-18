import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Clipboard, 
  Trash2,
  Info,
  CheckCircle2,
  ArrowUpRight,
  Calculator,
  Layers,
  Container,
  Activity,
  Lock,
  Eye,
  ArrowDown
} from 'lucide-react';
import { NumericInput } from '../components/NumericInput';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';

interface ParsedRow {
  gusto: string;
  programacion: number;
  stockBandejas: number;
  armarBand: number;
  stockBateas: number;
  bateasPArmar: number;
  coccion: number;
  carnes: string;
  // Nuevos campos de configuración
  bateasConfig: number;
  bandejasConfig: number;
  coccionesConfig: number;
  bateas2Config: number;
  // Field to store original calculation from Excel for recalculation
  theoreticalBateas?: number;
}

const PRODUCT_EQUIVALENCIES: Record<string, { bandejas: number, cocciones: number, bateas: number, rec: string }> = {
  'CP': { bandejas: 7, cocciones: 1, bateas: 10, rec: '120' },
  'EB': { bandejas: 7, cocciones: 1, bateas: 4, rec: '100' },
  'AC': { bandejas: 9, cocciones: 1, bateas: 2, rec: '20' },
  'BB': { bandejas: 6.5, cocciones: 1, bateas: 4, rec: '100' },
  'MPP': { bandejas: 8, cocciones: 1, bateas: 8, rec: '100' },
  'CC': { bandejas: 7.5, cocciones: 1, bateas: 5, rec: '120' },
  'CA': { bandejas: 8.5, cocciones: 1, bateas: 5, rec: '120' },
  'CS': { bandejas: 7, cocciones: 1, bateas: 5, rec: '120' },
  'PO': { bandejas: 7, cocciones: 1, bateas: 6, rec: '75' },
  'PA': { bandejas: 13, cocciones: 0, bateas: 1, rec: '' },
  'PC': { bandejas: 6.7, cocciones: 1, bateas: 6, rec: '65' },
  'JQ': { bandejas: 10, cocciones: 0, bateas: 1, rec: '' },
  'VP': { bandejas: 8.5, cocciones: 1, bateas: 5.5, rec: '120' },
  'MT': { bandejas: 7.3, cocciones: 1, bateas: 4, rec: '120' },
  'QC': { bandejas: 9, cocciones: 1, bateas: 4, rec: '' },
  'RJ': { bandejas: 9, cocciones: 0, bateas: 1, rec: '' },
  'CH': { bandejas: 8, cocciones: 0, bateas: 8, rec: '' },
  'V': { bandejas: 10.5, cocciones: 0, bateas: 4, rec: '' },
  'JH': { bandejas: 9.5, cocciones: 0, bateas: 1, rec: '' },
  '4Q': { bandejas: 8.5, cocciones: 0, bateas: 1, rec: '' },
  'CZ': { bandejas: 9.5, cocciones: 1, bateas: 4, rec: '' },
};

export function ConversorPage() {
  const [data, setData] = useState('');
  const { role } = useAuth();
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const isAdmin = role === 'admin';
  const canEdit = isAdmin || role === 'planner';
  const [isProcessing, setIsProcessing] = useState(false);
  const [equivalencies, setEquivalencies] = useState(PRODUCT_EQUIVALENCIES);

  useEffect(() => {
    const loadConfig = () => {
      const saved = localStorage.getItem('mes_config_equivalencies');
      if (saved) {
        setEquivalencies(JSON.parse(saved));
      } else {
        setEquivalencies(PRODUCT_EQUIVALENCIES);
      }
    };

    loadConfig();
    window.addEventListener('config-updated', loadConfig);
    return () => window.removeEventListener('config-updated', loadConfig);
  }, []);

  useEffect(() => {
    const loadPasteFromStorage = () => {
      const saved = localStorage.getItem('converter_paste');
      if (saved !== null) setData(saved);
    };
    loadPasteFromStorage();
    window.addEventListener('daily-context-loaded', loadPasteFromStorage);
    return () => window.removeEventListener('daily-context-loaded', loadPasteFromStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem('converter_paste', data);
  }, [data]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (data.trim()) {
        const lines = data.trim().split('\n');
        const results: ParsedRow[] = [];

        const parseNum = (str: string) => {
          if (!str) return 0;
          return parseFloat(str.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        };

        const evaluateSum = (val: string) => {
          if (!val) return '';
          if (val.includes('+')) {
            const sum = val.split('+').reduce((acc, part) => {
              const num = parseFloat(part.trim().replace(',', '.')) || 0;
              return acc + num;
            }, 0);
            return sum.toString();
          }
          return val;
        };

        lines.forEach(line => {
          const parts = line.split(/\t/).map(p => p.trim());
          if (parts.length < 2 || parts[0].toUpperCase() === 'GUSTOS' || parts[0].toUpperCase() === 'TOTAL' || parts[0].toUpperCase() === 'PROGRAMACION') return;

          const programacion = parseNum(parts[1]);
          const stockBandejas = parseNum(parts[2]);
          const stockBateas = parseNum(parts[4]);
          
          const gusto = parts[0];
          const equiv = (equivalencies as any)[gusto.toUpperCase()];
          
          const bateasConfig = parseNum(parts[8]) || 1;
          const bandejasConfig = equiv ? (equiv.bandejas || parseNum(parts[9])) : (parseNum(parts[9]) || 1);
          const coccionesConfig = equiv ? (equiv.cocciones || parseNum(parts[10])) : parseNum(parts[10]);
          const bateas2Config = equiv ? (equiv.bateas || parseNum(parts[11])) : (parseNum(parts[11]) || 1);
          
          const armarBand = programacion - stockBandejas;
          const bateasPArmar = (armarBand / bandejasConfig) - stockBateas;
          
          results.push({
            gusto,
            programacion,
            stockBandejas,
            armarBand,
            stockBateas,
            bateasPArmar,
            theoreticalBateas: bateasPArmar + stockBateas,
            coccion: bateasPArmar / bateas2Config,
            carnes: evaluateSum(parts[7] || (equiv ? equiv.rec : '')),
            bateasConfig,
            bandejasConfig,
            coccionesConfig,
            bateas2Config,
          });
        });

        setParsedData(results);
      } else {
        setParsedData([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [data]);

  useEffect(() => {
    if (parsedData.length > 0) {
      localStorage.setItem('converter_results', JSON.stringify(parsedData));
      window.dispatchEvent(new CustomEvent('converter-updated'));
    } else {
      localStorage.removeItem('converter_results');
      window.dispatchEvent(new CustomEvent('converter-updated'));
    }
  }, [parsedData]);

  const updateStockBandejas = (index: number, val: string) => {
    updateField(index, 'stockBandejas', val);
  };

  const handlePaste = (e: React.ClipboardEvent, startIndex: number, type: 'bandejas' | 'bateas' | 'carnes') => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.includes('\n')) return; // Seguir comportamiento normal si no es una columna

    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).map(row => row.trim()).filter(row => row !== '');
    const newData = [...parsedData];

    rows.forEach((value, i) => {
      const targetIndex = startIndex + i;
      if (targetIndex >= newData.length) return;

      const row = newData[targetIndex];

      if (type === 'bandejas') {
        const numericVal = parseFloat(value.replace(',', '.')) || 0;
        const updatedArmarBand = row.programacion - numericVal;
        const updatedBateasPArmar = (updatedArmarBand / (row.bandejasConfig || 1)) - row.stockBateas;
        newData[targetIndex] = {
          ...row,
          stockBandejas: numericVal,
          armarBand: updatedArmarBand,
          bateasPArmar: updatedBateasPArmar,
          coccion: updatedBateasPArmar / (row.bateas2Config || 1)
        };
      } else if (type === 'bateas') {
        const numericVal = parseFloat(value.replace(',', '.')) || 0;
        const updatedBateasPArmar = (row.armarBand / (row.bandejasConfig || 1)) - numericVal;
        newData[targetIndex] = {
          ...row,
          stockBateas: numericVal,
          bateasPArmar: updatedBateasPArmar,
          coccion: updatedBateasPArmar / (row.bateas2Config || 1)
        };
      } else if (type === 'carnes') {
        const evaluateSum = (val: string) => {
          if (!val) return '';
          if (val.includes('+')) {
            const sum = val.split('+').reduce((acc, part) => {
              const num = parseFloat(part.trim().replace(',', '.')) || 0;
              return acc + num;
            }, 0);
            return sum.toString();
          }
          return val;
        };
        newData[targetIndex] = {
          ...row,
          carnes: evaluateSum(value)
        };
      }
    });

    setParsedData(newData);
  };

  const updateCarnes = (index: number, val: string) => {
    const newData = [...parsedData];
    
    // Si contiene un '+' y el último carácter no es '+', evaluamos la suma
    // Esto permite que el usuario termine de escribir la expresión antes de sumarla
    let processedVal = val;
    if (val.includes('+') && !val.trim().endsWith('+')) {
      const sum = val.split('+').reduce((acc, part) => {
        const num = parseFloat(part.trim().replace(',', '.')) || 0;
        return acc + num;
      }, 0);
      processedVal = sum.toString();
    }

    newData[index] = {
      ...newData[index],
      carnes: processedVal
    };
    setParsedData(newData);
  };

  const updateStockBateas = (index: number, val: string) => {
    updateField(index, 'stockBateas', val);
  };

  const updateField = (index: number, field: keyof ParsedRow, val: string | number) => {
    const newData = [...parsedData];
    const row = { ...newData[index] };
    
    if (typeof val === 'string' && field !== 'gusto' && field !== 'carnes') {
      (row as any)[field] = parseFloat(val.replace(',', '.')) || 0;
    } else {
      (row as any)[field] = val;
    }

    // Recalcular dependientes
    const armarBand = row.programacion - row.stockBandejas;
    const bateasPArmar = (armarBand / (row.bandejasConfig || 1)) - row.stockBateas;
    
    newData[index] = {
      ...row,
      armarBand,
      bateasPArmar,
      coccion: bateasPArmar / (row.bateas2Config || 1)
    };
    setParsedData(newData);
  };

  const totalProgramacion = parsedData.reduce((acc, row) => acc + row.programacion, 0);
  const totalStockBandejas = parsedData.reduce((acc, row) => acc + row.stockBandejas, 0);
  const totalStockBateas = parsedData.reduce((acc, row) => acc + row.stockBateas, 0);
  const totalArmarBand = parsedData.reduce((acc, row) => acc + row.armarBand, 0);
  const totalBateasPArmar = parsedData.reduce((acc, row) => acc + row.bateasPArmar, 0);
  const totalCoccion = parsedData.reduce((acc, row) => acc + row.coccion, 0);
  
  // Totales para columnas azules (configuración)
  const totalCoccionesConfig = parsedData.reduce((acc, row) => acc + (row.coccionesConfig || 0), 0);
  const totalBateas2Config = parsedData.reduce((acc, row) => acc + (row.bateas2Config || 0), 0);
  const totalCarnesConfig = parsedData.reduce((acc, row) => {
    const val = typeof row.carnes === 'string' ? parseFloat(row.carnes.replace(',', '.')) || 0 : row.carnes || 0;
    return acc + val;
  }, 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentInput = e.target as HTMLInputElement;
      const currentCell = currentInput.closest('td');
      const currentRow = currentInput.closest('tr');
      if (!currentCell || !currentRow) return;

      const cellIndex = Array.from(currentRow.cells).indexOf(currentCell);
      const nextRow = currentRow.nextElementSibling as HTMLTableRowElement;
      
      if (nextRow && nextRow.cells[cellIndex]) {
        const nextInput = nextRow.cells[cellIndex].querySelector('input');
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const parseCarnesValue = (val: string) => {
    if (!val) return 0;
    if (val.includes('+')) {
      return val.split('+').reduce((acc, part) => acc + (parseFloat(part.trim()) || 0), 0);
    }
    return parseFloat(val.replace(',', '.')) || 0;
  };

  const calculateFinalCarnes = (row: ParsedRow) => {
    const unitCarnes = parseCarnesValue(row.carnes);
    // Solo calcular si la cocción es positiva
    if (row.coccion <= 0 || unitCarnes === 0) return 0;
    return row.coccion * unitCarnes;
  };

  const totalFinalCarnes = parsedData.reduce((acc, row) => acc + calculateFinalCarnes(row), 0);
  
  const chartData = parsedData.slice(0, 15); // Show top 15 for better chart visibility
  
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-24 -top-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full group-hover:bg-blue-500/10 transition-colors duration-700"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Calculator className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Conversor de Datos</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] leading-none">Análisis inteligente de planillas excel</p>
        </div>
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button 
            disabled={!data || !canEdit}
            onClick={() => {
              setData('');
              setParsedData([]);
              localStorage.removeItem('converter_paste');
              localStorage.removeItem('converter_results');
              window.dispatchEvent(new CustomEvent('converter-updated'));
            }}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-8 py-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar Datos</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Area */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#1a1c23] p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl shadow-gray-200/50 dark:shadow-none h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20">
                  <Clipboard className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Área de Pegado</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pega tu Excel aquí</p>
                </div>
              </div>
              {!canEdit && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Sólo Lectura</span>
                </div>
              )}
            </div>

            <div className="flex-1 relative group/textarea">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-0 group-hover/textarea:opacity-5 transition-opacity duration-700 rounded-[2rem] pointer-events-none"></div>
              <textarea
                value={data}
                onChange={(e) => canEdit && setData(e.target.value)}
                placeholder={canEdit ? "Copie los datos desde su Excel y péguelos aquí..." : "No tienes permisos para cargar datos aquí."}
                disabled={!canEdit}
                className="w-full h-full min-h-[400px] p-8 bg-gray-50/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[2rem] text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none shadow-inner scrollbar-none placeholder:opacity-40 disabled:cursor-not-allowed"
              />
              {!data && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                  <FileSpreadsheet className="w-20 h-20 mb-4" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Esperando datos...</p>
                </div>
              )}
            </div>

            <div className="mt-8 p-6 bg-blue-500/5 rounded-[1.5rem] border border-blue-500/10 flex items-start gap-4">
               <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
               <p className="text-[11px] font-bold text-blue-600/70 dark:text-blue-400/70 leading-relaxed uppercase tracking-tight">
                 Para mejores resultados, asegúrese de copiar las columnas de <strong>Producto</strong> y <strong>Cantidad</strong> consecutivamente desde su hoja de cálculo.
               </p>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-7 space-y-8">
           {/* KPI Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Programado', value: totalProgramacion.toLocaleString(), icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Stock Bandejas', value: totalStockBandejas.toLocaleString(), icon: Container, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Stock Bateas', value: totalStockBateas.toLocaleString(), icon: Layers, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'A Armar (Total)', value: totalArmarBand.toLocaleString(), icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1a1c23] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-500 group">
                  <div className={`p-3 ${kpi.bg} rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform duration-500`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{kpi.value}</p>
                </div>
              ))}
           </div>

           {/* Charts Section */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-[#1a1c23] p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl relative overflow-hidden h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Plan vs Real</h3>
                  </div>
                </div>
                {parsedData.length > 0 ? (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis dataKey="gusto" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1c23', border: 'none', borderRadius: '16px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="programacion" name="Prog." fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="armarBand" name="Armar" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[320px] flex flex-col items-center justify-center opacity-10">
                    <BarChart3 className="w-24 h-24 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Esperando Datos</p>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#1a1c23] p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl relative overflow-hidden h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <PieChartIcon className="w-5 h-5 text-amber-500" />
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Mix de Producción</h3>
                  </div>
                </div>
                {parsedData.length > 0 ? (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="programacion"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={[
                              '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                            ][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[320px] flex flex-col items-center justify-center opacity-10">
                    <PieChartIcon className="w-24 h-24 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Esperando Datos</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Table Summary - Moved outside to take full width */}
      <div className="bg-white dark:bg-[#1a1c23] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl">
             <div className="px-8 py-6 bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                   <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Desglose Detallado</h3>
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {parsedData.length} ítems procesados
                </div>
             </div>
              <div className="max-h-[80vh] overflow-auto">
                <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                  <thead className="text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-30">
                    <tr>
                      <th className="px-3 py-3 border border-white/20 text-left sticky top-0 left-0 bg-[#4d7c71] z-50">GUSTOS</th>
                      <th className="px-3 py-3 border border-white/20 text-center sticky top-0 bg-[#4d7c71] z-40">PROGRAMACION</th>
                      <th className="px-3 py-3 border border-white/20 text-center text-[9px] leading-tight font-black sticky top-0 bg-[#4d7c71] z-40">STOCK<br/>BANDEJAS</th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2 sticky top-0 bg-[#4d7c71] z-40">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">Armado</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">BANDEJAS A ARMAR</span>
                      </th>
                      <th className="px-3 py-3 border border-white/20 text-center text-[9px] leading-tight font-black sticky top-0 bg-[#4d7c71] z-40">STOCK<br/>BATEAS</th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2 sticky top-0 bg-[#4d7c71] z-40">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">Picadillo</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">BATEAS P. ARMAR</span>
                      </th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2 sticky top-0 bg-[#4d7c71] z-40">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">Cocina</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">COCCION</span>
                      </th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2 sticky top-0 bg-[#4d7c71] z-40">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">TOTAL</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">KG CARNES</span>
                      </th>
                      
                      {/* Separador visual para la segunda parte */}
                      <th className="bg-slate-600 px-3 py-3 border border-white/20 text-left sticky top-0 z-40">GUSTOS</th>
                      <th className="bg-slate-700 px-3 py-3 border border-white/20 text-center sticky top-0 z-40">BATEAS</th>
                      <th className="bg-slate-700 px-3 py-3 border border-white/20 text-center sticky top-0 z-40">BANDEJAS</th>
                      <th className="bg-blue-600 px-3 py-3 border border-white/20 text-center sticky top-0 z-40">COCCIONES</th>
                      <th className="bg-blue-600 px-3 py-3 border border-white/20 text-center sticky top-0 z-40">BATEAS</th>
                      <th className="bg-blue-600 px-3 py-3 border border-white/20 text-center relative pt-6 pb-2 sticky top-0 z-40">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">KG</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">CARNES</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1a1c23]">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className={`${idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-white/5' : 'bg-white dark:bg-[#1a1c23]'} border-b border-gray-100 dark:border-white/5 text-center group`}>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 text-left font-black text-[12px] text-gray-800 dark:text-gray-200 sticky left-0 bg-white dark:bg-[#1a1c23] group-hover:bg-gray-100 dark:group-hover:bg-white/10 z-10">
                          {isAdmin ? (
                            <input 
                              type="text"
                              value={row.gusto}
                              onChange={(e) => updateField(idx, 'gusto', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 font-black text-[12px] p-0"
                            />
                          ) : row.gusto}
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-black text-[13px] text-gray-900 dark:text-white">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.programacion}
                              onChange={(val) => updateField(idx, 'programacion', val)}
                              className="w-16 bg-transparent border-none text-center focus:ring-0 font-black text-[13px] p-0"
                            />
                          ) : (row.programacion % 1 !== 0 ? row.programacion.toString().replace('.', ',') : row.programacion)}
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5">
                          <NumericInput 
                            value={row.stockBandejas}
                            onChange={(val) => updateStockBandejas(idx, val.toString())}
                            onKeyDown={handleKeyDown}
                            onPaste={(e) => handlePaste(e, idx, 'bandejas')}
                            onFocus={(e) => e.target.select()}
                            disabled={!canEdit}
                            className="w-16 bg-blue-50/50 dark:bg-blue-500/5 text-center focus:bg-blue-100 dark:focus:bg-blue-500/20 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-lg p-1 transition-all font-black text-gray-900 dark:text-white disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-black text-[13px] text-[#4d7c71]">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.armarBand}
                              onChange={(val) => updateField(idx, 'armarBand', val)}
                              className="w-16 bg-transparent border-none text-center focus:ring-0 font-black text-[13px] p-0"
                            />
                          ) : (row.armarBand % 1 !== 0 ? row.armarBand.toString().replace('.', ',') : row.armarBand)}
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5">
                          <NumericInput 
                            value={row.stockBateas}
                            onChange={(val) => updateStockBateas(idx, val.toString())}
                            onKeyDown={handleKeyDown}
                            onPaste={(e) => handlePaste(e, idx, 'bateas')}
                            onFocus={(e) => e.target.select()}
                            disabled={!canEdit}
                            className="w-16 bg-blue-50/50 dark:bg-blue-500/5 text-center focus:bg-blue-100 dark:focus:bg-blue-500/20 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-lg p-1 transition-all font-black text-gray-900 dark:text-white disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-black text-[13px] text-gray-900 dark:text-white">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.bateasPArmar}
                              onChange={(val) => updateField(idx, 'bateasPArmar', val)}
                              className="w-16 bg-transparent border-none text-center focus:ring-0 font-black text-[13px] p-0"
                            />
                          ) : row.bateasPArmar.toFixed(1).replace('.', ',')}
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-gray-700 dark:text-gray-300">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.coccion}
                              onChange={(val) => updateField(idx, 'coccion', val)}
                              className="w-16 bg-transparent border-none text-center focus:ring-0 font-bold p-0"
                            />
                          ) : row.coccion.toFixed(1).replace('.', ',')}
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-black text-[13px] text-[#4d7c71] dark:text-emerald-400">
                          {calculateFinalCarnes(row) > 0 ? calculateFinalCarnes(row).toFixed(1).replace('.', ',') : ''}
                        </td>
                        
                        {/* Segunda parte - Configuración */}
                        <td className="bg-slate-200/30 dark:bg-slate-800/40 px-3 py-2 border-x border-gray-100 dark:border-white/5 text-left font-bold text-[12px] text-slate-500">
                          {isAdmin ? (
                            <input 
                              type="text"
                              value={row.gusto}
                              onChange={(e) => updateField(idx, 'gusto', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 font-bold text-[12px] p-0"
                            />
                          ) : row.gusto}
                        </td>
                        {/* Grupo 1: Bateas / Bandejas */}
                        <td className="bg-slate-200/50 dark:bg-slate-800/60 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-slate-600 dark:text-slate-200">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.bateasConfig}
                              onChange={(val) => updateField(idx, 'bateasConfig', val)}
                              className="w-12 bg-transparent border-none text-center focus:ring-0 font-bold p-0"
                            />
                          ) : (row.bateasConfig || '')}
                        </td>
                        <td className="bg-slate-200/50 dark:bg-slate-800/60 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-slate-600 dark:text-slate-200">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.bandejasConfig}
                              onChange={(val) => updateField(idx, 'bandejasConfig', val)}
                              className="w-12 bg-transparent border-none text-center focus:ring-0 font-bold p-0"
                            />
                          ) : (row.bandejasConfig % 1 !== 0 ? row.bandejasConfig.toString().replace('.', ',') : (row.bandejasConfig || ''))}
                        </td>
                        {/* Grupo 2: Cocciones / Bateas */}
                        <td className="bg-blue-50/30 dark:bg-blue-900/20 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-blue-600 dark:text-blue-300">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.coccionesConfig}
                              onChange={(val) => updateField(idx, 'coccionesConfig', val)}
                              className="w-12 bg-transparent border-none text-center focus:ring-0 font-bold p-0"
                            />
                          ) : (row.coccionesConfig !== 0 ? row.coccionesConfig : '')}
                        </td>
                        <td className="bg-blue-50/30 dark:bg-blue-900/20 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-blue-600 dark:text-blue-300">
                          {isAdmin ? (
                            <NumericInput 
                              value={row.bateas2Config}
                              onChange={(val) => updateField(idx, 'bateas2Config', val)}
                              className="w-12 bg-transparent border-none text-center focus:ring-0 font-bold p-0"
                            />
                          ) : (row.bateas2Config || '')}
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5">
                          <input 
                            type="text"
                            value={row.carnes || ''}
                            onChange={(e) => updateCarnes(idx, e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={(e) => handlePaste(e, idx, 'carnes')}
                            onFocus={(e) => e.target.select()}
                            disabled={!canEdit}
                            className="w-20 bg-blue-50/50 dark:bg-blue-500/5 text-center focus:bg-blue-100 dark:focus:bg-blue-500/20 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-lg p-1 transition-all font-black text-gray-900 dark:text-white disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    ))}
                    {parsedData.length === 0 && (
                      <tr>
                        <td colSpan={14} className="p-20 text-center opacity-30">
                          <p className="text-sm font-bold uppercase tracking-[0.2em] italic">Pegue los datos para generar el desglose</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-30">
                    {parsedData.length > 0 && (
                      <tr className="bg-white dark:bg-[#1a1c23] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] font-black text-[13px]">
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-left text-[#4d7c71] dark:text-white sticky left-0 bg-white dark:bg-[#1a1c23] z-10">TOTAL</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalProgramacion.toString().replace('.', ',')}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalStockBandejas.toString().replace('.', ',')}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalArmarBand.toString().replace('.', ',')}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalStockBateas.toString().replace('.', ',')}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalBateasPArmar.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 6 })}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalCoccion.toFixed(1).replace('.', ',')}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white font-black border-x border-[#4d7c71]/20">
                          {totalFinalCarnes > 0 ? totalFinalCarnes.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : ''}
                        </td>
                        <td className="px-3 py-3 bg-slate-50 dark:bg-slate-800/40 border-x border-[#4d7c71]/20"></td>
                        <td className="px-3 py-3 bg-slate-50 dark:bg-slate-800/40 border-x border-[#4d7c71]/20"></td>
                        <td className="px-3 py-3 bg-slate-50 dark:bg-slate-800/40 border-x border-[#4d7c71]/20"></td>
                        <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/20 border-x border-[#4d7c71]/20 text-center text-blue-600 dark:text-blue-400 font-black">{totalCoccionesConfig > 0 ? totalCoccionesConfig : ''}</td>
                        <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/20 border-x border-[#4d7c71]/20 text-center text-blue-600 dark:text-blue-400 font-black">{totalBateas2Config > 0 ? totalBateas2Config : ''}</td>
                        <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/20 border-x border-[#4d7c71]/20 text-center text-blue-600 dark:text-blue-400 font-black">{totalCarnesConfig > 0 ? totalCarnesConfig.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : ''}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
           </div>
    </div>
  );
}
