import React, { useState, useEffect, useRef } from 'react';
import { DailyRecord, Student } from '../types';

interface Props {
  selectedDate: string;
  onDateChange: (date: string) => void;
  history: { [date: string]: DailyRecord };
  students: Student[];
  currentUser: string | null;
}

export const CalendarPicker: React.FC<Props> = ({ selectedDate, onDateChange, history, students, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view when selectedDate changes externally
  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  // --- Logic: Determine User's Target Classes ---
  const getTargetClasses = (username: string | null): string[] => {
    if (!username || username === 'AdminGK' || username === 'GUEST') return []; // Empty array = ALL classes

    const lower = username.toLowerCase();
    if (lower.includes('pra')) return ['PRA SEKOLAH'];
    if (lower.includes('tahun 1')) return ['TAHUN 1'];
    if (lower.includes('tahun 2&3')) return ['TAHUN 2', 'TAHUN 3'];
    if (lower.includes('tahun 4&5')) return ['TAHUN 4', 'TAHUN 5'];
    if (lower.includes('tahun 6')) return ['TAHUN 6'];
    
    return [];
  };

  const targetClasses = getTargetClasses(currentUser);

  // --- Logic: Check if a date has valid data for the user ---
  const hasAttendanceData = (dateStr: string) => {
    const record = history[dateStr];
    if (!record || !record.records) return false;

    // Filter relevant students based on user role
    const relevantStudents = targetClasses.length > 0 
      ? students.filter(s => targetClasses.includes(s.className))
      : students;

    // Check if ANY relevant student has a status recorded
    return relevantStudents.some(s => record.records[s.id] !== undefined);
  };

  // --- Calendar Generation ---
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  const daysArray = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(new Date(year, month, i));
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    // Format to YYYY-MM-DD using local time to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    onDateChange(dateStr);
    setIsOpen(false);
  };

  // Formatting helper
  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2.5 shadow-sm transition-all"
      >
        <span className="material-symbols-outlined text-[20px] text-gray-500 dark:text-gray-400">calendar_month</span>
        <span className="font-medium min-w-[140px] text-left">{formatDateDisplay(selectedDate)}</span>
        <span className="material-symbols-outlined text-[18px] text-gray-400">arrow_drop_down</span>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="font-bold text-gray-800 dark:text-white">
              {viewDate.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'].map(day => (
              <span key={day} className="text-xs font-semibold text-gray-400 uppercase">{day}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;

              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isFilled = hasAttendanceData(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  className={`
                    relative h-9 w-9 rounded-lg text-sm flex items-center justify-center transition-all
                    ${isSelected 
                      ? 'bg-indigo-600 text-white font-bold shadow-md' 
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                    ${isToday && !isSelected ? 'border border-indigo-300 dark:border-indigo-500 font-semibold' : ''}
                  `}
                >
                  {date.getDate()}
                  
                  {/* Status Indicator Dot */}
                  {isFilled && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Data Telah Diisi</span>
          </div>
        </div>
      )}
    </div>
  );
};
