
import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Database, 
  Beef, 
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Valores iniciales por defecto (los que estaban hardcodeados)
const DEFAULT_EQUIVALENCIES = {
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

const DEFAULT_MEAT_DISTRIBUTION = {
  'CS': { 'ROAST BEEF': 1 },
  'CA': { 'ROAST BEEF': 1 },
  'CP': { 'ROAST BEEF': 1 },
  'CC': { 'ROAST BEEF': 0.5, 'PALETA DE VACA': 0.5 },
  'VP': { 'VACIO': 0.7, 'TAPA DE ASADO': 0.3 },
  'MPP': { 'PALETA DE CERDO': 0.5, 'BONDIOLA DE CERDO': 0.5 },
  'PO': { 'POLLO': 1 },
  'AC': { 'POLLO': 1 },
  'PC': { 'POLLO': 1 },
  'BB': { 'ROAST BEEF': 1 },
  'MT': { 'MATAMBRE': 1 },
  'PE': { 'PECHO DE CERDO': 1 },
  'JH': { 'PALETA DE VACA': 1 },
  '4Q': { 'ROAST BEEF': 1 },
  'CZ': { 'ROAST BEEF': 1 },
  'V': { 'VACIO': 1 },
};

const MEAT_TYPES = [
  'ROAST BEEF', 'PALETA DE VACA', 'VACIO', 'TAPA DE ASADO', 'MATAMBRE',
  'PALETA DE CERDO', 'BONDIOLA DE CERDO', 'PECHO DE CERDO', 'POLLO',
  'AGUJA', 'BOLA LOMO', 'CUADRADA'
];

export function AdminConfigPage() {
  const [activeTab, setActiveTab] = useState<'equivalencies' | 'meat'>('equivalencies');
  const [equivalencies, setEquivalencies] = useState(DEFAULT_EQUIVALENCIES);
  const [meatDist, setMeatDist] = useState(DEFAULT_MEAT_DISTRIBUTION);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Cargar configuraciones guardadas
    const savedEquiv = localStorage.getItem('mes_config_equivalencies');
    const savedMeat = localStorage.getItem('mes_config_meat');
    
    if (savedEquiv) setEquivalencies(JSON.parse(savedEquiv));
    if (savedMeat) setMeatDist(JSON.parse(savedMeat));
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('mes_config_equivalencies', JSON.stringify(equivalencies));
      localStorage.setItem('mes_config_meat', JSON.stringify(meatDist));
      
      // Emitir eventos para que las otras páginas se enteren
      window.dispatchEvent(new CustomEvent('config-updated'));
      
      setMessage({ type: 'success', text: 'Configuración guardada correctamente en el navegador.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    if (window.confirm('¿Estás seguro de restablecer todos los valores por defecto? Se perderán los cambios actuales.')) {
      setEquivalencies(DEFAULT_EQUIVALENCIES);
      setMeatDist(DEFAULT_MEAT_DISTRIBUTION);
    }
  };

  const updateEquiv = (key: string, field: string, value: any) => {
    setEquivalencies(prev => ({
      ...prev,
      [key]: { ...prev[key as keyof typeof prev], [field]: value }
    }));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'equiv' | 'meat'>('equiv');
  const [newProductCode, setNewProductCode] = useState('');

  const addEquiv = () => {
    setModalType('equiv');
    setNewProductCode('');
    setIsModalOpen(true);
  };

  const addMeatGusto = () => {
    setModalType('meat');
    setNewProductCode('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newProductCode.toUpperCase().trim();
    if (!code) return;

    if (modalType === 'equiv') {
      if (equivalencies[code as keyof typeof equivalencies]) {
        alert('Este código ya existe en equivalencias.');
        return;
      }
      setEquivalencies(prev => ({
        ...prev,
        [code]: { bandejas: 1, cocciones: 1, bateas: 1, rec: '' }
      }));
    } else {
      if (meatDist[code as keyof typeof meatDist]) {
        alert('Este código ya existe en distribución de carnes.');
        return;
      }
      setMeatDist(prev => ({
        ...prev,
        [code]: { 'ROAST BEEF': 1 }
      }));
    }
    setIsModalOpen(false);
  };

  const removeEquiv = (key: string) => {
    if (window.confirm(`¿Eliminar ${key}?`)) {
      const newEquiv = { ...equivalencies };
      delete newEquiv[key as keyof typeof newEquiv];
      setEquivalencies(newEquiv);
    }
  };

  const updateMeatDist = (gusto: string, meatType: string, percentage: number) => {
    setMeatDist(prev => {
      const current = { ...(prev[gusto as keyof typeof prev] || {}) };
      if (percentage <= 0) {
        delete current[meatType];
      } else {
        current[meatType] = percentage;
      }
      
      const next = { ...prev };
      if (Object.keys(current).length === 0) {
        delete next[gusto as keyof typeof next];
      } else {
        (next as any)[gusto] = current;
      }
      return next;
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1a1c23] p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Settings className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Panel de Configuración</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Ajuste de rendimientos y equivalencias de planta</p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button 
            onClick={resetToDefault}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gray-500/10 text-gray-500 rounded-2xl hover:bg-gray-500/20 transition-all font-black text-xs uppercase tracking-widest"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Por Defecto</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-bold uppercase tracking-tight">{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('equivalencies')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'equivalencies' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Equivalencias</span>
        </button>
        <button
          onClick={() => setActiveTab('meat')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'meat' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Beef className="w-4 h-4" />
          <span>Distribución Carnes</span>
        </button>
      </div>

      {activeTab === 'equivalencies' ? (
        <div className="bg-white dark:bg-[#1a1c23] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Maestro de Rendimientos</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configuración base para el conversor de datos</p>
            </div>
            <button 
              onClick={addEquiv}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              title="Añadir Producto"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/[0.05] border-b border-gray-100 dark:border-white/10">
                  <th className="px-8 py-5 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Gusto</th>
                  <th className="px-4 py-5 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Bandejas p/Coccion</th>
                  <th className="px-4 py-5 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Cocciones (S/N)</th>
                  <th className="px-4 py-5 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Bateas p/Coccion</th>
                  <th className="px-4 py-5 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">REC (Kg/Bandeja)</th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {Object.entries(equivalencies).sort().map(([key, val]) => (
                  <tr key={key} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group border-b border-gray-100 dark:border-white/5">
                    <td className="px-8 py-5 font-black text-sm text-gray-900 dark:text-white">{key}</td>
                    <td className="px-4 py-5 text-center">
                      <input 
                        type="number" 
                        value={val.bandejas} 
                        onChange={(e) => updateEquiv(key, 'bandejas', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl p-2.5 text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-inner"
                      />
                    </td>
                    <td className="px-4 py-5 text-center">
                      <select 
                        value={val.cocciones} 
                        onChange={(e) => updateEquiv(key, 'cocciones', parseInt(e.target.value))}
                        className="w-24 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl p-2.5 text-xs font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-inner cursor-pointer"
                      >
                        <option value={1}>SÍ</option>
                        <option value={0}>NO</option>
                      </select>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <input 
                        type="number" 
                        value={val.bateas} 
                        onChange={(e) => updateEquiv(key, 'bateas', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl p-2.5 text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-inner"
                      />
                    </td>
                    <td className="px-4 py-5 text-center">
                      <input 
                        type="text" 
                        value={val.rec} 
                        onChange={(e) => updateEquiv(key, 'rec', e.target.value)}
                        className="w-24 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl p-2.5 text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-inner"
                      />
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => removeEquiv(key)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1c23] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Matriz de Carnes</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Definición de composición por gusto para Mesa de Carnes</p>
            </div>
            <button 
              onClick={addMeatGusto}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              title="Añadir Gusto"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(meatDist).sort().map(([gusto, dist]) => (
              <div key={gusto} className="bg-gray-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-gray-100 dark:border-white/5 group relative">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-black text-gray-900 dark:text-white">{gusto}</h4>
                  <button 
                    onClick={() => {
                      const newDist = { ...meatDist };
                      delete newDist[gusto as keyof typeof newDist];
                      setMeatDist(newDist);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {Object.entries(dist).map(([meat, percent]) => (
                    <div key={meat} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-black/40 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                      <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase flex-1">{meat}</span>
                      <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <input 
                          type="number" 
                          value={percent * 100} 
                          onChange={(e) => updateMeatDist(gusto, meat, (parseFloat(e.target.value) || 0) / 100)}
                          className="w-12 bg-transparent border-none text-right text-xs font-black p-0 focus:ring-0 text-gray-900 dark:text-white"
                        />
                        <span className="text-[10px] font-black text-gray-400 uppercase">%</span>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const meat = window.prompt('Tipo de carne:', MEAT_TYPES[0]);
                      if (meat && MEAT_TYPES.includes(meat.toUpperCase())) {
                        updateMeatDist(gusto, meat.toUpperCase(), 1);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase hover:border-blue-500 hover:text-blue-500 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Añadir Corte</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-blue-600/5 border border-blue-600/10 p-6 rounded-3xl flex gap-4">
        <Info className="w-6 h-6 text-blue-500 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Información de Almacenamiento</p>
          <p className="text-[11px] font-bold text-blue-600/60 dark:text-blue-400/60 leading-relaxed uppercase">
            Los cambios realizados aquí afectan directamente los cálculos del Conversor y las referencias de Programación. 
            Actualmente se guardan localmente en tu navegador. Para cambios permanentes globales, contacte a Sistemas.
          </p>
        </div>
      </div>

      {/* Modal para nuevo producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1a1c23] w-full max-w-md p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Nuevo Producto</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Añadir a {modalType === 'equiv' ? 'Equivalencias' : 'Matriz de Carnes'}</p>
              </div>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Nomenclatura del producto</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newProductCode}
                  onChange={(e) => setNewProductCode(e.target.value)}
                  placeholder="Ej: CP, MT, BB..."
                  className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-sm font-black text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all uppercase placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all font-black text-xs uppercase tracking-widest"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
