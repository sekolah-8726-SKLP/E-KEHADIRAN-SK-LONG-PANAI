import { AppState, Student, AttendanceStatus } from '../types';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'attendance_app_data_v2_sklp';

// Data default kosong - akan diisi oleh Google Sheet semasa runtime
const DEFAULT_STUDENTS: Student[] = [];

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

export const fetchStudentsFromGoogleSheet = async (): Promise<Student[]> => {
  // URL CSV dari Google Sheet
  const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWob1LCLXE0Q-JLMGJlqZsnDJ2TcAR7GviB-nipdALpr-XjQj03nMhklWDJKbJWA/pub?gid=1355535367&single=true&output=csv";
  const SHEET_URL = `${BASE_URL}&_t=${Date.now()}`; // Add timestamp to prevent caching
  
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error('Gagal menghubungi Google Sheet');
    
    const csvText = await response.text();
    
    // Guna XLSX untuk parse CSV dengan lebih tepat (handle comma dalam nama, dll)
    const workbook = XLSX.read(csvText, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);
    
    const students: Student[] = [];
    
    json.forEach((row: any, index) => {
       // Cari kolum NAMA dan KELAS (case-insensitive)
       const name = row['NAMA'] || row['Nama'] || row['Name'] || row['nama'];
       const className = row['KELAS'] || row['Kelas'] || row['Class'] || row['kelas'];
       
       if (name && className) {
         students.push({
           id: `s-${index + 1}`, // Generate ID stabil berdasarkan urutan baris
           name: String(name).trim(),
           className: String(className).trim()
         });
       }
    });
    
    return students;
  } catch (err) {
    console.error("Ralat mengambil data murid:", err);
    return [];
  }
};

export const exportToCSV = (state: AppState, date: string): string => {
  const record = state.attendanceHistory[date];
  const headers = ['ID', 'NAMA MURID', 'KELAS', 'TARIKH', 'STATUS', 'CATATAN'];
  
  const rows = state.students.map(student => {
    const status = record?.records[student.id]?.status || AttendanceStatus.ABSENT;
    const remarks = record?.records[student.id]?.remarks || '';
    
    return [
      student.id,
      `"${student.name}"`,
      student.className,
      date,
      status,
      `"${remarks}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const exportDailyToExcel = (state: AppState, date: string) => {
  const record = state.attendanceHistory[date];
  
  const headers = ['ID', 'NAMA MURID', 'KELAS', 'TARIKH', 'STATUS', 'CATATAN'];
  
  const data = state.students.map(student => {
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

  const wscols = [
    { wch: 10 }, 
    { wch: 40 }, 
    { wch: 15 }, 
    { wch: 15 }, 
    { wch: 15 }, 
    { wch: 30 }, 
  ];
  ws['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, `Harian ${date}`);
  XLSX.writeFile(wb, `Kehadiran_Harian_${date}.xlsx`);
};

export const exportToExcel = (state: AppState, year: number, month: number) => {
  const wb = XLSX.utils.book_new();
  
  // --- Setup Dates ---
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); 
  const numDays = endDate.getDate();
  const monthName = startDate.toLocaleDateString('ms-MY', { month: 'long' }).toUpperCase();
  const dateKeys: string[] = [];
  const dayHeaders: string[] = [];

  for (let d = 1; d <= numDays; d++) {
    dayHeaders.push(String(d));
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dateKeys.push(dateStr);
  }

  // --- Helper: School Header Rows ---
  const getSchoolHeader = () => [
    ["SEKOLAH KEBANGSAAN LONG PANAI"],
    ["D/A Pejabat Pendidikan Daerah Baram,"],
    ["Lot 2241, Jalan Marudi/Ulu Linei,"],
    ["98050 MARUDI, SARAWAK."],
    [""] // Spacer
  ];

  // --- DATA AGGREGATION ---
  
  // Class Stats containers
  const classStats: { [key: string]: { totalStudents: number, totalPresent: number, totalPossibleDays: number } } = {};
  // Student Ranking container
  const studentRanking: { name: string, className: string, present: number, total: number, percent: number }[] = [];

  // Group students by class
  const studentsByClass: { [key: string]: Student[] } = {};
  state.students.forEach(s => {
    if (!studentsByClass[s.className]) studentsByClass[s.className] = [];
    studentsByClass[s.className].push(s);

    if (!classStats[s.className]) {
      classStats[s.className] = { totalStudents: 0, totalPresent: 0, totalPossibleDays: 0 };
    }
    classStats[s.className].totalStudents++;
  });

  // Calculate Attendance
  state.students.forEach(s => {
      let sPresent = 0;
      let sTotal = 0;

      dateKeys.forEach(dateStr => {
          const record = state.attendanceHistory[dateStr];
          // Check if data exists for this day (school day)
          if (state.attendanceHistory[dateStr]) {
             classStats[s.className].totalPossibleDays++;
             sTotal++;

             const status = record?.records[s.id]?.status;
             if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) {
                 classStats[s.className].totalPresent++;
                 sPresent++;
             }
          }
      });

      const sPercent = sTotal > 0 ? (sPresent / sTotal) * 100 : 0;
      studentRanking.push({
          name: s.name,
          className: s.className,
          present: sPresent,
          total: sTotal,
          percent: sPercent
      });
  });

  // --- SHEET 1: ANALISIS KESELURUHAN ---
  
  const summaryHeaders = ["KELAS", "JUMLAH MURID", "PERATUS KEHADIRAN", "CARTA PRESTASI"];
  const summaryData = Object.entries(classStats).map(([className, stat]) => {
      const percentage = stat.totalPossibleDays > 0 
          ? Math.round((stat.totalPresent / stat.totalPossibleDays) * 100) 
          : 0;
      
      // Visual Bar Logic (ASCII Block Chart)
      const blocks = Math.round(percentage / 5); 
      const filled = '█'.repeat(blocks);
      const empty = '░'.repeat(20 - blocks);
      const chart = `${filled}${empty} ${percentage}%`;

      return [className, stat.totalStudents, `${percentage}%`, chart];
  });
  
  // Sort summary by class name usually, or percentage
  summaryData.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  // Calculate Overall School Stats
  const totalStudentsAll = Object.values(classStats).reduce((acc, curr) => acc + curr.totalStudents, 0);
  const totalPresentAll = Object.values(classStats).reduce((acc, curr) => acc + curr.totalPresent, 0);
  const totalPossibleAll = Object.values(classStats).reduce((acc, curr) => acc + curr.totalPossibleDays, 0);
  const overallPercent = totalPossibleAll > 0 ? Math.round((totalPresentAll / totalPossibleAll) * 100) : 0;

  const wsSummary = XLSX.utils.aoa_to_sheet([
      ...getSchoolHeader(),
      ["ANALISIS KEHADIRAN BULAN " + monthName + " " + year],
      [""],
      summaryHeaders,
      ...summaryData,
      [""],
      ["PERATUS KESELURUHAN", "", `${overallPercent}%`],
      ["BULAN", "", monthName]
  ]);

  wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Analisis Keseluruhan");


  // --- SHEET 2: RANKING INDIVIDU (NEW) ---
  
  // Sort Ranking: Highest Percent -> Highest Count -> Name Asc
  studentRanking.sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      if (b.present !== a.present) return b.present - a.present;
      return a.name.localeCompare(b.name);
  });

  const rankingHeaders = ["KEDUDUKAN", "NAMA MURID", "KELAS", "JUMLAH HADIR", "DARIPADA (HARI)", "PERATUS (%)"];
  const rankingRows = studentRanking.map((s, idx) => [
      idx + 1,
      s.name,
      s.className,
      s.present,
      s.total,
      `${s.percent.toFixed(0)}%`
  ]);

  const wsRanking = XLSX.utils.aoa_to_sheet([
      ...getSchoolHeader(),
      ["SENARAI KEHADIRAN TERTINGGI MENGIKUT INDIVIDU - " + monthName],
      [""],
      rankingHeaders,
      ...rankingRows
  ]);

  wsRanking['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsRanking, "Ranking Individu");


  // --- SHEETS 3...N: INDIVIDUAL CLASS TABS ---

  const sortedClasses = Object.keys(studentsByClass).sort();

  sortedClasses.forEach(className => {
      const classStudents = studentsByClass[className];
      classStudents.sort((a, b) => a.name.localeCompare(b.name));

      const headers = ['No', 'Nama Murid', ...dayHeaders, 'Hadir', 'T.Hadir', '%'];
      
      let classTotalPresent = 0;
      let classTotalPossible = 0;

      const rows = classStudents.map((student, index) => {
        const row: any[] = [index + 1, student.name];
        let presentCount = 0;
        let absentCount = 0;

        dateKeys.forEach(dateStr => {
           const dailyRecord = state.attendanceHistory[dateStr];
           let symbol = '';

           // Logic Check for weekends/holidays (simple check if any record exists for that date)
           const isSchoolDay = !!state.attendanceHistory[dateStr];

           if (isSchoolDay) {
               classTotalPossible++;
               if (dailyRecord && dailyRecord.records[student.id]) {
                   const s = dailyRecord.records[student.id].status;
                   if (s === AttendanceStatus.PRESENT) { symbol = '1'; presentCount++; classTotalPresent++; }
                   else if (s === AttendanceStatus.ABSENT) { symbol = '0'; absentCount++; }
                   else if (s === AttendanceStatus.LATE) { symbol = '1'; presentCount++; classTotalPresent++; } // LATE counts as 1 based on image? Or 'L'? Image says "L: Lewat (Kira Hadir)" so usually mapped to Present count but displayed as L.
                   else if (s === AttendanceStatus.EXCUSED) { symbol = 'K'; }
                   else { symbol = '0'; absentCount++; } // Default absent if school day but no status
               } else {
                   symbol = '0'; absentCount++;
               }
           } else {
               symbol = ''; 
           }
           
           // If status is LATE, we might want to display 'L' in grid but count as Present.
           // Based on code above, symbol is 1. Let's fix to 'L' if LATE for display accuracy.
           if (dailyRecord?.records[student.id]?.status === AttendanceStatus.LATE) symbol = 'L';

           row.push(symbol);
        });

        const totalRecorded = presentCount + absentCount; // Only school days
        // Note: totalRecorded usually equals numSchoolDays
        const percentage = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0;

        row.push(presentCount, absentCount, `${percentage}%`);
        return row;
      });

      const classPercent = classTotalPossible > 0 ? Math.round((classTotalPresent / classTotalPossible) * 100) : 0;

      // Add Footer/Legend
      const legendStartRow = rows.length + 3;
      const footerRows = [
          ["PETUNJUK:"],
          ["1", "Hadir"],
          ["0", "Tidak Hadir"],
          ["L", "Lewat (Kira Hadir)"],
          ["K", "Kenyataan/Cuti"],
          [""],
          [`PERATUS KESELURUHAN ${className}`, ``, `${classPercent}%`] // Merged visually by position
      ];

      const wsClass = XLSX.utils.aoa_to_sheet([
          ...getSchoolHeader(),
          [`KEHADIRAN KELAS ${className.toUpperCase()} - ${monthName} ${year}`],
          headers,
          ...rows,
          [""], 
          ...footerRows
      ]);

      // Columns Width
      wsClass['!cols'] = [
          { wch: 4 },  // No
          { wch: 40 }, // Name
          ...Array(numDays).fill({ wch: 3 }), // Dates
          { wch: 6 }, // Hadir
          { wch: 6 }, // T.Hadir
          { wch: 6 }, // %
      ];

      const safeTabName = className.length > 30 ? className.substring(0, 30) : className;
      XLSX.utils.book_append_sheet(wb, wsClass, safeTabName);
  });

  XLSX.writeFile(wb, `Laporan_Kehadiran_Penuh_${monthName}_${year}.xlsx`);
};