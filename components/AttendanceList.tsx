import React, { useState, useMemo, useEffect } from 'react';
import { Student, DailyRecord, AttendanceStatus } from '../types';

interface Props {
  students: Student[];
  record: DailyRecord | undefined;
  onSave: (records: { [studentId: string]: { status: AttendanceStatus; remarks?: string } }) => void;
}

export const AttendanceList: React.FC<Props> = ({ students, record, onSave }) => {
  // Lalai kepada string kosong supaya guru perlu memilih kelas dahulu
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // Local state to store changes before submitting
  const [localRecords, setLocalRecords] = useState<{ [key: string]: { status: AttendanceStatus; remarks?: string } }>({});

  // Initialize local records when the record prop (date) changes
  useEffect(() => {
    const initialRecords: { [key: string]: { status: AttendanceStatus; remarks?: string } } = {};
    if (record?.records) {
      Object.entries(record.records).forEach(([id, data]) => {
        initialRecords[id] = { status: (data as any).status, remarks: (data as any).remarks };
      });
    }
    setLocalRecords(initialRecords);
  }, [record]);

  // Reset filter when student list changes
  useEffect(() => {
    setSelectedClass('');
  }, [students]);

  // Dapatkan senarai kelas yang unik
  const classList = useMemo(() => {
    const classes = new Set(students.map(s => s.className));
    return Array.from(classes).sort();
  }, [students]);

  // Tapis pelajar
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return []; // Jika tiada kelas dipilih, pulangkan kosong
    if (selectedClass === 'Semua Kelas') return students;
    return students.filter(student => student.className === selectedClass);
  }, [students, selectedClass]);
  
  const handleLocalStatusUpdate = (studentId: string, status: AttendanceStatus) => {
    setLocalRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleLocalRemarksUpdate = (studentId: string, remarks: string) => {
    setLocalRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  // FUNGSI TANDA SEMUA HADIR (AUTO - TANPA CONFIRMATION)
  const handleMarkAllPresent = () => {
    const count = filteredStudents.length;
    if (count === 0) return;

    setLocalRecords(prev => {
      const nextState = { ...prev };
      
      filteredStudents.forEach(student => {
        // Kekalkan catatan sedia ada jika ada
        const currentData = nextState[student.id];
        const remarks = currentData?.remarks || '';
        
        nextState[student.id] = {
          status: AttendanceStatus.PRESENT,
          remarks: remarks
        };
      });
      
      return nextState;
    });
  };

  const handleReset = () => {
    if (window.confirm("Tetapkan semula perubahan yang belum disimpan?")) {
        const initialRecords: { [key: string]: { status: AttendanceStatus; remarks?: string } } = {};
        if (record?.records) {
            Object.entries(record.records).forEach(([id, data]) => {
                initialRecords[id] = { status: (data as any).status, remarks: (data as any).remarks };
            });
        }
        setLocalRecords(initialRecords);
    }
  };

  const handleSubmit = () => {
    onSave(localRecords);
  };

  const getStatusColor = (current: AttendanceStatus | undefined, target: AttendanceStatus) => {
    const isSelected = current === target;
    // Base classes
    const base = "w-9 h-9 flex items-center justify-center rounded-lg border transition-all duration-200";
    
    switch (target) {
      case AttendanceStatus.PRESENT:
        return isSelected 
          ? `${base} bg-emerald-500 text-white border-emerald-600 shadow-md scale-105` 
          : `${base} bg-white text-gray-400 border-gray-200 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400`;
      case AttendanceStatus.ABSENT:
        return isSelected 
          ? `${base} bg-red-500 text-white border-red-600 shadow-md scale-105` 
          : `${base} bg-white text-gray-400 border-gray-200 hover:border-red-400 hover:text-red-500 hover:bg-red-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400`;
      case AttendanceStatus.LATE:
        return isSelected 
          ? `${base} bg-amber-500 text-white border-amber-600 shadow-md scale-105` 
          : `${base} bg-white text-gray-400 border-gray-200 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400`;
      case AttendanceStatus.EXCUSED:
        return isSelected 
          ? `${base} bg-blue-500 text-white border-blue-600 shadow-md scale-105` 
          : `${base} bg-white text-gray-400 border-gray-200 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400`;
      default:
        return base;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        
        {/* Filter Kelas */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
             <span className="material-symbols-outlined">filter_alt</span>
             <span className="text-sm font-medium hidden sm:inline">Kelas:</span>
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 sm:w-64 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-medium"
          >
            <option value="" disabled>-- Sila Pilih Kelas (Wajib) --</option>
            <option value="Semua Kelas">Semua Kelas</option>
            {classList.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        {/* Butang Tanda Semua - Hanya tunjuk jika kelas dipilih */}
        {selectedClass && (
          <button
            onClick={handleMarkAllPresent}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-sm font-medium text-sm animate-[fadeIn_0.3s]"
          >
            <span className="material-symbols-outlined text-[20px]">done_all</span>
            {selectedClass === 'Semua Kelas' ? 'Tanda Semua Hadir' : 'Tanda Kelas Hadir'}
          </button>
        )}
      </div>

      {/* Logic Paparan */}
      {!selectedClass ? (
        // STATE: TIADA KELAS DIPILIH
        <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 animate-[fadeIn_0.5s]">
           <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-6">
              <span className="material-symbols-outlined text-4xl text-indigo-500 dark:text-indigo-400">school</span>
           </div>
           <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Pilih Kelas Untuk Memulakan</h3>
           <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
             Sila pilih kelas dari menu di atas untuk memaparkan senarai murid dan mengisi kehadiran.
           </p>
        </div>
      ) : (
        // STATE: SENARAI MURID DIPAPARKAN
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col h-full animate-[fadeIn_0.5s]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm w-16 text-center">#</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Nama Murid</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm w-32">Kelas</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm text-center min-w-[320px]">Status Kehadiran</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredStudents.map((student, index) => {
                  const currentStatus = localRecords[student.id]?.status;
                  const currentRemarks = localRecords[student.id]?.remarks || '';

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-4 text-center text-gray-500 dark:text-gray-400 font-medium">{index + 1}</td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                        <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 rounded text-xs font-bold whitespace-nowrap">
                          {student.className}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          {[AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleLocalStatusUpdate(student.id, status)}
                              className={getStatusColor(currentStatus, status)}
                              title={status}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {status === AttendanceStatus.PRESENT ? 'check' : 
                                 status === AttendanceStatus.ABSENT ? 'close' : 
                                 status === AttendanceStatus.LATE ? 'schedule' : 'assignment'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="..."
                          value={currentRemarks}
                          onChange={(e) => handleLocalRemarksUpdate(student.id, e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
             <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 text-gray-300 dark:text-gray-600">group_off</span>
                <p>Tiada murid dijumpai untuk kelas ini.</p>
             </div>
          )}

          {/* Action Buttons */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 z-10 shadow-inner">
              <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-600 transition-colors font-medium shadow-sm"
              >
                  <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                  Reset
              </button>
              <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:shadow-lg transition-all font-medium shadow-md"
              >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  Hantar / Simpan
              </button>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};