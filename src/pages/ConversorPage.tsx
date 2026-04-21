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
  Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';

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
  'AC': { bandejas: 9, cocciones: 1, bateas: 2, rec: '80' },
  'BB': { bandejas: 7, cocciones: 1, bateas: 4, rec: '100' },
  'MPP': { bandejas: 8, cocciones: 1, bateas: 7, rec: '80 + 20' },
  'CC': { bandejas: 7.5, cocciones: 1, bateas: 4, rec: '120' },
  'CA': { bandejas: 8.5, cocciones: 1, bateas: 10, rec: '120' },
  'CS': { bandejas: 7, cocciones: 1, bateas: 10, rec: '120' },
  'PO': { bandejas: 7, cocciones: 1, bateas: 6, rec: '75' },
  'PA': { bandejas: 13, cocciones: 0, bateas: 1, rec: '' },
  'PC': { bandejas: 6.7, cocciones: 1, bateas: 6, rec: '65' },
  'JQ': { bandejas: 10, cocciones: 0, bateas: 1, rec: '24' },
  'VP': { bandejas: 8.5, cocciones: 1, bateas: 6, rec: '120' },
  'MT': { bandejas: 7.3, cocciones: 1, bateas: 4, rec: '120' },
  'QC': { bandejas: 9, cocciones: 1, bateas: 4, rec: '70' },
  'RJ': { bandejas: 9, cocciones: 0, bateas: 1, rec: '24' },
  'CH': { bandejas: 8, cocciones: 0, bateas: 8, rec: '12 + 8' },
  'V': { bandejas: 10.5, cocciones: 0, bateas: 4, rec: '50' },
  'JH': { bandejas: 9.5, cocciones: 0, bateas: 1, rec: '28' },
  '4Q': { bandejas: 8.5, cocciones: 0, bateas: 1, rec: '24' },
  'CZ': { bandejas: 9.5, cocciones: 1, bateas: 4, rec: '12 + 14' },
};

export function ConversorPage() {
  const [data, setData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (data.trim()) {
        const lines = data.trim().split('\n');
        const results: ParsedRow[] = [];

        const parseNum = (str: string) => {
          if (!str) return 0;
          return parseFloat(str.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        };

        lines.forEach(line => {
          const parts = line.split(/\t/).map(p => p.trim());
          if (parts.length < 2 || parts[0].toUpperCase() === 'GUSTOS' || parts[0].toUpperCase() === 'TOTAL' || parts[0].toUpperCase() === 'PROGRAMACION') return;

          const programacion = parseNum(parts[1]);
          const stockBandejas = parseNum(parts[2]);
          const stockBateas = parseNum(parts[4]);
          
          const gusto = parts[0];
          const equiv = PRODUCT_EQUIVALENCIES[gusto.toUpperCase()];
          
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
            carnes: parts[7] || (equiv ? equiv.rec : ''),
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
    // Basic cleaning to allow typing commas/dots
    const cleanedVal = val.replace(',', '.');
    const numericVal = parseFloat(cleanedVal) || 0;
    
    const newData = [...parsedData];
    const row = newData[index];
    const updatedArmarBand = row.programacion - numericVal;
    const updatedBateasPArmar = (updatedArmarBand / (row.bandejasConfig || 1)) - row.stockBateas;
    
    newData[index] = {
      ...row,
      stockBandejas: numericVal,
      armarBand: updatedArmarBand,
      bateasPArmar: updatedBateasPArmar,
      coccion: updatedBateasPArmar / (row.bateas2Config || 1)
    };
    setParsedData(newData);
  };

  const handlePaste = (e: React.ClipboardEvent, startIndex: number, type: 'bandejas' | 'bateas') => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData.includes('\n')) return; // Seguir comportamiento normal si no es una columna

    e.preventDefault();
    const rows = pasteData.split(/\r?\n/).map(row => row.trim()).filter(row => row !== '');
    const newData = [...parsedData];

    rows.forEach((value, i) => {
      const targetIndex = startIndex + i;
      if (targetIndex >= newData.length) return;

      const numericVal = parseFloat(value.replace(',', '.')) || 0;
      const row = newData[targetIndex];

      if (type === 'bandejas') {
        const updatedArmarBand = row.programacion - numericVal;
        const updatedBateasPArmar = (updatedArmarBand / (row.bandejasConfig || 1)) - row.stockBateas;
        newData[targetIndex] = {
          ...row,
          stockBandejas: numericVal,
          armarBand: updatedArmarBand,
          bateasPArmar: updatedBateasPArmar,
          coccion: updatedBateasPArmar / (row.bateas2Config || 1)
        };
      } else {
        const updatedBateasPArmar = (row.armarBand / (row.bandejasConfig || 1)) - numericVal;
        newData[targetIndex] = {
          ...row,
          stockBateas: numericVal,
          bateasPArmar: updatedBateasPArmar,
          coccion: updatedBateasPArmar / (row.bateas2Config || 1)
        };
      }
    });

    setParsedData(newData);
  };

  const updateStockBateas = (index: number, val: string) => {
    const cleanedVal = val.replace(',', '.');
    const numericVal = parseFloat(cleanedVal) || 0;
    
    const newData = [...parsedData];
    const row = newData[index];
    const updatedBateasPArmar = (row.armarBand / (row.bandejasConfig || 1)) - numericVal;
    
    newData[index] = {
      ...row,
      stockBateas: numericVal,
      bateasPArmar: updatedBateasPArmar,
      coccion: updatedBateasPArmar / (row.bateas2Config || 1)
    };
    setParsedData(newData);
  };

  const totalProgramacion = parsedData.reduce((acc, row) => acc + row.programacion, 0);
  const totalStockBandejas = parsedData.reduce((acc, row) => acc + row.stockBandejas, 0);
  const totalArmarBand = parsedData.reduce((acc, row) => acc + row.armarBand, 0);
  const totalBateasPArmar = parsedData.reduce((acc, row) => acc + row.bateasPArmar, 0);
  
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
            disabled={!data}
            onClick={() => { setData(''); setParsedData([]); }}
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
            </div>

            <div className="flex-1 relative group/textarea">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-0 group-hover/textarea:opacity-5 transition-opacity duration-700 rounded-[2rem] pointer-events-none"></div>
              <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Copie los datos desde su Excel y péguelos aquí..."
                className="w-full h-full min-h-[400px] p-8 bg-gray-50/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[2rem] text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none shadow-inner scrollbar-none placeholder:opacity-40"
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
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Total Programado', value: totalProgramacion.toLocaleString(), icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Stock Bandejas', value: totalStockBandejas.toLocaleString(), icon: Container, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
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
      <div className="bg-white dark:bg-[#1a1c23] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
             <div className="px-8 py-6 bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                   <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Desglose Detallado</h3>
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {parsedData.length} ítems procesados
                </div>
             </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-[#4d7c71] text-white text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 border border-white/20 text-left">GUSTOS</th>
                      <th className="px-3 py-3 border border-white/20 text-center">PROGRAMACION</th>
                      <th className="px-3 py-3 border border-white/20 text-center text-[9px] leading-tight font-black">STOCK<br/>BANDEJAS</th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">Armado</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">BANDEJAS A ARMAR</span>
                      </th>
                      <th className="px-3 py-3 border border-white/20 text-center text-[9px] leading-tight font-black">STOCK<br/>BATEAS</th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">Picadillo</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">BATEAS P. ARMAR</span>
                      </th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">Cocina</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">COCCION</span>
                      </th>
                      <th className="px-3 py-3 border border-white/20 text-center relative pt-6 pb-2">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase tracking-widest text-white/60">KG</span>
                        </div>
                        <span className="block text-[10px] font-black uppercase tracking-wider">CARNES</span>
                      </th>
                      
                      {/* Separador visual para la segunda parte */}
                      <th className="bg-slate-600 px-3 py-3 border border-white/20 text-left">GUSTOS</th>
                      <th className="bg-slate-700 px-3 py-3 border border-white/20 text-center">BATEAS</th>
                      <th className="bg-slate-700 px-3 py-3 border border-white/20 text-center">BANDEJAS</th>
                      <th className="bg-blue-900/40 px-3 py-3 border border-white/20 text-center">COCCIONES</th>
                      <th className="bg-blue-900/40 px-3 py-3 border border-white/20 text-center">BATEAS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#1a1c23]">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className={`${idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-white/5' : 'bg-white dark:bg-[#1a1c23]'} border-b border-gray-100 dark:border-white/5 text-center`}>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 text-left font-black text-[12px] text-gray-800 dark:text-gray-200">{row.gusto}</td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-black text-[13px] text-gray-900 dark:text-white">{row.programacion % 1 !== 0 ? row.programacion.toString().replace('.', ',') : row.programacion}</td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5">
                          <input 
                            type="text"
                            value={row.stockBandejas || ''}
                            onChange={(e) => updateStockBandejas(idx, e.target.value)}
                            onPaste={(e) => handlePaste(e, idx, 'bandejas')}
                            className="w-16 bg-blue-50/50 dark:bg-blue-500/5 text-center focus:bg-blue-100 dark:focus:bg-blue-500/20 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-lg p-1 transition-all font-bold text-gray-600 dark:text-gray-400"
                          />
                        </td>
                         <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-black text-[13px] text-[#4d7c71]">{row.armarBand % 1 !== 0 ? row.armarBand.toString().replace('.', ',') : row.armarBand}</td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5">
                          <input 
                            type="text"
                            value={row.stockBateas || ''}
                            onChange={(e) => updateStockBateas(idx, e.target.value)}
                            onPaste={(e) => handlePaste(e, idx, 'bateas')}
                            className="w-16 bg-blue-50/50 dark:bg-blue-500/5 text-center focus:bg-blue-100 dark:focus:bg-blue-500/20 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded-lg p-1 transition-all font-bold text-gray-600 dark:text-gray-400"
                          />
                        </td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-black text-[13px] text-gray-900 dark:text-white">{row.bateasPArmar.toFixed(1).replace('.', ',')}</td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-gray-700 dark:text-gray-300">{row.coccion.toFixed(1).replace('.', ',')}</td>
                        <td className="px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-gray-700 dark:text-gray-300">{row.carnes}</td>
                        
                        {/* Segunda parte - Configuración */}
                        <td className="bg-slate-200/30 dark:bg-slate-800/40 px-3 py-2 border-x border-gray-100 dark:border-white/5 text-left font-bold text-[12px] text-slate-500">{row.gusto}</td>
                        {/* Grupo 1: Bateas / Bandejas */}
                        <td className="bg-slate-200/50 dark:bg-slate-800/60 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-slate-600 dark:text-slate-200">{row.bateasConfig || ''}</td>
                        <td className="bg-slate-200/50 dark:bg-slate-800/60 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-slate-600 dark:text-slate-200">{row.bandejasConfig % 1 !== 0 ? row.bandejasConfig.toString().replace('.', ',') : (row.bandejasConfig || '')}</td>
                        {/* Grupo 2: Cocciones / Bateas */}
                        <td className="bg-blue-50/30 dark:bg-blue-900/20 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-blue-600 dark:text-blue-300">{row.coccionesConfig !== 0 ? row.coccionesConfig : ''}</td>
                        <td className="bg-blue-50/30 dark:bg-blue-900/20 px-3 py-2 border-x border-gray-100 dark:border-white/5 font-bold text-blue-600 dark:text-blue-300">{row.bateas2Config || ''}</td>
                      </tr>
                    ))}
                    {parsedData.length > 0 && (
                      <tr className="bg-[#4d7c71]/10 dark:bg-white/5 font-black text-[13px]">
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-left text-[#4d7c71] dark:text-white">TOTAL</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalProgramacion.toString().replace('.', ',')}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20"></td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalArmarBand.toString().replace('.', ',')}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20"></td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20 text-center text-[#4d7c71] dark:text-white">{totalBateasPArmar.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 6 })}</td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20"></td>
                        <td className="px-3 py-3 border-x border-[#4d7c71]/20"></td>
                        <td colSpan={5} className="bg-slate-100/30 dark:bg-slate-800/20"></td>
                      </tr>
                    )}
                    {parsedData.length === 0 && (
                      <tr>
                        <td colSpan={13} className="p-20 text-center opacity-30">
                          <p className="text-sm font-bold uppercase tracking-[0.2em] italic">Pegue los datos para generar el desglose</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
    </div>
  );
}
