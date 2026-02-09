
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, UserRole, AttendanceStatus, SystemSettings, PermitStatus, EditRequest, AccountStatus } from '../types';
import { storage } from '../services/storageService';
import { Users, TrendingUp, AlertCircle, ShieldCheck, Clock, Calendar, Trash2, Plus, UserPlus, UserX, UserCheck, Info, Settings2, HelpCircle, BookOpen, Lock, Unlock, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import CircularTimePicker from '../components/CircularTimePicker';
import { DEFAULT_SETTINGS } from '../constants';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [newHoliday, setNewHoliday] = useState('');
  const [activePicker, setActivePicker] = useState<{ field: keyof SystemSettings; label: string } | null>(null);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isSettingsLocked, setIsSettingsLocked] = useState(true);

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    setIsLoadingRequests(true);
    try {
      const [u, a, e, s] = await Promise.all([
        storage.getUsers(),
        storage.getAttendance(),
        storage.getEditRequests(),
        storage.getSettings()
      ]);
      setUsers(u);
      setAttendance(a);
      setEditRequests(e.filter(r => String(r.status).toLowerCase() === 'pending'));
      setSettings(s);
    } catch (error) {
      console.error("Gagal memuat data admin:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleApproveEdit = async (reqId: string, status: PermitStatus) => {
    try {
      await storage.updateEditRequestStatus(reqId, status);
      await loadData();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: status === PermitStatus.APPROVED ? 'Koreksi absensi telah disetujui.' : 'Koreksi absensi telah ditolak.',
        confirmButtonColor: '#e11d48'
      });
    } catch (error) {
      Swal.fire('Error', 'Gagal memperbarui status koreksi.', 'error');
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday) return;
    if (settings.holidays.includes(newHoliday)) {
      return Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tanggal ini sudah ada dalam daftar libur.' });
    }
    const updatedHolidays = [...settings.holidays, newHoliday].sort();
    const newSettings = { ...settings, holidays: updatedHolidays };
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
    setNewHoliday('');
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Hari libur ditambahkan dan disinkronkan ke seluruh peserta.', timer: 1500, showConfirmButton: false });
  };

  const handleRemoveHoliday = async (date: string) => {
    Swal.fire({
      title: 'Hapus Hari Libur?',
      text: `Hapus ${format(new Date(date), 'dd MMM yyyy')} dari kalender operasional?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updatedHolidays = settings.holidays.filter(h => h !== date);
        const newSettings = { ...settings, holidays: updatedHolidays };
        setSettings(newSettings);
        await storage.saveSettings(newSettings);
      }
    });
  };

  const handleSaveSettings = async () => {
    // Validasi Logika Waktu
    if (settings.clockInEnd <= settings.clockInStart) {
        return Swal.fire('Gagal', 'Batas Terlambat tidak boleh lebih awal dari Buka Absen Masuk.', 'error');
    }
    if (settings.clockOutStart <= settings.clockInEnd) {
        return Swal.fire('Gagal', 'Jam Pulang tidak boleh mendahului jam masuk.', 'error');
    }

    Swal.fire({
      title: 'Aktifkan Jadwal Baru?',
      text: 'Seluruh aplikasi peserta akan disinkronkan dengan jadwal ini secara real-time.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Sinkronkan'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await storage.saveSettings(settings);
        setIsSettingsLocked(true);
        Swal.fire('Tersinkronisasi', 'Konfigurasi waktu telah aktif di semua akun peserta.', 'success');
      }
    });
  };

  const weekdays = [ 
    { id: 1, label: 'Senin' }, { id: 2, label: 'Selasa' }, { id: 3, label: 'Rabu' }, 
    { id: 4, label: 'Kamis' }, { id: 5, label: 'Jumat' }, { id: 6, label: 'Sabtu' }, { id: 0, label: 'Minggu' } 
  ];

  const activeInterns = users.filter(u => u.role === UserRole.USER && u.accountStatus === AccountStatus.ACTIVE);
  const pendingUsers = users.filter(u => u.accountStatus === AccountStatus.PENDING);
  const unassignedCount = activeInterns.filter(u => !u.supervisorId).length;

  return (
    <div className="space-y-8 fade-up pb-10">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Panel Kendali Admin</h1>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manajemen & Sinkronisasi Presensi Terpusat</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border shadow-sm">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sistem Online & Real-time</span>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <VisualStatCard label="Hadir Hari Ini" value={attendance.filter(r => r.date === format(new Date(), 'yyyy-MM-dd')).length} subLabel="Peserta Aktif" icon={<TrendingUp size={20}/>} color="bg-rose-600" />
        <VisualStatCard label="Butuh Aktivasi" value={pendingUsers.length} subLabel="Antrian Pendaftaran" icon={<UserPlus size={20}/>} color="bg-black" />
        <VisualStatCard label="Belum Ada Pembimbing" value={unassignedCount} subLabel="Butuh Penempatan" icon={<AlertCircle size={20}/>} color="bg-orange-500" />
        <VisualStatCard label="Total Peserta" value={activeInterns.length} subLabel="Seluruh Divisi" icon={<Users size={20}/>} color="bg-slate-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Koreksi Absensi Section */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="px-8 py-6 border-b bg-black text-white flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-600 rounded-lg"><ShieldCheck size={16}/></div>
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest">Validasi Koreksi Absensi</h2>
                    <p className="text-[8px] text-white/40 font-bold uppercase mt-0.5 tracking-widest">Persetujuan Perubahan Data Manual</p>
                  </div>
               </div>
               <div className="text-right">
                  <span className="text-[18px] font-black text-rose-500 leading-none">{editRequests.length}</span>
                  <p className="text-[7px] font-black uppercase text-white/40 tracking-widest">Permintaan</p>
               </div>
            </div>

            <div className="mx-6 mt-6 p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
               <div className="bg-white p-2.5 rounded-2xl shadow-sm text-rose-600"><BookOpen size={18} /></div>
               <div className="space-y-1">
                  <h4 className="text-[9px] font-black text-slate-900 uppercase">Cara Memproses Koreksi:</h4>
                  <ul className="text-[9px] text-slate-500 font-medium space-y-1 list-disc pl-4 italic">
                    <li>Periksa alasan permohonan (biasanya karena lupa absen pulang/lembur).</li>
                    <li>Klik <b>"Setujui"</b> untuk mengubah log absensi peserta secara otomatis.</li>
                    <li>Data asli yang salah akan <b>ditimpa</b> dengan jam yang diajukan peserta.</li>
                  </ul>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
              {editRequests.length > 0 ? editRequests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-rose-600 group-hover:text-white transition-all uppercase text-xs">
                           {req.userName.charAt(0)}
                        </div>
                        <div>
                           <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-tight">{req.userName}</h4>
                           <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                             {req.date ? format(new Date(req.date), 'EEEE, dd MMM yyyy', { locale: localeId }) : '-'}
                           </p>
                        </div>
                      </div>
                      <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-right">
                         <p className="text-[10px] font-black text-rose-600 leading-none">{req.requestedIn || '--:--'} - {req.requestedOut || '--:--'}</p>
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Target: {req.requestedStatus}</p>
                      </div>
                   </div>
                   
                   <div className="bg-slate-50/50 p-4 rounded-2xl mb-4 border-l-4 border-rose-500">
                      <p className="text-[9px] text-slate-500 italic leading-relaxed font-bold">" {req.reason} "</p>
                   </div>

                   <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => handleApproveEdit(req.id, PermitStatus.REJECTED)}
                        className="px-6 py-3 text-slate-400 hover:text-rose-600 font-black text-[9px] uppercase tracking-widest transition-all"
                      >
                        Tolak
                      </button>
                      <button 
                        onClick={() => handleApproveEdit(req.id, PermitStatus.APPROVED)}
                        className="px-8 py-3 bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg"
                      >
                        Setujui Koreksi
                      </button>
                   </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                   <ShieldCheck size={80} className="mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest italic">Tidak ada antrian koreksi.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Settings Section */}
        <div className="lg:col-span-4 space-y-6">
          {/* Kalender Libur */}
          <div className="bg-white rounded-[2.5rem] border shadow-sm p-8 space-y-6">
             <div className="flex items-center gap-3 border-b pb-4">
                <Calendar size={18} className="text-rose-600" />
                <h2 className="text-[10px] font-black uppercase tracking-widest">Libur & Cuti Bersama</h2>
             </div>
             
             <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                   <p className="text-[9px] font-black text-slate-900 uppercase">Cara Penggunaan:</p>
                   <p className="text-[8px] text-slate-500 font-bold leading-relaxed italic">
                     Input H-1 atau jauh hari sebelum tanggal libur. Sistem akan **menutup akses** absen peserta dan otomatis mencatat status mereka sebagai **"Cuti Bersama"** di dashboard.
                   </p>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    className="flex-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black outline-none focus:border-rose-600 transition-all"
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                  />
                  <button onClick={handleAddHoliday} className="p-3.5 bg-black text-white rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-black/10">
                    <Plus size={18} />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {settings.holidays.map(date => (
                     <div key={date} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 group">
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">
                          {format(new Date(date), 'EEEE, dd MMM yyyy', { locale: localeId })}
                        </span>
                        <button onClick={() => handleRemoveHoliday(date)} className="text-slate-300 hover:text-rose-600 transition-all p-1">
                           <Trash2 size={14} />
                        </button>
                     </div>
                   ))}
                   {settings.holidays.length === 0 && (
                     <p className="text-center py-10 text-[9px] text-slate-300 font-black uppercase italic tracking-widest">Belum ada hari libur.</p>
                   )}
                </div>
             </div>
          </div>

          <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-xl border-l-8 border-rose-600">
             <div className="flex items-center gap-3 mb-4">
                <Clock size={18} className="text-rose-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Monitor Jam Kerja</h3>
             </div>
             <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                   <p className="text-[8px] font-black text-rose-500 uppercase">Efek Sinkronisasi:</p>
                   <p className="text-[8px] text-white/40 italic font-medium leading-relaxed">
                     Perubahan jam akan langsung merubah batasan waktu di aplikasi Peserta secara real-time.
                   </p>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Shift Masuk</span>
                      <span className="text-xs font-black text-white">{settings.clockInStart} - {settings.clockInEnd}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Shift Pulang</span>
                      <span className="text-xs font-black text-white">{settings.clockOutStart} - {settings.clockOutEnd}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Full Schedule Settings */}
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Settings2 size={120} /></div>
        
        {/* Lock Mechanism Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 relative z-10 border-b pb-6">
           <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight text-slate-900">Sinkronisasi <br/><span className="text-rose-600">Jadwal Kerja</span></h2>
              <div className="flex items-center gap-2 mt-2">
                 <div className="h-1 w-20 bg-rose-600 rounded-full"></div>
                 <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${isSettingsLocked ? 'bg-slate-100 text-slate-400' : 'bg-rose-500 text-white animate-pulse'}`}>
                    {isSettingsLocked ? 'Mode Terkunci' : 'Mode Edit Aktif'}
                 </span>
              </div>
           </div>
           
           <button 
             onClick={() => {
                if(isSettingsLocked) {
                    Swal.fire({
                        title: 'Buka Kunci Pengaturan?',
                        text: 'Berhati-hatilah saat mengubah jadwal kerja aktif.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#000000',
                        confirmButtonText: 'Ya, Buka'
                    }).then(res => res.isConfirmed && setIsSettingsLocked(false));
                } else {
                    setIsSettingsLocked(true);
                }
             }}
             className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isSettingsLocked ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-black text-white hover:bg-rose-600'}`}
           >
              {isSettingsLocked ? <><Lock size={16}/> Buka Kunci Edit</> : <><Unlock size={16}/> Kunci Pengaturan</>}
           </button>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
           <div className="lg:col-span-4 space-y-6">
              <div className={`p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all ${isSettingsLocked ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                   <Calendar size={12} className="text-rose-600" /> Pilih Hari Operasional:
                 </h4>
                 <div className="flex flex-wrap gap-2">
                    {weekdays.map(day => (
                      <button 
                        key={day.id}
                        disabled={isSettingsLocked}
                        onClick={() => {
                          const current = [...settings.operationalDays];
                          const idx = current.indexOf(day.id);
                          if(idx > -1) { if(current.length > 1) current.splice(idx,1); } else current.push(day.id);
                          setSettings({...settings, operationalDays: current.sort()});
                        }}
                        className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${settings.operationalDays.includes(day.id) ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300'}`}
                      >
                        {day.label}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Keterangan Sinkronisasi Detail */}
              <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 space-y-4">
                 <div className="flex items-center gap-2 text-rose-600">
                    <AlertTriangle size={16} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Aturan Sinkronisasi:</h4>
                 </div>
                 <ul className="text-[9px] text-rose-700 font-bold space-y-2 uppercase leading-relaxed tracking-tight">
                    <li className="flex gap-2"><span>•</span> Waktu Terbaik: Lakukan perubahan pada akhir pekan atau malam hari (setelah pukul 20:00 WIB).</li>
                    <li className="flex gap-2"><span>•</span> Keamanan Sesi: Jangan mengubah jadwal saat jam operasional sedang berlangsung untuk menghindari "Lompatan Sesi" pada aplikasi peserta.</li>
                    <li className="flex gap-2"><span>•</span> Validasi: Pastikan jam Buka Masuk selalu lebih awal dari Batas Terlambat.</li>
                 </ul>
              </div>
           </div>

           <div className={`lg:col-span-8 space-y-8 transition-all ${isSettingsLocked ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <AdminTimeInput label="Buka Absen Masuk" value={settings.clockInStart} onOpen={() => setActivePicker({ field: 'clockInStart', label: 'Batas Buka Absen' })} disabled={isSettingsLocked} />
                 <AdminTimeInput label="Batas Terlambat" value={settings.clockInEnd} onOpen={() => setActivePicker({ field: 'clockInEnd', label: 'Mulai Jam Terlambat' })} disabled={isSettingsLocked} />
                 <AdminTimeInput label="Mulai Absen Pulang" value={settings.clockOutStart} onOpen={() => setActivePicker({ field: 'clockOutStart', label: 'Buka Jam Pulang' })} disabled={isSettingsLocked} />
                 <AdminTimeInput label="Sesi Berakhir" value={settings.clockOutEnd} onOpen={() => setActivePicker({ field: 'clockOutEnd', label: 'Sesi Hari Berakhir' })} disabled={isSettingsLocked} />
              </div>

              <div className="p-8 bg-black text-white rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border-t-4 border-rose-600">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-600 rounded-2xl"><Info size={20}/></div>
                    <div className="space-y-1">
                       <h4 className="text-[10px] font-black uppercase tracking-widest">Konfirmasi Penyimpanan</h4>
                       <p className="text-[9px] text-white/50 font-medium tracking-tight">Data akan langsung disinkronkan ke Database Utama dan terlihat di aplikasi Peserta.</p>
                    </div>
                 </div>
                 <button 
                   disabled={isSettingsLocked}
                   onClick={handleSaveSettings}
                   className="w-full md:w-auto px-10 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all shadow-xl disabled:opacity-20"
                 >
                    Aktifkan Jadwal Baru
                 </button>
              </div>
           </div>
        </div>
      </div>

      {activePicker && (
        <CircularTimePicker 
          label={activePicker.label}
          value={settings[activePicker.field] as string}
          onChange={(v) => setSettings({...settings, [activePicker.field]: v})}
          onClose={() => setActivePicker(null)}
        />
      )}
    </div>
  );
};

const VisualStatCard = ({ label, value, subLabel, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center gap-5 transition-all hover:translate-y-[-4px] hover:shadow-lg">
    <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shadow-black/5`}>{icon}</div>
    <div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none my-1 tracking-tighter">{value}</p>
      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{subLabel}</p>
    </div>
  </div>
);

const AdminTimeInput = ({ label, value, onOpen, disabled }: any) => (
  <button 
    onClick={onOpen}
    disabled={disabled}
    className={`bg-slate-50 border-2 border-slate-50 p-6 rounded-3xl text-center space-y-2 group transition-all flex flex-col items-center w-full shadow-sm ${disabled ? 'cursor-not-allowed' : 'hover:border-rose-600 hover:bg-white'}`}
  >
     <p className={`text-[8px] font-black text-slate-400 uppercase tracking-widest transition-colors ${!disabled && 'group-hover:text-rose-600'}`}>{label}</p>
     <div className="text-slate-900 font-black text-xl tracking-widest font-mono">
        {value}
     </div>
     {!disabled && <div className="text-[7px] font-black text-rose-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ubah Jam</div>}
  </button>
);

export default AdminDashboard;
