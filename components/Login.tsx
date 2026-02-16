import React, { useState } from 'react';

interface Props {
  onLogin: (username: string) => void;
  onGuestLogin: () => void;
}

const VALID_USERS = [
  'AdminGK',
  'GKtahun 1',
  'GKtahun 2&3',
  'GKtahun 4&5',
  'GKtahun 6',
  'GKpra'
];

const DEFAULT_PASSWORD = '123SKLP';
const LOGO_URL = "https://scontent.fbki4-1.fna.fbcdn.net/v/t39.30808-6/291922675_380796547478905_8535586913286842649_n.png?_nc_cat=101&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFadDW9InXx3RxgEGXGrLMcrkpJmWEhgzyuSkmZYSGDPPmWL3khTqBcjF04RfdMm971cuBudBi4LOos3_qktpg0&_nc_ohc=SGOq2X9kpwMQ7kNvwGND6Jt&_nc_oc=AdmJrJ720h72PQK5HHfPSRh9hREAxxIvPviK_fd8fWRRdLrnpT1wWGIY9vnJjNg8ZDvWFF679EeXhHauLZ0Laq9Y&_nc_zt=23&_nc_ht=scontent.fbki4-1.fna&_nc_gid=iua1xyhXHmHpvlI8iIzjVA&oh=00_AftsGPvQao-Y1V3b9PoSSgPP98PanSL3zmM4w5Q-9w3ZAw&oe=69989453";
const BG_IMAGE_URL = "https://scontent.fbki4-1.fna.fbcdn.net/v/t39.30808-6/626190500_1269385825286635_7268788902999315195_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=103&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeGd_qlHb4jawATV12XZ1AiG9XSW320OZQz1dJbfbQ5lDEm6C_Jq6GgFFedX6iyWq_eI-3X8ehVrv2LnYAl-yyCm&_nc_ohc=RO7iESzT5WIQ7kNvwHHUV1L&_nc_oc=AdlhqQnpHJ-kW9sgXQ-6wdhccOKHDeGF8r2Lkm55do81vqWdW3M7LPrEZdqOv_OYYycMNr-MPtrUYjzD1vSlI6Xm&_nc_zt=23&_nc_ht=scontent.fbki4-1.fna&_nc_gid=0RAwT4j3F6ckNi9lJjcGWA&oh=00_AftLcptk3EbCXiLV3_QryoILvJiiC3gbT255agcqPVfmMQ&oe=6999003C";

export const Login: React.FC<Props> = ({ onLogin, onGuestLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username) {
      setError('Sila pilih pengguna.');
      return;
    }

    if (password !== DEFAULT_PASSWORD) {
      setError('Kata laluan tidak sah.');
      return;
    }

    // Success
    onLogin(username);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Layer */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('${BG_IMAGE_URL}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-gray-900/90 backdrop-blur-sm"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 relative z-10 animate-[fade_0.6s_ease-out_forwards]">
        <div className="flex flex-col items-center mb-8">
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-center">E-Hadir SKLP</h1>
          <p className="text-indigo-600 font-medium text-sm mt-1">Sistem Pengurusan Kehadiran Pintar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">ID Pengguna</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors text-[20px]">person</span>
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition-all"
              >
                <option value="" disabled>Pilih Pengguna...</option>
                {VALID_USERS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Kata Laluan</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors text-[20px]">lock</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata laluan"
                className="pl-10 w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-100 animate-pulse">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-300 font-bold rounded-xl text-sm px-5 py-3 text-center transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5"
          >
            Log Masuk
          </button>

          <div className="relative flex items-center justify-center mt-6">
             <div className="border-t border-gray-200 w-full absolute"></div>
             <span className="bg-white/95 px-3 text-xs text-gray-400 uppercase relative z-10 font-medium">Atau</span>
          </div>

          <button
            type="button"
            onClick={onGuestLogin}
            className="w-full flex items-center justify-center gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 focus:ring-4 focus:ring-indigo-100 font-bold rounded-xl text-sm px-5 py-3 text-center transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            Masuk Sebagai Tetamu
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-gray-400 font-medium">
          <p>Hak Cipta Terpelihara &copy; {new Date().getFullYear()} SK Long Panai</p>
        </div>
      </div>
      <style>{`@keyframes fade { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
};