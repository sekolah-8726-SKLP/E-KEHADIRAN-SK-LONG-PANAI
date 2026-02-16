import { GoogleGenAI } from "@google/genai";
import { Student, DailyRecord, AttendanceStatus } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key tidak dijumpai.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeAttendance = async (
  date: string,
  students: Student[],
  record: DailyRecord
): Promise<string> => {
  try {
    const ai = getClient();
    
    // Prepare data summary for prompt
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    const absentees: string[] = [];
    const latecomers: string[] = [];

    students.forEach(s => {
      const status = record.records[s.id]?.status;
      if (status === AttendanceStatus.PRESENT) presentCount++;
      else if (status === AttendanceStatus.ABSENT) {
        absentCount++;
        absentees.push(`${s.name} (${s.className})`);
      }
      else if (status === AttendanceStatus.LATE) {
        lateCount++;
        latecomers.push(`${s.name} (${s.className})`);
      }
      else if (status === AttendanceStatus.EXCUSED) excusedCount++;
      else {
        // Treat undefined as absent for analysis
        absentCount++; 
        absentees.push(`${s.name} (${s.className}) - Tidak Ditanda`);
      }
    });

    const percentage = ((presentCount / students.length) * 100).toFixed(1);

    const prompt = `
      Bertindak sebagai pelapor data objektif. Jana laporan kehadiran yang ringkas dan padat berdasarkan data yang diberikan sahaja.
      
      ARAHAN PENTING:
      1. JANGAN berikan nasihat, cadangan, atau ulasan subjektif.
      2. Hanya paparkan fakta dan angka.
      3. Gunakan Bahasa Melayu yang formal.
      
      DATA MENTAH:
      Tarikh: ${date}
      Jumlah Murid: ${students.length}
      Peratus Hadir: ${percentage}%
      Hadir: ${presentCount}
      Tidak Hadir: ${absentCount}
      Lewat: ${lateCount}
      Kenyataan: ${excusedCount}

      SENARAI TIDAK HADIR:
      ${absentees.length > 0 ? absentees.join('\n') : 'Tiada'}

      SENARAI LEWAT:
      ${latecomers.length > 0 ? latecomers.join('\n') : 'Tiada'}

      Sila format output anda mengikut struktur berikut (Pastikan guna simbol '#' untuk tajuk dan '-' untuk senarai supaya paparan cantik):

      # Ringkasan Data
      Pada ${date}, kadar kehadiran keseluruhan adalah **${percentage}%**. Seramai **${presentCount}** daripada **${students.length}** murid hadir ke sekolah.

      # Perincian Statistik
      - ✅ Hadir: ${presentCount} orang
      - ❌ Tidak Hadir: ${absentCount} orang
      - ⏰ Lewat: ${lateCount} orang
      - 📝 Kenyataan/Cuti: ${excusedCount} orang

      # Senarai Murid Tidak Hadir
      ${absentees.length > 0 ? '(Senaraikan nama murid di sini menggunakan bullet point "- ")' : '- Tiada'}

      # Senarai Murid Lewat
      ${latecomers.length > 0 ? '(Senaraikan nama murid di sini menggunakan bullet point "- ")' : '- Tiada'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Gagal menjana analisis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, terdapat masalah semasa menghubungi AI. Sila pastikan kunci API sah.";
  }
};