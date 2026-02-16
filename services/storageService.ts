import { AppState, Student, AttendanceStatus } from '../types';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'attendance_app_data_v2_sklp'; // Updated version to load new data

// Data murid berdasarkan senarai rasmi
const DEFAULT_STUDENTS: Student[] = [
  // PRA SEKOLAH
  { id: 'pra-1', name: 'AUBRIELLA EVERLY BULAN EZRA KILAH', className: 'PRA SEKOLAH' },
  { id: 'pra-2', name: 'ABIGAIL ATHALIA LIVAN ANAK WILLY', className: 'PRA SEKOLAH' },
  { id: 'pra-3', name: 'ISAIAAH LAWAI FILEX BILONG', className: 'PRA SEKOLAH' },
  { id: 'pra-4', name: 'AURELLNA AUDREY PUYANG ANAK FREDIE', className: 'PRA SEKOLAH' },
  { id: 'pra-5', name: 'ADRIEL EMILLIUS JOK EZRA', className: 'PRA SEKOLAH' },
  { id: 'pra-6', name: 'ALEESA AFIYA BINTI MUHAMAD ANAS', className: 'PRA SEKOLAH' },
  { id: 'pra-7', name: 'GUSTAVSON MADANG GARVIN', className: 'PRA SEKOLAH' },

  // TAHUN 1
  { id: 't1-1', name: 'ABRAHAM ANYI ANAK WILLY', className: 'TAHUN 1' },

  // TAHUN 2
  { id: 't2-1', name: 'AUBRIANNA ERISHA MUJAN EZRA', className: 'TAHUN 2' },
  { id: 't2-2', name: 'ETHAN MERANG LILY', className: 'TAHUN 2' },
  { id: 't2-3', name: 'GEORGIA KELAWING GARVIN', className: 'TAHUN 2' },
  { id: 't2-4', name: 'REYNALD RAYMOND USANG', className: 'TAHUN 2' },
  { id: 't2-5', name: 'GOLDING KEEFE MARTIN', className: 'TAHUN 2' },

  // TAHUN 3
  { id: 't3-1', name: 'AARON LAWAI ANAK FREDIE', className: 'TAHUN 3' },
  { id: 't3-2', name: 'ALFEUS AJENG ANAK NICKLOS', className: 'TAHUN 3' },
  { id: 't3-3', name: 'KYLA URING BINTI ABDULLAH', className: 'TAHUN 3' },
  { id: 't3-4', name: 'MOSES ANAK JAMBURI', className: 'TAHUN 3' },
  { id: 't3-5', name: 'MUHAMMAD NABIL ISKANDAR BIN MUHAMMAD FIRDAUS', className: 'TAHUN 3' },

  // TAHUN 4
  { id: 't4-1', name: 'ALLISTER EADGAR AJENG EZRA', className: 'TAHUN 4' },
  { id: 't4-2', name: 'GRAYSON JAMES GARETTE', className: 'TAHUN 4' },
  { id: 't4-3', name: 'JEZTHANIA PING SHERRINE', className: 'TAHUN 4' },
  { id: 't4-4', name: 'REELLY TEE WAGNER BIN JERRY', className: 'TAHUN 4' },

  // TAHUN 5
  { id: 't5-1', name: 'GAVRILENO GARVIN', className: 'TAHUN 5' },

  // TAHUN 6
  { id: 't6-1', name: 'CLARISSA HANA BINTI JEFFERY', className: 'TAHUN 6' },
  { id: 't6-2', name: 'CYRILLIA SARA BINTI JEFFERY', className: 'TAHUN 6' },
  { id: 't6-3', name: 'JEZZLYN JAU', className: 'TAHUN 6' },
  { id: 't6-4', name: 'LEON YUSRAN LUSAT BIENVENIDO MONICA', className: 'TAHUN 6' },
  { id: 't6-5', name: 'STEPHANIE THALIA UVING WELLYKEN', className: 'TAHUN 6' },
];

export const loadState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Default Initial State
  const today = new Date().toISOString().split('T')[0];
  return {
    students: DEFAULT_STUDENTS,
    attendanceHistory: {},
    currentDate: today,
  };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const exportToCSV = (state: AppState, date: string): string => {
  const record = state.attendanceHistory[date];
  // Header CSV yang sesuai untuk Google Sheets
  const headers = ['ID', 'NAMA MURID', 'KELAS', 'TARIKH', 'STATUS', 'CATATAN'];
  
  const rows = state.students.map(student => {
    const status = record?.records[student.id]?.status || AttendanceStatus.ABSENT; // Default Absent if not marked
    const remarks = record?.records[student.id]?.remarks || '';
    
    // Format: ID, NAMA, KELAS, TARIKH, STATUS, CATATAN
    return [
      student.id,
      `"${student.name}"`, // Quote names to handle potentially long names/commas
      student.className,
      date,
      status,
      `"${remarks}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Menjana fail Excel untuk kehadiran harian
 */
export const exportDailyToExcel = (state: AppState, date: string) => {
  const record = state.attendanceHistory[date];
  
  const headers = ['ID', 'NAMA MURID', 'KELAS', 'TARIKH', 'STATUS', 'CATATAN'];
  
  const data = state.students.map(student => {
    // Default kepada Absent jika tiada rekod, atau boleh guna 'Tiada Rekod'
    const status = record?.records[student.id]?.status || AttendanceStatus.ABSENT;
    const remarks = record?.records[student.id]?.remarks || '';
    
    return [
      student.id,
      student.name,
      student.className,
      date,
      status,
      remarks
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Adjust column widths
  const wscols = [
    { wch: 10 }, // ID
    { wch: 40 }, // Nama
    { wch: 15 }, // Kelas
    { wch: 15 }, // Tarikh
    { wch: 15 }, // Status
    { wch: 30 }, // Catatan
  ];
  ws['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, `Harian ${date}`);
  XLSX.writeFile(wb, `Kehadiran_Harian_${date}.xlsx`);
};

/**
 * Menjana fail Excel untuk kehadiran bulanan (Matriks: Murid x Tarikh)
 */
export const exportToExcel = (state: AppState, year: number, month: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  const numDays = endDate.getDate();
  const monthName = startDate.toLocaleDateString('ms-MY', { month: 'long' });

  // 1. Prepare Headers
  // Fixed Headers: No, Nama, Kelas
  // Dynamic Headers: 1, 2, 3 ... 31
  // Stats Headers: Hadir, % Hadir
  const headers = ['No', 'Nama Murid', 'Kelas'];
  const dateKeys: string[] = [];

  for (let d = 1; d <= numDays; d++) {
    headers.push(String(d));
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dateKeys.push(dateStr);
  }

  headers.push('Jum. Hadir', 'Jum. Tidak Hadir', '% Kehadiran');

  // 2. Prepare Data Rows
  const data = state.students.map((student, index) => {
    const row: any[] = [index + 1, student.name, student.className];
    let presentCount = 0;
    let absentCount = 0;
    // We count total days based on month length, or maybe only weekdays? 
    // Usually reports count total school days. For simplicity, we count days where *any* attendance was taken in the system,
    // OR just raw count. Let's do raw count of days marked.
    
    let daysMarked = 0;

    dateKeys.forEach(dateStr => {
      const dailyRecord = state.attendanceHistory[dateStr];
      let statusSymbol = '-'; // Default: Not Marked / Weekend / Holiday

      if (dailyRecord && dailyRecord.records[student.id]) {
        daysMarked++;
        const s = dailyRecord.records[student.id].status;
        if (s === AttendanceStatus.PRESENT) {
          statusSymbol = '1'; // or '/'
          presentCount++;
        } else if (s === AttendanceStatus.ABSENT) {
          statusSymbol = '0';
          absentCount++;
        } else if (s === AttendanceStatus.LATE) {
          statusSymbol = 'L';
          presentCount++; // Usually late counts as present
        } else if (s === AttendanceStatus.EXCUSED) {
          statusSymbol = 'K';
          // Does Excused count as present or absent? Usually neutral or present. keeping neutral for now.
        }
      }
      row.push(statusSymbol);
    });

    // Stats
    const totalDays = presentCount + absentCount; // Only count days with explicit status for percentage
    const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    row.push(presentCount, absentCount, `${percentage}%`);
    return row;
  });

  // 3. Generate Workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Adjust column widths
  const wscols = [
    { wch: 5 },  // No
    { wch: 40 }, // Nama
    { wch: 15 }, // Kelas
    ...Array(numDays).fill({ wch: 3 }), // Dates (narrow)
    { wch: 10 }, // Jum Hadir
    { wch: 10 }, // Jum TH
    { wch: 10 }, // %
  ];
  ws['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, `Kehadiran ${monthName}`);

  // 4. Download
  XLSX.writeFile(wb, `Laporan_Kehadiran_SKLP_${monthName}_${year}.xlsx`);
};