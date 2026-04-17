import { useState } from 'react';
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
}

export function ConversorPage() {
  const [data, setData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processData = () => {
    setIsProcessing(true);
    // Simulation of delay for better UX feel
    setTimeout(() => {
      const lines = data.trim().split('\n');
      const results: ParsedRow[] = [];

      lines.forEach(line => {
        // Handle tab-separated (standard excel paste) or multiple spaces
        const parts = line.split(/\t|\s{2,}/).map(p => p.trim());
        
        // Skip header or empty lines or "TOTAL" row
        if (parts.length < 2 || parts[0].toUpperCase() === 'GUSTOS' || parts[0].toUpperCase() === 'TOTAL' || parts[0].toUpperCase() === 'PROGRAMACION') {
          return;
        }

        const parseNum = (str: string) => {
          if (!str) return 0;
          return parseFloat(str.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        };

        results.push({
          gusto: parts[0],
          programacion: parseNum(parts[1]),
          stockBandejas: parseNum(parts[2]),
          armarBand: parseNum(parts[3]),
          stockBateas: parseNum(parts[4]),
          bateasPArmar: parseNum(parts[5]),
        });
      });

      setParsedData(results);
      setIsProcessing(false);
    }, 800);
  };

  const totalProgramacion = parsedData.reduce((acc, row) => acc + row.programacion, 0);
  const totalStockBandejas = parsedData.reduce((acc, row) => acc + row.stockBandejas, 0);
  const totalArmarBand = parsedData.reduce((acc, row) => acc + row.armarBand, 0);
  
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
            disabled={!data || isProcessing}
            onClick={() => { setData(''); setParsedData([]); }}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar</span>
          </button>
          <button 
            disabled={!data || isProcessing}
            onClick={processData}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 group/btn disabled:opacity-50 disabled:pointer-events-none"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
            )}
            <span>{isProcessing ? 'Procesando...' : 'Procesar Datos'}</span>
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

           {/* Table Summary */}
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
               <table className="w-full text-left">
                 <thead className="bg-gray-50/30 dark:bg-white/5 text-[10px] font-black uppercase text-gray-400">
                    <tr>
                      <th className="px-8 py-4">Gusto</th>
                      <th className="px-4 py-4 text-right">Prog.</th>
                      <th className="px-4 py-4 text-right">Stk Band.</th>
                      <th className="px-4 py-4 text-right">Stk Bat.</th>
                      <th className="px-8 py-4 text-right">Bat. p/Arm.</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                   {parsedData.map((row, idx) => (
                     <tr key={idx} className="hover:bg-blue-500/5 transition-colors group">
                       <td className="px-8 py-4 text-sm font-bold text-gray-900 dark:text-white">{row.gusto}</td>
                       <td className="px-4 py-4 text-sm font-black text-right text-blue-600 dark:text-blue-400">{row.programacion}</td>
                       <td className="px-4 py-4 text-sm font-medium text-right text-gray-500 dark:text-gray-400">{row.stockBandejas}</td>
                       <td className="px-4 py-4 text-sm font-medium text-right text-gray-500 dark:text-gray-400">{row.stockBateas}</td>
                       <td className="px-8 py-4 text-sm font-black text-right text-gray-900 dark:text-white">{row.bateasPArmar}</td>
                     </tr>
                   ))}
                   {parsedData.length === 0 && (
                     <tr>
                       <td colSpan={5} className="p-20 text-center opacity-30">
                         <p className="p-20 text-center opacity-30">
                            <p className="text-sm font-bold uppercase tracking-[0.2em] italic">Procese los datos para generar el desglose</p>
                         </p>
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
