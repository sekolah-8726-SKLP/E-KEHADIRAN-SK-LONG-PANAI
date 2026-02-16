import React, { useState, useRef } from 'react';
import { Student, DailyRecord, AttendanceStatus } from '../types';
import * as XLSX from 'xlsx';

interface Props {
  students: Student[];
  onImportStudents: (students: Student[]) => void;
  onImportHistory: (history: { [date: string]: DailyRecord }) => void;
  onResetData: () => void;
}

export const Settings: React.FC<Props> = ({ students, onImportStudents, onImportHistory, onResetData }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'STUDENT' | 'HISTORY'>('STUDENT');
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<any | null>(null);
  const [previewInfo, setPreviewInfo] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helper: Find key case-insensitive ---
  const getVal = (row: any, keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined) return row[k];
    }
    return null;
  };

  // --- Helper: Parse Status String ---
  const parseStatus = (val: string): AttendanceStatus => {
    const v = String(val).toLowerCase().trim();
    if (v === 'hadir' || v === 'present' || v === '1' || v === '/') return AttendanceStatus.PRESENT;
    if (v === 'tidak hadir' || v === 'absent' || v === '0' || v === 'x') return AttendanceStatus.ABSENT;
    if (v === 'lewat' || v === 'late' || v === 'l') return AttendanceStatus.LATE;
    if (v === 'kenyataan' || v === 'cuti' || v === 'excused') return AttendanceStatus.EXCUSED;
    return AttendanceStatus.ABSENT; // Default fallback
  };

  // --- Helper: Excel Date to YYYY-MM-DD ---
  const parseExcelDate = (val: any): string | null => {
    if (!val) return null;
    // Handle Excel Serial Number
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    // Handle String
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return null;
  };

  // --- Process 1: Analyze Student Data ---
  const analyzeStudentData = (data: any[]) => {
    const newStudents: Student[] = [];
    data.forEach((row, idx) => {
      if (Object.keys(row).length === 0) return;
      let name = '';
      let className = '';

      if (!Array.isArray(row)) {
        name = getVal(row, ['Nama', 'NAMA', 'Nama Murid', 'Name', 'Student Name', '__EMPTY']) || '';
        className = getVal(row, ['Kelas', 'KELAS', 'Class', 'Tahun', 'Darjah', '__EMPTY_1']) || '';
      } else if (Array.isArray(row) && row.length >= 2) {
         name = row[0];
         className = row[1];
      }

      if (name && name !== 'Nama Murid' && name !== 'Name') {
        newStudents.push({
          id: `imp-${Date.now()}-${idx}`,
          name: String(name).trim(),
          className: String(className).trim()
        });
      }
    });

    if (newStudents.length > 0) {
      setPendingData(newStudents);
      setPreviewInfo(`Dijumpai ${newStudents.length} data murid.`);
    } else {
      alert("Tiada data murid dijumpai. Pastikan format betul.");
      setFileName(null);
    }
  };

  // --- Process 2: Analyze Attendance History ---
  const analyzeHistoryData = (data: any[]) => {
    const newHistory: { [date: string]: DailyRecord } = {};
    let count = 0;

    data.forEach((row) => {
      // Expected: Tarikh, Nama, Status, Catatan
      const dateRaw = getVal(row, ['Tarikh', 'Date', 'DATE', 'TARIKH']);
      const nameRaw = getVal(row, ['Nama', 'Name', 'NAMA', 'Nama Murid']);
      const statusRaw = getVal(row, ['Status', 'Kehadiran', 'Hadir']);
      const remarks = getVal(row, ['Catatan', 'Remarks', 'Sebab']) || '';

      const dateStr = parseExcelDate(dateRaw);
      
      if (dateStr && nameRaw) {
        // Try to match student by Name (Simple fuzzy match: exact trim ignore case)
        const student = students.find(s => s.name.toLowerCase() === String(nameRaw).toLowerCase().trim());
        
        if (student) {
          if (!newHistory[dateStr]) {
            newHistory[dateStr] = { date: dateStr, records: {} };
          }
          
          newHistory[dateStr].records[student.id] = {
            status: parseStatus(statusRaw),
            timestamp: new Date().toISOString(),
            remarks: String(remarks)
          };
          count++;
        }
      }
    });

    if (count > 0) {
      setPendingData(newHistory);
      setPreviewInfo(`Dijumpai ${count} rekod kehadiran yang sah.`);
    } else {
      alert("Tiada rekod kehadiran yang sah dijumpai. Pastikan nama murid sepadan dengan senarai dalam sistem.");
      setFileName(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    setFileName(file.name);
    setPendingData(null);
    setPreviewInfo('');
    
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (bstr) {
        try {
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          if (importMode === 'STUDENT') {
            analyzeStudentData(data);
          } else {
            analyzeHistoryData(data);
          }
        } catch (error) {
          console.error(error);
          alert("Ralat fail. Sila pastikan format fail .xlsx atau .csv adalah sah.");
          setFileName(null);
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const handleProceed = () => {
    if (!pendingData) return;

    if (importMode === 'STUDENT') {
        if (window.confirm("Adakah anda pasti mahu menggantikan SEMUA data murid sedia ada?")) {
            onImportStudents(pendingData);
            // alert removed to allow seamless transition by App.tsx
        } else {
            return;
        }
    } else {
        onImportHistory(pendingData);
        // alert removed
    }
    handleCancel();
  };

  const handleCancel = () => {
    setFileName(null);
    setPendingData(null);
    setPreviewInfo('');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const downloadStudentTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Nama Murid": "Ali Bin Abu", "Kelas": "1 Cerdas" },
      { "Nama Murid": "Siti Nurhaliza", "Kelas": "4 Bestari" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Templat Murid");
    XLSX.writeFile(wb, "Templat_Murid.xlsx");
  };

  const downloadHistoryTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Tarikh": "2023-10-01", "Nama Murid": "Ali Bin Abu", "Status": "Hadir", "Catatan": "" },
      { "Tarikh": "2023-10-01", "Nama Murid": "Siti Nurhaliza", "Status": "Tidak Hadir", "Catatan": "Demam" },
      { "Tarikh": "2023-10-02", "Nama Murid": "Ali Bin Abu", "Status": "Hadir", "Catatan": "" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Templat Kehadiran");
    XLSX.writeFile(wb, "Templat_Rekod_Kehadiran.xlsx");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Universal Import Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
           <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">cloud_upload</span>
           Pusat Import Data
        </h3>

        {/* Mode Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-6 w-full md:w-fit">
          <button 
            onClick={() => { setImportMode('STUDENT'); handleCancel(); }}
            className={`flex-1 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${importMode === 'STUDENT' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Senarai Murid
          </button>
          <button 
             onClick={() => { setImportMode('HISTORY'); handleCancel(); }}
             className={`flex-1 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${importMode === 'HISTORY' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Rekod Kehadiran (Analisis)
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instructions */}
          <div className="md:col-span-1 space-y-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {importMode === 'STUDENT' 
                ? 'Muat naik senarai nama murid untuk menetapkan pangkalan data sistem.' 
                : 'Muat naik rekod kehadiran lampau untuk menjana graf analisis yang lengkap.'}
            </p>
            
            <div className={`p-4 rounded-xl border text-sm ${importMode === 'STUDENT' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200' : 'bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-200'}`}>
              <p className="font-semibold mb-2">Format Lajur Wajib:</p>
              {importMode === 'STUDENT' ? (
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Nama Murid</strong></li>
                  <li><strong>Kelas</strong></li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Tarikh</strong> (YYYY-MM-DD)</li>
                  <li><strong>Nama Murid</strong> (Sama dalam sistem)</li>
                  <li><strong>Status</strong> (Hadir/Tidak/Lewat)</li>
                </ul>
              )}
            </div>

            <button 
              onClick={importMode === 'STUDENT' ? downloadStudentTemplate : downloadHistoryTemplate}
              className="w-full py-2 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Muat Turun Templat
            </button>
          </div>

          {/* Dropzone & Actions */}
          <div className="md:col-span-2 flex flex-col gap-4">
            
            {!pendingData ? (
                <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 min-h-[250px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                >
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                />
                
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${importMode === 'STUDENT' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                    <span className="material-symbols-outlined text-3xl">
                    {importMode === 'STUDENT' ? 'person_add' : 'history_edu'}
                    </span>
                </div>
                
                <div className="text-center px-4">
                    <p className="text-gray-700 dark:text-gray-300 font-medium">Klik untuk pilih fail atau seret ke sini</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Mode: {importMode === 'STUDENT' ? 'Senarai Murid' : 'Rekod Kehadiran'}</p>
                </div>
                </div>
            ) : (
                <div className="flex-1 min-h-[250px] bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl">check</span>
                    </div>
                    <h4 className="text-gray-800 dark:text-white font-bold text-lg mb-1">{fileName}</h4>
                    <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-6">{previewInfo}</p>
                    
                    <div className="flex gap-3 w-full max-w-xs">
                         <button 
                            onClick={handleCancel}
                            className="flex-1 py-2 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors font-medium"
                         >
                            Batal
                         </button>
                         <button 
                            onClick={handleProceed}
                            className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-colors font-medium"
                         >
                            Hantar
                         </button>
                    </div>
                </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Google Sheet Link Info */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
           <span className="material-symbols-outlined text-green-600 dark:text-green-400">table_view</span>
           Eksport Data
        </h3>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-xl mb-6 border border-green-100 dark:border-green-800">
          <p className="text-sm leading-relaxed">
            Untuk membuat salinan keselamatan atau mengemaskini Google Sheet luaran, sila gunakan fungsi eksport CSV di menu utama.
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <a 
            href="https://docs.google.com/spreadsheets/d/1FIaAoDLh82xhyjMvPWNu8c6J4Yts6qYgf_6ioTZ45gM/edit?gid=0#gid=0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Buka Google Sheet Asal
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
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