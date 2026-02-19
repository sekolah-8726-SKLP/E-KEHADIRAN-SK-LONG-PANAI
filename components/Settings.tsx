import React from 'react';
import { Student, DailyRecord } from '../types';

interface Props {
  students: Student[];
  onImportStudents: (students: Student[]) => void;
  onImportHistory: (history: { [date: string]: DailyRecord }) => void;
  onResetData: () => void;
  onRefreshOnlineData: () => void;
  onOpenExport: () => void; // Added prop to trigger export modal
}

export const Settings: React.FC<Props> = ({ 
  students, 
  onImportStudents, 
  onImportHistory, 
  onResetData, 
  onRefreshOnlineData,
  onOpenExport 
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Google Sheet Link Info */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
           <span className="material-symbols-outlined text-green-600 dark:text-green-400">table_view</span>
           Kemaskini Data Murid
        </h3>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-xl mb-6 border border-green-100 dark:border-green-800">
          <p className="text-sm leading-relaxed">
            Data murid disegerakkan secara automatik dari Google Sheet. Sila kemas kini senarai nama di Google Sheet terlebih dahulu, kemudian tekan butang "Refresh Data".
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          
          {/* Button 1: Edit Google Sheet */}
          <a 
            href="https://docs.google.com/spreadsheets/d/1tdivTIl-QHBJBKq7OCEIurpAQLgRc79M/edit?gid=1355535367#gid=1355535367" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-gray-700 border-2 border-indigo-100 dark:border-indigo-600 text-indigo-700 dark:text-indigo-200 rounded-xl shadow-sm hover:shadow-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-all duration-300 font-bold uppercase tracking-wide overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-indigo-50/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform text-green-600">edit_document</span>
            <span className="relative z-10">Kemas Kini Senarai Nama</span>
            <span className="material-symbols-outlined text-sm opacity-50 group-hover:translate-x-1 transition-transform">open_in_new</span>
          </a>

           {/* Button 2: Refresh Data */}
           <button
            onClick={onRefreshOnlineData}
            className="group relative flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 font-bold uppercase tracking-wide"
          >
            <span className="material-symbols-outlined text-2xl group-hover:rotate-180 transition-transform duration-500">sync</span>
            <span>Refresh Data</span>
          </button>

        </div>
      </div>

      {/* Cloud Export Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <span className="material-symbols-outlined text-9xl">cloud_sync</span>
         </div>
         
         <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 relative z-10">
           <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">folder_shared</span>
           Analisis Pukal & Simpanan Awan
        </h3>

        <div className="relative z-10">
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
                Jana laporan analisis kehadiran penuh (Harian, Bulanan, atau Tahunan) dalam format Excel dan simpan ke dalam Google Drive sekolah untuk rekod kekal.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
                {/* Step 1: Generate */}
                <button 
                    onClick={onOpenExport}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all font-semibold shadow-sm"
                >
                    <span className="material-symbols-outlined text-3xl">download</span>
                    <div className="text-left">
                        <span className="block text-xs uppercase tracking-wider opacity-70">Langkah 1</span>
                        <span className="block text-lg">Jana Laporan Excel</span>
                    </div>
                </button>

                {/* Step 2: Upload to Drive */}
                <a 
                    href="https://drive.google.com/drive/folders/13rh2XlrbA_f8J4tAt_1Vt4dV8I1Af1Tz?usp=drive_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-[1.5] flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all font-bold"
                >
                    <span className="material-symbols-outlined text-3xl">add_to_drive</span>
                    <div className="text-left">
                        <span className="block text-xs uppercase tracking-wider opacity-80">Langkah 2</span>
                        <span className="block text-lg">Buka Folder Google Drive</span>
                    </div>
                    <span className="material-symbols-outlined ml-auto opacity-50">open_in_new</span>
                </a>
            </div>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 italic">
                *Nota: Sila muat naik fail Excel yang dijana ke dalam folder Google Drive yang dibuka.
            </p>
        </div>
      </div>

       {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/40">
         <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Zon Bahaya</h3>
         <p className="text-red-600 dark:text-red-400 text-sm mb-4">Tindakan ini akan memadam semua data kehadiran dan senarai murid dalam aplikasi ini.</p>
         <button 
            onClick={() => {
              if (window.confirm("Adakah anda pasti mahu memadam semua data? Tindakan ini tidak boleh dikembalikan.")) {
                onResetData();
              }
            }}
            className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 transition-colors"
          >
            Reset Semua Data
          </button>
      </div>
    </div>
  );
};