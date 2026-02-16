import React, { useState, useEffect } from 'react';
import { AppState, ViewMode, AttendanceStatus, Student, DailyRecord } from './types';
import { loadState, saveState, exportToCSV, exportToExcel, exportDailyToExcel } from './services/storageService';
import { Dashboard } from './components/Dashboard';
import { AttendanceList } from './components/AttendanceList';
import { AnalysisReport } from './components/AnalysisReport';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { CalendarPicker } from './components/CalendarPicker';

const LOGO_URL = "https://scontent.fbki4-1.fna.fbcdn.net/v/t39.30808-6/291922675_380796547478905_8535586913286842649_n.png?_nc_cat=101&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFadDW9InXx3RxgEGXGrLMcrkpJmWEhgzyuSkmZYSGDPPmWL3khTqBcjF04RfdMm971cuBudBi4LOos3_qktpg0&_nc_ohc=SGOq2X9kpwMQ7kNvwGND6Jt&_nc_oc=AdmJrJ720h72PQK5HHfPSRh9hREAxxIvPviK_fd8fWRRdLrnpT1wWGIY9vnJjNg8ZDvWFF679EeXhHauLZ0Laq9Y&_nc_zt=23&_nc_ht=scontent.fbki4-1.fna&_nc_gid=iua1xyhXHmHpvlI8iIzjVA&oh=00_AftsGPvQao-Y1V3b9PoSSgPP98PanSL3zmM4w5Q-9w3ZAw&oe=69989453";

const BG_IMAGE_URL = "https://scontent.fbki4-1.fna.fbcdn.net/v/t39.30808-6/626190500_1269385825286635_7268788902999315195_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=103&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeGd_qlHb4jawATV12XZ1AiG9XSW320OZQz1dJbfbQ5lDEm6C_Jq6GgFFedX6iyWq_eI-3X8ehVrv2LnYAl-yyCm&_nc_ohc=RO7iESzT5WIQ7kNvwHHUV1L&_nc_oc=AdlhqQnpHJ-kW9sgXQ-6wdhccOKHDeGF8r2Lkm55do81vqWdW3M7LPrEZdqOv_OYYycMNr-MPtrUYjzD1vSlI6Xm&_nc_zt=23&_nc_ht=scontent.fbki4-1.fna&_nc_gid=0RAwT4j3F6ckNi9lJjcGWA&oh=00_AftLcptk3EbCXiLV3_QryoILvJiiC3gbT255agcqPVfmMQ&oe=6999003C";

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(sessionStorage.getItem('sklp_user'));

  // App State
  const [state, setState] = useState<AppState>(loadState());
  const [view, setView] = useState<ViewMode>('DASHBOARD');
  
  // UI State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Export State
  const [exportType, setExportType] = useState<'DAILY' | 'MONTHLY'>('MONTHLY');
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Persist State
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Apply Dark Mode Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    sessionStorage.setItem('sklp_user', username);
  };

  const handleGuestLogin = () => {
    setCurrentUser('GUEST');
    sessionStorage.setItem('sklp_user', 'GUEST');
    setView('DASHBOARD'); // Ensure guests start at dashboard
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('sklp_user');
  };

  const handleDateChange = (date: string) => {
    setState(prev => ({ ...prev, currentDate: date }));
  };

  // Batch Update Handler for "Hantar" button
  const handleBatchUpdate = (updates: { [id: string]: { status: AttendanceStatus; remarks?: string } }) => {
    setState(prev => {
      const dateRecord = prev.attendanceHistory[prev.currentDate] || { 
        date: prev.currentDate, 
        records: {} 
      };
      
      const newRecords = { ...dateRecord.records };

      // Merge updates
      Object.entries(updates).forEach(([id, data]) => {
          newRecords[id] = {
              status: data.status,
              remarks: data.remarks || '',
              timestamp: new Date().toISOString()
          };
      });
      
      return {
        ...prev,
        attendanceHistory: {
          ...prev.attendanceHistory,
          [prev.currentDate]: {
            ...dateRecord,
            records: newRecords,
            aiAnalysis: undefined // Reset analysis on change
          }
        }
      };
    });

    // Trigger Success Animation & Redirect
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      setView('ANALYSIS');
    }, 1500);
  };

  const saveAnalysis = (analysis: string) => {
    setState(prev => {
       const dateRecord = prev.attendanceHistory[prev.currentDate];
       if (!dateRecord) return prev;
       
       return {
         ...prev,
         attendanceHistory: {
           ...prev.attendanceHistory,
           [prev.currentDate]: {
             ...dateRecord,
             aiAnalysis: analysis
           }
         }
       };
    });
  };

  const handleProcessExport = () => {
    if (exportType === 'DAILY') {
        // Updated to use Excel
        const record = state.attendanceHistory[state.currentDate];
        if (!record) {
          alert("Tiada data untuk tarikh ini.");
          return;
        }
        exportDailyToExcel(state, state.currentDate);
    } else {
        // Excel Monthly
        const [year, month] = exportMonth.split('-').map(Number);
        if (!year || !month) return;
        exportToExcel(state, year, month);
    }
    setShowExportModal(false);
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setState(prev => ({ ...prev, students: newStudents }));
    // Automatically switch to Attendance view to allow user to mark attendance for new students
    setView('ATTENDANCE');
  };

  const handleImportHistory = (newHistory: { [date: string]: DailyRecord }) => {
    setState(prev => ({
      ...prev,
      attendanceHistory: {
        ...prev.attendanceHistory,
        ...newHistory
      }
    }));
    // Automatically switch to Attendance view to see the imported records
    setView('ATTENDANCE');
  };

  const handleReset = () => {
    localStorage.clear();
    setState(loadState());
    window.location.reload();
  };

  const currentRecord = state.attendanceHistory[state.currentDate];
  const isGuest = currentUser === 'GUEST';

  // Logic: Show Login if not authenticated
  if (!currentUser) {
    return <Login onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative transition-colors duration-200 overflow-hidden font-sans">
      
      {/* Background Layer */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url('${BG_IMAGE_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/90 via-gray-100/85 to-indigo-100/80 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-indigo-950/80 backdrop-blur-[2px]"></div>
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 z-20 shadow-sm flex flex-col transition-colors duration-200">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 flex flex-col items-center text-center">
          {/* Logo Container - Adjusted for perfect circle fit */}
          <div className="w-28 h-28 mb-4 relative rounded-full bg-white shadow-md p-2 border border-indigo-100 flex items-center justify-center overflow-hidden">
             <img 
               src={LOGO_URL} 
               alt="Logo SK Long Panai" 
               className="w-full h-full object-contain"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=SKLP";
               }}
             />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-xl leading-tight">E-Hadir</h1>
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mt-1">SK Long Panai</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-1.5 flex-1">
          <NavButton 
            active={view === 'DASHBOARD'} 
            onClick={() => setView('DASHBOARD')} 
            icon="dashboard" 
            label="Rumusan Harian" 
          />
          
          {/* Hide these options for Guests */}
          {!isGuest && (
            <>
              <NavButton 
                active={view === 'ATTENDANCE'} 
                onClick={() => setView('ATTENDANCE')} 
                icon="edit_square" 
                label="Isi Kehadiran" 
              />
              <NavButton 
                active={view === 'ANALYSIS'} 
                onClick={() => setView('ANALYSIS')} 
                icon="analytics" 
                label="Analisis AI" 
              />
              <NavButton 
                active={view === 'SETTINGS'} 
                onClick={() => setView('SETTINGS')} 
                icon="settings" 
                label="Tetapan" 
              />
            </>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-200/50 dark:border-gray-700/50 space-y-4">
          <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/30 dark:to-purple-900/30 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-800/50 backdrop-blur-sm">
             <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">Status Sistem</p>
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{process.env.API_KEY ? 'Online' : 'Offline'}</span>
                </div>
             </div>
             <div className="flex items-center gap-2 mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-800">
               <span className="material-symbols-outlined text-indigo-400 text-lg">
                 {isGuest ? 'visibility' : 'account_circle'}
               </span>
               <div className="overflow-hidden">
                 <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">
                   {isGuest ? 'Tetamu' : currentUser}
                 </p>
                 <p className="text-[10px] text-gray-400 dark:text-gray-500">
                   {isGuest ? 'Paparan Sahaja' : 'Pengguna Sah'}
                 </p>
               </div>
             </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-600"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {isGuest ? 'Keluar' : 'Log Keluar'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative z-10">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors duration-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {view === 'DASHBOARD' && 'Rumusan Harian'}
              {view === 'ATTENDANCE' && 'Senarai Kehadiran'}
              {view === 'ANALYSIS' && 'Laporan Analisis Pintar'}
              {view === 'SETTINGS' && 'Tetapan Data'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {new Date(state.currentDate).toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
             {/* Dark Mode Toggle Button */}
             <button
               onClick={() => setDarkMode(!darkMode)}
               className="p-2.5 rounded-lg bg-white/80 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm backdrop-blur-sm"
               title={darkMode ? "Tukar ke Mod Cerah" : "Tukar ke Mod Gelap"}
             >
               <span className="material-symbols-outlined text-[20px]">
                 {darkMode ? 'light_mode' : 'dark_mode'}
               </span>
             </button>

             {/* Custom Calendar Picker */}
             <CalendarPicker 
                selectedDate={state.currentDate}
                onDateChange={handleDateChange}
                history={state.attendanceHistory}
                students={state.students}
                currentUser={currentUser}
             />
             
             {/* Export Button -> Opens Modal */}
             {!isGuest && (
               <button 
                 onClick={() => setShowExportModal(true)}
                 className="flex items-center gap-2 bg-green-50/80 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-700 px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm backdrop-blur-sm"
                 title="Eksport data ke Excel atau CSV"
               >
                 <span className="material-symbols-outlined text-[18px]">download</span>
                 <span className="hidden sm:inline">Eksport Data</span>
               </button>
             )}
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {view === 'DASHBOARD' && (
            <Dashboard 
              record={currentRecord} 
              students={state.students} 
              date={state.currentDate}
              history={state.attendanceHistory}
            />
          )}

          {view === 'ATTENDANCE' && !isGuest && (
            <AttendanceList 
              students={state.students} 
              record={currentRecord}
              onSave={handleBatchUpdate}
            />
          )}

          {view === 'ANALYSIS' && !isGuest && (
            <AnalysisReport 
              date={state.currentDate}
              students={state.students}
              record={currentRecord}
              history={state.attendanceHistory}
              onSaveAnalysis={saveAnalysis}
            />
          )}

          {view === 'SETTINGS' && !isGuest && (
            <Settings 
              students={state.students}
              onImportStudents={handleImportStudents}
              onImportHistory={handleImportHistory}
              onResetData={handleReset}
            />
          )}
        </div>

        {/* EXPORT MODAL */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-md overflow-hidden animate-[popIn_0.3s_ease-out]">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600">table_view</span>
                        Eksport Data Kehadiran
                    </h3>
                    <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Tab Selection */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        <button 
                            onClick={() => setExportType('MONTHLY')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${exportType === 'MONTHLY' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Bulanan (Excel)
                        </button>
                        <button 
                             onClick={() => setExportType('DAILY')}
                             className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${exportType === 'DAILY' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Harian (Excel)
                        </button>
                    </div>

                    {exportType === 'MONTHLY' ? (
                        <div className="space-y-4">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-sm text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800">
                                <p>Menjana fail <strong>Excel (.xlsx)</strong> lengkap dengan matriks kehadiran semua murid bagi sebulan penuh. Sesuai untuk laporan rasmi atau simpanan fail.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pilih Bulan & Tahun</label>
                                <input 
                                    type="month" 
                                    value={exportMonth}
                                    onChange={(e) => setExportMonth(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    ) : (
                         <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                <p>Menjana fail <strong>Excel (.xlsx)</strong> ringkas untuk tarikh <strong>{state.currentDate}</strong> sahaja. Sesuai untuk semakan pantas.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                    <button 
                        onClick={() => setShowExportModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleProcessExport}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Muat Turun Excel
                    </button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Helper Component: Nav Button ---
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
      active 
        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
    }`}
  >
    <span className={`material-symbols-outlined transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>{icon}</span>
    {label}
  </button>
);

export default App;