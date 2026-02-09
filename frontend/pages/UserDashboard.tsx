
import React, { useEffect, useState } from 'react';
import { User, AttendanceRecord as Attendance, AttendanceStatus, PermitStatus, SystemSettings } from '../types';
import { storage } from '../services/storageService';
import { Clock, Calendar, X, ShieldCheck, ChevronLeft, ChevronRight, Eye, Briefcase, GraduationCap, UserCheck, Timer, MapPin, Camera, Info, Loader2 } from 'lucide-react';
import { format, eachDayOfInterval, getDay, isAfter, isBefore, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import MapView from '../components/MapView';
import { DEFAULT_SETTINGS } from '../constants';

interface UserDashboardProps {
  user: User;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [stats, setStats] = useState({ hadir: 0, izinSakit: 0, alpha: 0, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingRecord, setViewingRecord] = useState<Attendance | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [monthlyProgress, setMonthlyProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const itemsPerPage = 8;

  const safeFormat = (dateStr: any, fmt: string) => {
    if (!dateStr || dateStr === "0000-00-00") return '-';
    const d = new Date(dateStr);
    return isValid(d) ? format(d, fmt, { locale: localeId }) : '-';
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        storage.syncAlphaStatus(user).catch(e => console.error("Sync in background failed."));
        await loadData();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user.id]);

  const loadData = async () => {
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const [fetchedAllRecords, fetchedPermits, fetchedSettings] = await Promise.all([
        storage.getAttendanceByUser(user.id),
        storage.getPermitsByUser(user.id),
        storage.getSettings()
      ]);
      
      const currentSettings = fetchedSettings || DEFAULT_SETTINGS;
      setSettings(currentSettings);

      const monthlyRecords = (fetchedAllRecords || []).filter(r => {
        const d = new Date(r.date);
        return isValid(d) && d >= start && d <= end;
      }).sort((a, b) => b.date.localeCompare(a.date));

      setRecords(monthlyRecords);

      const approvedPermits = (fetchedPermits || []).filter(p => p.status === PermitStatus.APPROVED);
      
      setStats({
        hadir: (fetchedAllRecords || []).filter(r => [AttendanceStatus.HADIR, AttendanceStatus.PULANG, AttendanceStatus.TERLAMBAT, AttendanceStatus.CUTI_BERSAMA].includes(r.status as AttendanceStatus)).length,
        izinSakit: approvedPermits.length,
        alpha: (fetchedAllRecords || []).filter(r => r.status === AttendanceStatus.ALPHA_SYSTEM || r.status === AttendanceStatus.ALPHA).length,
        total: (fetchedAllRecords || []).length
      });

      const startDateObj = new Date(user.startDate);
      const endDateObj = new Date(user.endDate);

      if (isValid(startDateObj) && isValid(endDateObj)) {
        try {
          const totalWorkingDaysInMonth = eachDayOfInterval({ start, end })
            .filter(day => {
              const dayOfWeek = getDay(day);
              const dateStr = format(day, 'yyyy-MM-dd');
              const isOperational = currentSettings.operationalDays?.includes(dayOfWeek);
              const isHoliday = currentSettings.holidays?.includes(dateStr);
              const isAfterStart = !isBefore(day, startDateObj);
              const isBeforeEnd = !isAfter(day, endDateObj);
              return isOperational && !isHoliday && isAfterStart && isBeforeEnd;
            }).length || 1;

          const attendedDaysInMonth = monthlyRecords.filter(r => [AttendanceStatus.HADIR, AttendanceStatus.PULANG, AttendanceStatus.TERLAMBAT, AttendanceStatus.CUTI_BERSAMA].includes(r.status as AttendanceStatus)).length;
          setMonthlyProgress(Math.min(100, Math.round((attendedDaysInMonth / totalWorkingDaysInMonth) * 100)));
        } catch (e) { setMonthlyProgress(0); }
      }
    } catch (e) {
      console.error("Gagal mengolah data dashboard:", e);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-rose-600" size={48} />
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sinkronisasi Database...</p>
    </div>
  );

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const workingDaysStr = (settings.operationalDays || []).map(d => dayNames[d]).join(', ');

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.HADIR:
      case AttendanceStatus.PULANG:
      case AttendanceStatus.CUTI_BERSAMA:
        return <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">{status === AttendanceStatus.CUTI_BERSAMA ? 'CUTI BERSAMA' : 'HADIR'}</span>;
      case AttendanceStatus.TERLAMBAT:
        return <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-100">TERLAMBAT</span>;
      case AttendanceStatus.IZIN:
      case AttendanceStatus.SAKIT:
        return <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">{String(status).toUpperCase()}</span>;
      case AttendanceStatus.ALPHA_SYSTEM:
      case AttendanceStatus.ALPHA:
        return <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-100">ALPHA</span>;
      default:
        return <span className="text-slate-400 font-bold text-[9px] px-2 uppercase border rounded-full">{String(status)}</span>;
    }
  };

  const currentData = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 fade-up pb-10">
      <div className="bg-black p-8 md:p-10 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-8 border-rose-600 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><GraduationCap size={150} /></div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest"><ShieldCheck size={14} /> Monitoring Kehadiran Aktif</div>
          <h1 className="text-3xl font-black uppercase tracking-tighter leading-tight">Halo, <br className="md:hidden"/> {user.name}</h1>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 text-white/50 text-[9px] font-bold uppercase tracking-widest"><Briefcase size={12} className="text-rose-600" /> {user.division}</div>
            <div className="flex items-center gap-2 text-white/50 text-[9px] font-bold uppercase tracking-widest"><GraduationCap size={12} className="text-rose-600" /> {user.university}</div>
          </div>
        </div>
        <div className="relative z-10 bg-white/5 border border-white/10 px-8 py-5 rounded-3xl backdrop-blur-md">
           <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Status Sesi</p>
           <p className="text-lg font-black text-white">{safeFormat(new Date(), 'EEEE, dd MMM yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden">
             <div className="space-y-6">
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} className="text-rose-600" /> Masa Pelaksanaan Magang</h3>
                   <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Mulai</p>
                        <p className="text-[11px] font-black text-black">{safeFormat(user.startDate, 'dd MMM yyyy')}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200"></div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Selesai</p>
                        <p className="text-[11px] font-black text-black">{safeFormat(user.endDate, 'dd MMM yyyy')}</p>
                      </div>
                   </div>
                </div>
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Timer size={14} className="text-rose-600" /> Sisa Masa Magang</h3>
                   <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-black tracking-tighter">
                        {user.endDate && isValid(new Date(user.endDate)) ? Math.max(0, Math.floor((new Date(user.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '0'}
                      </span>
                      <span className="text-sm font-black text-rose-600 uppercase">Hari Lagi</span>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><UserCheck size={14} className="text-rose-600" /> Pembimbing Lapangan</h3>
                   <div className="bg-black p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white font-black text-sm">{user.supervisorName ? user.supervisorName.charAt(0) : '?'}</div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase">{user.supervisorName || 'Menunggu Penempatan'}</p>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Pembimbing Teknis</p>
                      </div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between items-end mb-2">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kehadiran Bulan Ini</h3>
                      <span className="text-xs font-black text-rose-600">{monthlyProgress}%</span>
                   </div>
                   <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                      <div className="h-full bg-black rounded-full transition-all duration-1000" style={{ width: `${monthlyProgress}%` }}></div>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-black p-6 rounded-[2rem] border border-white/10 flex flex-col md:flex-row gap-6 md:items-center">
             <div className="p-4 bg-rose-600 rounded-2xl text-white shadow-xl shadow-rose-600/20"><Clock size={24} /></div>
             <div className="flex-1 space-y-1">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Informasi Jam Kerja</h4>
                <p className="text-[11px] text-white/60 font-medium tracking-tight">Shift Operasional: <span className="text-white font-black">{settings.clockInStart} - {settings.clockOutStart} WIB</span></p>
                <p className="text-[11px] text-white/60 font-medium tracking-tight">Hari Aktif: <span className="text-rose-500 font-black uppercase tracking-widest">{workingDaysStr || '-'}</span></p>
             </div>
             <div className="hidden md:block w-px h-10 bg-white/10"></div>
             <div className="space-y-1 text-center md:text-right">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none">Batas Telat</p>
                <p className="text-sm font-black text-emerald-500">{settings.clockInEnd}</p>
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
          <StatCard label="Hadir / Cuti" value={stats.hadir} color="emerald" />
          <StatCard label="Izin / Sakit" value={stats.izinSakit} color="blue" />
          <StatCard label="Alpha Sistem" value={stats.alpha} color="rose" />
          <StatCard label="Aktivitas Log" value={stats.total} color="black" />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b flex items-center justify-between bg-slate-50/50">
          <h2 className="font-black text-black uppercase tracking-widest text-[10px] flex items-center gap-2"><Clock size={14} className="text-rose-600" /> Log Aktivitas Presensi (Bulan Berjalan)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] font-bold">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-400 uppercase font-black tracking-widest">
                <th className="px-8 py-4">Hari, Tanggal</th>
                <th className="px-6 py-4 text-center">Masuk / Pulang</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-8 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-4 text-black uppercase">{safeFormat(record.date, 'EEEE, dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-emerald-600">{record.clockIn || '--:--'}</span> / <span className="text-rose-600">{record.clockOut || '--:--'}</span>
                  </td>
                  <td className="px-6 py-4 text-center"><div className="flex justify-center">{getStatusBadge(record.status as AttendanceStatus)}</div></td>
                  <td className="px-6 py-4 font-medium text-slate-400 italic leading-tight">
                    <div className="max-w-[200px] truncate" title={record.note}>
                      {record.note || '-'}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                     <button onClick={() => setViewingRecord(record)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Lihat Detail"><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
              {currentData.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-8 py-10 text-center text-slate-300 italic uppercase">Belum ada aktivitas tercatat untuk periode ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setViewingRecord(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-black text-white flex items-center justify-between font-black text-xs uppercase tracking-widest">
              <h3>Detail Presensi Magang</h3>
              <button onClick={() => setViewingRecord(null)} className="p-2 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex items-start gap-4">
                <Info className="text-rose-600 mt-1 shrink-0" size={24} />
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-xs">Informasi Tambahan</h4>
                  <p className="text-slate-500 font-bold text-[11px] mt-2 italic">"{viewingRecord.note || 'Tidak ada catatan tambahan.'}"</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Camera size={14}/> Foto Absen Masuk</p>
                   <div className="aspect-[3/4] rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                      {viewingRecord.photoIn ? (
                        <img src={viewingRecord.photoIn} className="w-full h-full object-cover" alt="Foto Masuk" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-black text-[9px] uppercase italic">Tidak Ada Foto</div>
                      )}
                   </div>
                   {viewingRecord.clockIn && <p className="text-center text-[11px] font-black text-emerald-600">Jam: {viewingRecord.clockIn}</p>}
                </div>
                
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Camera size={14}/> Foto Absen Pulang</p>
                   <div className="aspect-[3/4] rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                      {viewingRecord.photoOut ? (
                        <img src={viewingRecord.photoOut} className="w-full h-full object-cover" alt="Foto Pulang" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-black text-[9px] uppercase italic">Tidak Ada Foto</div>
                      )}
                   </div>
                   {viewingRecord.clockOut && <p className="text-center text-[11px] font-black text-rose-600">Jam: {viewingRecord.clockOut}</p>}
                </div>
              </div>

              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-t pt-6"><MapPin size={14}/> Verifikasi Lokasi Terakhir</p>
                 <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-sm h-64">
                    {viewingRecord.latIn && viewingRecord.lngIn ? (
                      <MapView lat={viewingRecord.latOut || viewingRecord.latIn} lng={viewingRecord.lngOut || viewingRecord.lngIn} />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-slate-50 text-slate-300 font-black text-[9px] uppercase italic">Lokasi GPS tidak tersedia</div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => {
  const colors: any = { emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100', blue: 'bg-blue-50 text-blue-600 border-blue-100', rose: 'bg-rose-50 text-rose-600 border-rose-100', black: 'bg-black text-white border-white/5' };
  return (
    <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col items-center gap-2 transition-all hover:-translate-y-1.5 ${colors[color] || colors.black}`}>
      <p className={`text-[8px] font-black uppercase tracking-widest text-center ${color === 'black' ? 'text-white/40' : 'opacity-70'}`}>{label}</p>
      <p className="text-3xl font-black tracking-tighter">{value || 0}</p>
    </div>
  );
};

export default UserDashboard;
