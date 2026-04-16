import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarDropdownProps {
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function CalendarDropdown({ selectedDate, onSelect }: CalendarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = dateStr === selectedDate;
    
    days.push(
      <button
        key={day}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(dateStr);
          setIsOpen(false);
        }}
        className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="min-w-[130px] px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-2 text-sm sm:text-base transition-all cursor-pointer hover:border-blue-500 dark:hover:border-blue-500/50 group shadow-sm font-bold"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedDate.split('-').reverse().join('/')}</span>
        <CalendarIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-4 w-[280px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(currentYear, currentMonth - 1, 1)); }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm dark:text-white uppercase tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(currentYear, currentMonth + 1, 1)); }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(d => (
              <div key={d} className="h-8 w-8 flex items-center justify-center text-[10px] font-black text-gray-400">
                {d}
              </div>
            ))}
            {days}
          </div>
        </div>
      )}
    </div>
  );
}
