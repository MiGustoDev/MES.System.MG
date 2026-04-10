import { useState } from 'react';
import {
  Menu,
  X,
  Calendar,
  Package,
  BarChart3,
  History,
  Monitor,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3 pr-2">
              <img src="logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sistema MES</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gestión de Producción</p>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-1">
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

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 relative w-10 h-10 flex items-center justify-center overflow-hidden"
            >
              <Menu className={`w-6 h-6 absolute transition-all duration-300 ease-in-out ${menuOpen ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'}`} />
              <X className={`w-6 h-6 absolute transition-all duration-300 ease-in-out ${menuOpen ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'}`} />
            </button>
          </div>
        </div>

      </nav>

      {/* Backdrop para oscurecer el fondo */}
      <div 
        className={`md:hidden fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Cajón lateral (Drawer) desde la derecha */}
      <div 
        className={`md:hidden fixed top-16 right-0 bottom-0 w-[280px] bg-white dark:bg-[#1a1c23] shadow-2xl z-50 transform transition-transform duration-300 ease-out border-l border-gray-200 dark:border-white/5 ${
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
