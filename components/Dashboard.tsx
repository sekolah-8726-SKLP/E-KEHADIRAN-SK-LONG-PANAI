import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  AreaChart, Area, LineChart, Line, LabelList
} from 'recharts';
import { DailyRecord, Student, AttendanceStatus } from '../types';

interface Props {
  record: DailyRecord | undefined;
  students: Student[];
  date: string;
  history: { [date: string]: DailyRecord };
}

type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// Helper: Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-indigo-100 shadow-xl rounded-xl text-sm z-50 min-w-[150px]">
        <p className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-gray-600 font-medium">{entry.name}</span>
             </div>
             <span className="font-bold text-indigo-600 text-base">
               {typeof entry.value === 'number' ? entry.value.toFixed(0) : entry.value}{entry.unit || ''}
             </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<Props> = ({ record, students, date, history }) => {
  const [period, setPeriod] = useState<Period>('DAILY');

  // --- Data Processing Engine ---
  const analysisData = useMemo(() => {
    const targetDate = new Date(date);
    let filteredDates: string[] = [];
    let title = "";

    // 1. Filter Dates based on Period
    if (period === 'DAILY') {
      filteredDates = [date];
      title = `Analisis Harian: ${targetDate.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else if (period === 'WEEKLY') {
      // Get Start of Week (Sunday) and End of Week (Saturday)
      const day = targetDate.getDay();
      const diff = targetDate.getDate() - day; // adjust when day is sunday
      const startOfWeek = new Date(targetDate.setDate(diff));
      const endOfWeek = new Date(targetDate.setDate(diff + 6));
      
      title = `Minggu: ${startOfWeek.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}`;

      // Find all history dates within this range
      filteredDates = Object.keys(history).filter(d => {
        const curr = new Date(d);
        return curr >= startOfWeek && curr <= endOfWeek;
      }).sort();
    } else if (period === 'MONTHLY') {
      const monthStr = date.slice(0, 7); // YYYY-MM
      title = `Bulan: ${targetDate.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}`;
      filteredDates = Object.keys(history).filter(d => d.startsWith(monthStr)).sort();
    } else if (period === 'YEARLY') {
      const yearStr = date.slice(0, 4); // YYYY
      title = `Tahun: ${yearStr}`;
      filteredDates = Object.keys(history).filter(d => d.startsWith(yearStr)).sort();
    }

    // 2. Aggregate Data
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let daysCount = 0;
    
    // For Class Performance Aggregation
    const classAgg: { [cls: string]: { total: number, present: number } } = {};
    
    // For Trend Chart
    const trendMap: { [key: string]: { date: string, label: string, percent: number, count: number } } = {};

    // Initialize Class Aggregation
    students.forEach(s => {
      if (!classAgg[s.className]) classAgg[s.className] = { total: 0, present: 0 };
    });

    filteredDates.forEach(d => {
      const rec = history[d];
      if (!rec) return;

      daysCount++;
      let dailyPresent = 0;

      students.forEach(s => {
        const status = rec.records[s.id]?.status;
        
        // Stats Totals
        if (status === AttendanceStatus.PRESENT) {
          totalPresent++;
          dailyPresent++;
          classAgg[s.className].present++;
        } else if (status === AttendanceStatus.ABSENT) {
          totalAbsent++;
        } else if (status === AttendanceStatus.LATE) {
          totalLate++; // Late counts as present usually, but for stats we count specific tag
           // Note: In some systems Late is Present. Here we count separate for dashboard.
           // If Late is considered Present for % calculation:
           // totalPresent++; 
           // dailyPresent++;
           // classAgg[s.className].present++;
        }
        
        // Always increment denominator for class average calculation
        classAgg[s.className].total++;
      });

      // Build Trend Data Point
      const dateObj = new Date(d);
      let key = d; // Default key is date

      if (period === 'YEARLY') {
        key = d.slice(0, 7); // Group by Month YYYY-MM
      }

      if (!trendMap[key]) {
        trendMap[key] = { 
          date: d, 
          label: period === 'YEARLY' 
            ? dateObj.toLocaleDateString('ms-MY', { month: 'short' }) 
            : dateObj.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
          percent: 0,
          count: 0
        };
      }
      
      // For Yearly, we average the daily percentages later, for others it's direct
      const dailyPct = (dailyPresent / students.length) * 100;
      if (period === 'YEARLY') {
        // Accumulate percentages to average later
        trendMap[key].percent += dailyPct; 
        trendMap[key].count += 1;
      } else {
        trendMap[key].percent = dailyPct;
      }
    });

    // Finalize Trend Data
    const trendData = Object.values(trendMap).map(t => ({
      ...t,
      percent: period === 'YEARLY' ? Math.round(t.percent / t.count) : Math.round(t.percent)
    }));

    // Finalize Class Data
    const classData = Object.entries(classAgg).map(([name, data]) => ({
      name,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage); // Sort descending

    // Averages for Cards
    const avgPresent = daysCount > 0 ? Math.round(totalPresent / daysCount) : 0;
    const avgAbsent = daysCount > 0 ? Math.round(totalAbsent / daysCount) : 0;
    const avgLate = daysCount > 0 ? Math.round(totalLate / daysCount) : 0;
    const overallPercent = students.length > 0 ? Math.round((avgPresent / students.length) * 100) : 0;

    return {
      title,
      stats: { present: avgPresent, absent: avgAbsent, late: avgLate, percent: overallPercent },
      trendData,
      classData,
      hasData: daysCount > 0
    };
  }, [date, history, students, period]);

  // --- Render Helpers ---
  const renderPeriodSelector = () => (
    <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto mb-4 md:mb-0">
      {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            period === p 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {p === 'DAILY' ? 'Harian' : p === 'WEEKLY' ? 'Mingguan' : p === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-bold text-lg">{analysisData.title}</h3>
        {renderPeriodSelector()}
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {period === 'DAILY' ? 'Hadir' : 'Purata Hadir'}
            </p>
            <p className="text-2xl font-bold text-gray-800">{analysisData.stats.present}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
             <span className="material-symbols-outlined text-3xl">cancel</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
               {period === 'DAILY' ? 'Tidak Hadir' : 'Purata T.Hadir'}
            </p>
            <p className="text-2xl font-bold text-gray-800">{analysisData.stats.absent}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
             <span className="material-symbols-outlined text-3xl">schedule</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {period === 'DAILY' ? 'Lewat' : 'Purata Lewat'}
            </p>
            <p className="text-2xl font-bold text-gray-800">{analysisData.stats.late}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl shadow-lg flex items-center justify-between text-white">
          <div>
             <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">Peratus</p>
             <p className="text-3xl font-bold">{analysisData.stats.percent}%</p>
          </div>
          <div className="p-2 bg-white/20 rounded-full">
            <span className="material-symbols-outlined text-2xl">trending_up</span>
          </div>
        </div>
      </div>

      {!analysisData.hasData ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
           <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">event_busy</span>
           <p className="text-gray-500">Tiada data direkodkan untuk tempoh ini.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Chart 1: Trend Over Time */}
             <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500">show_chart</span>
                  Trend Peratusan Kehadiran ({period === 'YEARLY' ? 'Bulanan' : 'Harian'})
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysisData.trendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPeratus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }} 
                        dy={10} 
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }}
                        tickFormatter={(value) => `${value}%`}
                        dx={-5}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <Area 
                        type="monotone" 
                        dataKey="percent" 
                        name="Peratus" 
                        unit="%" 
                        stroke="#4f46e5" 
                        fillOpacity={1} 
                        fill="url(#colorPeratus)" 
                        strokeWidth={3}
                        activeDot={{ r: 6, strokeWidth: 4, stroke: '#e0e7ff', fill: '#4f46e5' }}
                        dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff', fill: '#6366f1' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Chart 2: Class Performance (Beautified) */}
             <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">bar_chart</span>
                  Ranking Kelas (Hadir)
                </h3>
                <div className="flex-1 min-h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={analysisData.classData} 
                      layout="vertical" 
                      margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                      barSize={16}
                    >
                       <defs>
                        <linearGradient id="dashBarGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 11, fontWeight: 500, fill: '#4b5563' }} 
                        width={80} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar 
                        dataKey="percentage" 
                        fill="url(#dashBarGradient)" 
                        radius={[0, 8, 8, 0]}
                        background={{ fill: '#f3f4f6', radius: [0, 8, 8, 0] }}
                      >
                         <LabelList dataKey="percentage" position="right" formatter={(val: number) => `${val}%`} style={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
};