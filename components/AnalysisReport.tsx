import React, { useState, useMemo } from 'react';
import { DailyRecord, Student, AttendanceStatus } from '../types';
import { analyzeAttendance } from '../services/geminiService';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';

interface Props {
  date: string;
  students: Student[];
  record: DailyRecord | undefined;
  history: { [date: string]: DailyRecord };
  onSaveAnalysis: (analysis: string) => void;
}

type ReportType = 'SUMMARY' | 'BY_CLASS' | 'ABSENTEEISM' | 'RANKING';
type RankingPeriod = 'MONTHLY' | 'YEARLY';

export const AnalysisReport: React.FC<Props> = ({ date, students, record, history, onSaveAnalysis }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('SUMMARY');
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('MONTHLY');
  const existingAnalysis = record?.aiAnalysis;

  // --- Data Calculations ---
  
  // 1. Overall Stats
  const stats = useMemo(() => {
    const s = {
      [AttendanceStatus.PRESENT]: 0,
      [AttendanceStatus.ABSENT]: 0,
      [AttendanceStatus.LATE]: 0,
      [AttendanceStatus.EXCUSED]: 0,
      UNMARKED: 0
    };
    students.forEach(student => {
      const status = record?.records[student.id]?.status;
      if (status) s[status]++;
      else s.UNMARKED++;
    });
    return s;
  }, [record, students]);

  // 2. Class Stats
  const classStats = useMemo(() => {
    const data: { [key: string]: { name: string, hadir: number, total: number, percentage: number } } = {};
    students.forEach(student => {
      if (!data[student.className]) {
        data[student.className] = { name: student.className, hadir: 0, total: 0, percentage: 0 };
      }
      data[student.className].total++;
      if (record?.records[student.id]?.status === AttendanceStatus.PRESENT || record?.records[student.id]?.status === AttendanceStatus.LATE) {
         data[student.className].hadir++;
      }
    });
    return Object.values(data)
      .map(item => ({
        ...item,
        percentage: Math.round((item.hadir / item.total) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage); // Sort by highest percentage
  }, [record, students]);

  // 3. Absentee List
  const absentStudents = useMemo(() => {
    return students.filter(s => {
      const status = record?.records[s.id]?.status;
      return status === AttendanceStatus.ABSENT || status === undefined; // Termasuk yang tidak ditanda
    });
  }, [record, students]);

  // 4. Ranking Logic (New with Toggle)
  const rankingData = useMemo(() => {
    // 1. Identify target period
    const targetMonth = date.slice(0, 7); // YYYY-MM
    const targetYear = date.slice(0, 4);  // YYYY
    
    // 2. Find valid dates based on period
    const validDates = Object.keys(history).filter(d => {
      if (rankingPeriod === 'YEARLY') {
        return d.startsWith(targetYear);
      }
      return d.startsWith(targetMonth);
    });

    const totalDaysRecorded = validDates.length;

    if (totalDaysRecorded === 0) return [];

    // 3. Aggregate attendance per student
    const scores = students.map(student => {
      let presentCount = 0;
      
      validDates.forEach(d => {
        const status = history[d].records[student.id]?.status;
        if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) {
          presentCount++;
        }
      });

      const percentage = (presentCount / totalDaysRecorded) * 100;

      return {
        ...student,
        presentCount,
        totalDays: totalDaysRecorded,
        percentage
      };
    });

    // 4. Sort descending by Count first, then Percentage, then Name
    return scores.sort((a, b) => {
      if (b.presentCount !== a.presentCount) {
        return b.presentCount - a.presentCount;
      }
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return a.name.localeCompare(b.name);
    });
  }, [history, students, date, rankingPeriod]);

  // --- Handlers ---

  const handleGenerateAI = async () => {
    if (!record) {
      alert("Tiada data kehadiran untuk dianalisis.");
      return;
    }
    setLoading(true);
    const result = await analyzeAttendance(date, students, record);
    onSaveAnalysis(result);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel
    let filename = `Laporan_${date}.csv`;

    if (reportType === 'SUMMARY') {
      filename = `Ringkasan_Kehadiran_${date}.csv`;
      csvContent += "KATEGORI,JUMLAH\n";
      csvContent += `Hadir,${stats[AttendanceStatus.PRESENT]}\n`;
      csvContent += `Tidak Hadir,${stats[AttendanceStatus.ABSENT]}\n`;
      csvContent += `Lewat,${stats[AttendanceStatus.LATE]}\n`;
      csvContent += `Kenyataan,${stats[AttendanceStatus.EXCUSED]}\n`;
      csvContent += `Tidak Ditanda,${stats.UNMARKED}\n`;
    } else if (reportType === 'BY_CLASS') {
      filename = `Laporan_Kelas_${date}.csv`;
      csvContent += "KELAS,JUMLAH MURID,HADIR,PERATUS(%)\n";
      classStats.forEach(c => {
        csvContent += `${c.name},${c.total},${c.hadir},${c.percentage}\n`;
      });
    } else if (reportType === 'ABSENTEEISM') {
      filename = `Senarai_Tidak_Hadir_${date}.csv`;
      csvContent += "NAMA,KELAS,STATUS,CATATAN\n";
      absentStudents.forEach(s => {
        const status = record?.records[s.id]?.status || 'Tidak Ditanda';
        const remarks = record?.records[s.id]?.remarks || '-';
        csvContent += `"${s.name}",${s.className},${status},"${remarks}"\n`;
      });
    } else if (reportType === 'RANKING') {
      filename = `Ranking_Kehadiran_${rankingPeriod}_${date.slice(0, 7)}.csv`;
      csvContent += "RANKING,NAMA,KELAS,JUMLAH HADIR,TOTAL HARI,PERATUS(%)\n";
      rankingData.forEach((s, idx) => {
        csvContent += `${idx + 1},"${s.name}",${s.className},${s.presentCount},${s.totalDays},${s.percentage.toFixed(1)}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Chart Config ---
  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#9CA3AF'];
  const pieData = [
    { name: 'Hadir', value: stats[AttendanceStatus.PRESENT] },
    { name: 'Tidak Hadir', value: stats[AttendanceStatus.ABSENT] },
    { name: 'Lewat', value: stats[AttendanceStatus.LATE] },
    { name: 'Kenyataan', value: stats[AttendanceStatus.EXCUSED] },
    { name: 'Belum Ditanda', value: stats.UNMARKED },
  ].filter(d => d.value > 0);

  if (!record && reportType !== 'RANKING') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
        <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">assignment_late</span>
        <h3 className="text-lg font-medium text-gray-800">Tiada Rekod Dijumpai</h3>
        <p className="text-gray-500">Sila isi kehadiran pada menu 'Isi Kehadiran' terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <style>{`
        @media print {
          @page { margin: 1cm; size: A4; }
          body * { visibility: hidden; }
          .report-container, .report-container * { visibility: visible; }
          .report-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .bg-gray-50 { background-color: white !important; }
          .shadow-sm, .shadow-lg { box-shadow: none !important; border: 1px solid #ddd; }
        }
        @keyframes grow { from { height: 0; opacity: 0; } to { height: var(--h); opacity: 1; } }
      `}</style>

      {/* Control Panel (No Print) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-medium text-gray-700">Jenis Laporan:</label>
          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 flex-1"
          >
            <option value="SUMMARY">Ringkasan Harian</option>
            <option value="BY_CLASS">Analisis Mengikut Kelas</option>
            <option value="ABSENTEEISM">Senarai Ketidakhadiran</option>
            <option value="RANKING">Ranking Kehadiran Murid</option>
          </select>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
           {reportType !== 'RANKING' && (
             <button
              onClick={handleGenerateAI}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm"
            >
               {loading ? <span className="animate-spin material-symbols-outlined text-sm">refresh</span> : <span className="material-symbols-outlined text-sm">psychology</span>}
               {existingAnalysis ? 'Jana Semula AI' : 'Analisis AI'}
            </button>
           )}
          <button
            onClick={handleDownloadReport}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Excel/CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Cetak
          </button>
        </div>
      </div>

      <div className="report-container space-y-6">
        {/* Report Header */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
            {reportType === 'RANKING' 
              ? `Ranking Kehadiran ${rankingPeriod === 'YEARLY' ? 'Tahunan' : 'Bulanan'}` 
              : 'Laporan Kehadiran Murid'
            }
          </h1>
          <p className="text-indigo-600 font-semibold mt-1">SK Long Panai</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            {reportType === 'RANKING' 
              ? (rankingPeriod === 'YEARLY' 
                  ? `Tahun ${new Date(date).getFullYear()}`
                  : `Bulan ${new Date(date).toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}`)
              : new Date(date).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            }
          </div>
        </div>

        {/* Dynamic Content Based on Selection */}
        <div className={`grid grid-cols-1 ${reportType === 'RANKING' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
          
          {/* Main Chart/Table Area */}
          <div className={`${reportType === 'RANKING' ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-6`}>
            
            {reportType === 'SUMMARY' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500">pie_chart</span>
                  Carta Status Kehadiran
                </h3>
                
                {/* Side by Side Layout for Summary */}
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Left: Donut Chart */}
                    <div className="h-[280px] w-full md:w-1/2 relative">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center">
                            <span className="text-3xl font-bold text-gray-800">{students.length}</span>
                            <span className="block text-xs text-gray-500 uppercase">Jumlah</span>
                        </div>
                    </div>

                    {/* Right: Detailed Grid */}
                    <div className="w-full md:w-1/2 grid grid-cols-2 gap-3">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="text-xs text-emerald-600 font-bold uppercase mb-1">Hadir</div>
                            <div className="text-2xl font-bold text-emerald-800">{stats[AttendanceStatus.PRESENT]}</div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <div className="text-xs text-red-600 font-bold uppercase mb-1">Tidak Hadir</div>
                            <div className="text-2xl font-bold text-red-800">{stats[AttendanceStatus.ABSENT]}</div>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="text-xs text-amber-600 font-bold uppercase mb-1">Lewat</div>
                            <div className="text-2xl font-bold text-amber-800">{stats[AttendanceStatus.LATE]}</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="text-xs text-blue-600 font-bold uppercase mb-1">Kenyataan</div>
                            <div className="text-2xl font-bold text-blue-800">{stats[AttendanceStatus.EXCUSED]}</div>
                        </div>
                        {stats.UNMARKED > 0 && (
                            <div className="col-span-2 p-3 bg-gray-100 rounded-xl border border-gray-200 flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-bold uppercase">Belum Ditanda</span>
                                <span className="text-lg font-bold text-gray-700">{stats.UNMARKED}</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            )}

            {reportType === 'BY_CLASS' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">bar_chart</span>
                  Ranking Kehadiran Mengikut Kelas
                </h3>
                
                {/* Beautified Bar Chart */}
                <div className="h-[400px] w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={classStats} 
                        layout="vertical" 
                        margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
                        barSize={20}
                    >
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100} 
                        tick={{ fontSize: 12, fontWeight: 500, fill: '#4b5563' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar 
                        dataKey="percentage" 
                        fill="url(#barGradient)" 
                        radius={[0, 10, 10, 0]}
                        background={{ fill: '#f3f4f6', radius: [0, 10, 10, 0] }}
                      >
                        <LabelList dataKey="percentage" position="right" formatter={(val: number) => `${val}%`} style={{ fill: '#6b7280', fontSize: 12, fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Kelas</th>
                        <th className="px-6 py-4 text-center">Jumlah Murid</th>
                        <th className="px-6 py-4 text-center">Hadir</th>
                        <th className="px-6 py-4 text-center">Prestasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {classStats.map((c, idx) => (
                        <tr key={c.name} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {idx + 1}
                              </span>
                              {c.name}
                          </td>
                          <td className="px-6 py-4 text-center">{c.total}</td>
                          <td className="px-6 py-4 text-center text-emerald-600 font-bold">{c.hadir}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                c.percentage >= 90 ? 'bg-green-100 text-green-700' :
                                c.percentage >= 80 ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {c.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === 'ABSENTEEISM' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">person_off</span>
                  Senarai Murid Tidak Hadir / Belum Ditanda
                </h3>
                {absentStudents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="bg-red-50 text-red-800 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">Nama Murid</th>
                          <th className="px-4 py-3">Kelas</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {absentStudents.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                            <td className="px-4 py-3">{s.className}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                record?.records[s.id]?.status === AttendanceStatus.ABSENT 
                                  ? 'bg-red-100 text-red-700 border-red-200' 
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {record?.records[s.id]?.status || 'BELUM DITANDA'}
                              </span>
                            </td>
                            <td className="px-4 py-3 italic text-gray-500">
                              {record?.records[s.id]?.remarks || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-green-600 bg-green-50 rounded-xl">
                    <span className="material-symbols-outlined text-3xl mb-2">check_circle</span>
                    <p className="font-medium">Tahniah! Semua murid hadir hari ini.</p>
                  </div>
                )}
              </div>
            )}

            {reportType === 'RANKING' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex flex-col items-center mb-8">
                  <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button 
                      onClick={() => setRankingPeriod('MONTHLY')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${rankingPeriod === 'MONTHLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Bulan Ini
                    </button>
                    <button 
                      onClick={() => setRankingPeriod('YEARLY')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${rankingPeriod === 'YEARLY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Keseluruhan Tahun
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-500">trophy</span>
                    Juara Kehadiran {rankingPeriod === 'YEARLY' ? 'Tahunan' : 'Bulanan'}
                  </h3>
                </div>

                {/* PODIUM ANIMATION */}
                {rankingData.length >= 3 && (
                  <div className="flex justify-center items-end gap-4 mb-12 h-64 pt-8 border-b border-gray-100 pb-8">
                    {/* 2nd Place */}
                    <div className="flex flex-col items-center w-1/4 group">
                       <div className="mb-2 text-center opacity-0 animate-[fade_0.5s_0.5s_forwards]">
                         <p className="font-bold text-gray-700 text-xs sm:text-sm line-clamp-2">{rankingData[1].name}</p>
                         <p className="text-xs text-gray-500">{rankingData[1].presentCount} Hari</p>
                       </div>
                       <div 
                         className="w-full bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-xl relative shadow-md flex items-end justify-center pb-4 h-0 animate-[grow_1s_0.2s_ease-out_forwards]"
                         style={{ '--h': '60%' } as React.CSSProperties}
                       >
                          <span className="text-4xl font-black text-white/50 absolute bottom-2">2</span>
                       </div>
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center w-1/3 z-10 group">
                        <span className="material-symbols-outlined text-yellow-500 text-4xl mb-1 animate-bounce">emoji_events</span>
                        <div className="mb-2 text-center opacity-0 animate-[fade_0.5s_0.5s_forwards]">
                          <p className="font-bold text-gray-800 text-sm sm:text-base line-clamp-2">{rankingData[0].name}</p>
                          <p className="text-xs text-indigo-600 font-bold">{rankingData[0].presentCount} Hari</p>
                        </div>
                        <div 
                          className="w-full bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-xl relative shadow-lg flex items-end justify-center pb-4 h-0 animate-[grow_1s_ease-out_forwards]"
                          style={{ '--h': '80%' } as React.CSSProperties}
                        >
                           <span className="text-5xl font-black text-white/50 absolute bottom-2">1</span>
                        </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="flex flex-col items-center w-1/4 group">
                       <div className="mb-2 text-center opacity-0 animate-[fade_0.5s_0.5s_forwards]">
                         <p className="font-bold text-gray-700 text-xs sm:text-sm line-clamp-2">{rankingData[2].name}</p>
                         <p className="text-xs text-gray-500">{rankingData[2].presentCount} Hari</p>
                       </div>
                       <div 
                         className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-xl relative shadow-md flex items-end justify-center pb-4 h-0 animate-[grow_1s_0.4s_ease-out_forwards]"
                         style={{ '--h': '45%' } as React.CSSProperties}
                       >
                          <span className="text-4xl font-black text-white/50 absolute bottom-2">3</span>
                       </div>
                    </div>
                  </div>
                )}
                <style>{`@keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

                {/* RANKING CHART */}
                <div className="mb-12 w-full" style={{ height: `${Math.max(rankingData.slice(0, 15).length * 40, 300)}px` }}>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 text-center">Visualisasi Prestasi (Top 15)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={rankingData.slice(0, 15)} 
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        barCategoryGap={2}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                        <XAxis type="number" hide />
                        <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={180} 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                        interval={0}
                        />
                        <RechartsTooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="presentCount" radius={[0, 4, 4, 0]} barSize={20}>
                        {rankingData.slice(0, 15).map((entry, index) => (
                            <Cell 
                            key={`cell-${index}`} 
                            fill={
                                index === 0 ? '#fbbf24' : // Gold
                                index === 1 ? '#94a3b8' : // Silver
                                index === 2 ? '#b45309' : // Bronze
                                '#818cf8' // Indigo
                            } 
                            />
                        ))}
                        <LabelList dataKey="presentCount" position="right" style={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* FULL LIST */}
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs tracking-wider">
                      <tr>
                        <th className="px-6 py-4 w-16 text-center">Kedudukan</th>
                        <th className="px-6 py-4">Nama Murid</th>
                        <th className="px-6 py-4">Kelas</th>
                        <th className="px-6 py-4 text-center">Hari Hadir</th>
                        <th className="px-6 py-4 text-center">Peratusan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rankingData.map((s, idx) => (
                        <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${idx < 3 ? 'bg-yellow-50/30' : ''}`}>
                          <td className="px-6 py-4 text-center">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${
                                idx === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                idx === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' :
                                idx === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                'bg-gray-50 text-gray-500'
                            }`}>
                                {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                              {s.className}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-gray-800">
                            {s.presentCount} / {s.totalDays}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                s.percentage === 100 ? 'bg-green-100 text-green-700 ring-1 ring-green-200' :
                                s.percentage >= 80 ? 'bg-blue-50 text-blue-600' :
                                'bg-red-50 text-red-600'
                            }`}>
                                {s.percentage.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Sidebar (Span 1 col) - Only show if NOT Ranking or keep it? */}
          {/* For Layout consistency, we keep it but it might be less relevant for ranking unless we ask AI to analyze ranking. 
              Currently, I'll hide it for RANKING mode to give full width to table */}
          {reportType !== 'RANKING' && (
            <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 h-full">
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-indigo-600">
                    <span className="material-symbols-outlined">auto_awesome</span>
                    </div>
                    <h3 className="text-lg font-bold text-indigo-900">Ulasan Pintar</h3>
                </div>
                
                {existingAnalysis ? (
                    <div className="prose prose-sm prose-indigo text-gray-700">
                    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {existingAnalysis.split('\n').map((line, i) => {
                        if (line.trim() === '') return <br key={i} />;
                        if (line.startsWith('# ')) return <strong key={i} className="block text-base text-indigo-900 mt-2 mb-1">{line.replace(/#/g, '')}</strong>;
                        if (line.startsWith('-') || line.startsWith('*')) return <div key={i} className="flex gap-2 mb-1"><span className="text-indigo-400">•</span><span>{line.replace(/[-*] /, '')}</span></div>;
                        return <p key={i} className="mb-2">{line}</p>;
                        })}
                    </div>
                    <div className="mt-6 pt-4 border-t border-indigo-100 text-xs text-indigo-400 italic">
                        Dijana oleh Google Gemini pada {new Date().toLocaleTimeString()}
                    </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                    <p className="text-sm mb-4">Belum ada analisis dijana untuk data ini.</p>
                    <button 
                        onClick={handleGenerateAI}
                        disabled={loading}
                        className="w-full py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 shadow-sm text-sm font-medium"
                    >
                        {loading ? 'Sedang Menjana...' : 'Jana Analisis Sekarang'}
                    </button>
                    </div>
                )}
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};