import { useState } from 'react';
import {
  Menu,
  X,
  Calendar,
  Package,
  BarChart3,
  History,
  Monitor,
  Calculator,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { ConversorPage } from '../pages/ConversorPage';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  showConversor?: boolean;
  setShowConversor?: (show: boolean) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [conversorOpen, setConversorOpen] = useState(false);
  const { signOut, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'programming', label: 'Programación', icon: Calendar },
    { id: 'production', label: 'Producción', icon: Package },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'plant-screen', label: 'Pantalla Planta', icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] transition-colors duration-300">
      <nav className="bg-white dark:bg-[#1a1c23] shadow-sm border-b border-gray-200 dark:border-white/5 transition-colors duration-300 relative z-50">
        <div className="w-full relative px-4 sm:px-6 lg:px-8">
          {/* Conversor Sticky Button - Far Left */}
          <div className="absolute left-0 top-0 h-16 flex items-center pr-4">
            <button
              onClick={() => setConversorOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 pr-4 rounded-r-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center space-x-2 group"
            >
              <Calculator className="w-5 h-5" />
              <span className="font-bold text-xs uppercase tracking-widest hidden lg:inline">Conversor</span>
            </button>
          </div>

          <div className="max-w-7xl mx-auto pl-12 sm:pl-0">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3 pr-2">
                <img src="/fabrica/MES/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
              </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sistema MES</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gestión de Producción</p>
                </div>
              </div>

              {/* Main Navigation - Limited by max-w-7xl */}
              <div className="hidden lg:flex items-center space-x-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Menu Button - Also moved to absolute for consistency if preferred, 
                  but here we keep a placeholder for spacing or just leave empty if it's absolute below */}
              <div className="lg:hidden w-10 h-10" />
            </div>
          </div>

          {/* Right Side Elements - UNLIMITED by max-w-7xl */}
          <div className="absolute right-4 sm:right-6 lg:right-8 top-0 h-16 flex items-center space-x-4">
            {user && (
              <div className="hidden lg:flex items-center space-x-4">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 relative w-10 h-10 flex items-center justify-center overflow-hidden"
            >
              <Menu className={`w-6 h-6 absolute transition-all duration-300 ease-in-out ${menuOpen ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'}`} />
              <X className={`w-6 h-6 absolute transition-all duration-300 ease-in-out ${menuOpen ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'}`} />
            </button>
          </div>
        </div>

      </nav>

      {/* Backdrop for mobile menu */}
      <div 
        className={`lg:hidden fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Conversor Side Drawer */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          conversorOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConversorOpen(false)} />
        <div 
          className={`absolute top-0 left-0 bottom-0 w-full md:w-[80%] lg:w-[70%] bg-[#fafafa] dark:bg-[#0f1115] shadow-2xl transform transition-transform duration-500 ease-out border-r border-gray-200 dark:border-white/5 overflow-hidden flex flex-col ${
            conversorOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 bg-white dark:bg-[#1a1c23] border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Conversor de Datos</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Herramienta de Análisis</p>
              </div>
            </div>
            <button 
              onClick={() => setConversorOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
            <ConversorPage />
          </div>
        </div>
      </div>

      {/* Cajón lateral (Drawer) desde la derecha */}
      <div 
        className={`lg:hidden fixed top-16 right-0 bottom-0 w-[280px] bg-white dark:bg-[#1a1c23] shadow-2xl z-50 transform transition-transform duration-300 ease-out border-l border-gray-200 dark:border-white/5 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 space-y-2 overflow-y-auto h-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          {user && (
            <button
              onClick={() => signOut()}
              className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all mt-4 border-t border-gray-100 dark:border-white/5 pt-6"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar sesión</span>
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-pre-wrap">
        © Desarrollado por el <strong><u>Departamento de Sistemas</u></strong> de Mi Gusto | Todos los derechos reservados.
      </footer>
    </div>
  );
}
