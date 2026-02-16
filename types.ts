export enum AttendanceStatus {
  PRESENT = 'Hadir',
  ABSENT = 'Tidak Hadir',
  LATE = 'Lewat',
  EXCUSED = 'Kenyataan',
}

export interface Student {
  id: string;
  name: string;
  className: string;
}

export interface DailyRecord {
  date: string; // ISO string YYYY-MM-DD
  records: {
    [studentId: string]: {
      status: AttendanceStatus;
      timestamp: string;
      remarks?: string;
    };
  };
  aiAnalysis?: string;
}

export interface AppState {
  students: Student[];
  attendanceHistory: { [date: string]: DailyRecord };
  currentDate: string;
}

export type ViewMode = 'DASHBOARD' | 'ATTENDANCE' | 'ANALYSIS' | 'SETTINGS';
