
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  LayoutDashboard, 
  UserCircle, 
  LogOut, 
  Users, 
  FileText,
  Menu,
  X,
  Camera,
  FileBadge,
  UserCheck
} from 'lucide-react';
import { COMPANY_NAME, LOGO_SEMEN_PADANG } from '../constants';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activePage: string;
  setActivePage: (page: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activePage, setActivePage, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = user.role === UserRole.ADMIN ? [
    { id: 'admin-dashboard', label: 'Ringkasan', icon: <LayoutDashboard size={18} /> },
    { id: 'admin-supervisors', label: 'Pembimbing', icon: <UserCheck size={18} /> },
    { id: 'admin-users', label: 'Daftar Peserta', icon: <Users size={18} /> },
    { id: 'admin-permits', label: 'Validasi Izin', icon: <FileBadge size={18} /> },
  ] : [
    { id: 'dashboard', label: 'Beranda', icon: <LayoutDashboard size={18} /> },
    { id: 'absen-datang', label: 'Absen Masuk', icon: <Camera size={18} /> },
    { id: 'absen-pulang', label: 'Absen Pulang', icon: <Camera size={18} /> },
    { id: 'izin-sakit', label: 'Form Izin/Sakit', icon: <FileBadge size={18} /> },
    { id: 'report-preview', label: 'Laporan Bulanan', icon: <FileText size={18} /> },
    { id: 'profile', label: 'Profil Saya', icon: <UserCircle size={18} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Header Mobile - Clean & Compact */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white sticky top-0 z-50 border-b shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center bg-white rounded-full border shadow-sm p-1.5 overflow-hidden">
            <img src={LOGO_SEMEN_PADANG} alt="SP" className="w-full h-full object-contain" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Presensi Magang</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-black bg-slate-50 rounded-lg">
          {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* Sidebar - Pro Design */}
      <aside className={`
        fixed inset-0 z-40 md:relative md:z-0 md:flex md:flex-col
        bg-black border-r border-white/10 w-72 transform transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 pb-4">
          <div className="flex flex-col items-center">
             {/* Logo Circle Frame - Ukuran Tetap w-32, Gambar Dibuat Pas Banget */}
             <div className="relative group mb-6">
                <div className="absolute -inset-1 bg-rose-600 rounded-full blur-sm opacity-10 group-hover:opacity-30 transition duration-500"></div>
                <div className="relative flex items-center justify-center bg-white rounded-full shadow-2xl w-32 h-32 overflow-hidden border-2 border-white/20">
                   <img 
                     src={LOGO_SEMEN_PADANG} 
                     alt="Logo SP" 
                     className="w-full h-full object-contain p-2.5 transition-transform duration-500 group-hover:scale-105" 
                   />
                </div>
             </div>
             
             <div className="text-center space-y-1">
                <h1 className="text-[11px] font-black text-white uppercase tracking-[0.25em] leading-tight">Presensi Magang</h1>
                <p className="text-[10px] text-rose-500 font-extrabold uppercase tracking-[0.15em]">{COMPANY_NAME}</p>
             </div>
          </div>
        </div>

        <nav className="p-4 flex flex-col gap-1.5 overflow-y-auto mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActivePage(item.id); setIsSidebarOpen(false); }}
              className={`
                flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all font-bold text-[11px] uppercase tracking-wider
                ${activePage === item.id 
                  ? 'bg-rose-600 text-white shadow-lg' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white'}
              `}
            >
              <span className={activePage === item.id ? 'text-white' : 'text-rose-500'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6 bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <UserCircle size={20} className="text-white/20" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black truncate text-white uppercase tracking-tight">{user.name}</p>
              <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-0.5">
                {user.role === UserRole.ADMIN ? 'Administrator' : 'Peserta'}
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl text-white/40 hover:bg-rose-500/10 hover:text-rose-500 transition-all font-black text-[10px] uppercase tracking-widest">
            <LogOut size={16} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
