
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, UserRole, AttendanceStatus, SystemSettings, PermitStatus, EditRequest, AccountStatus } from '../types';
import { storage } from '../services/storageService';
import { Users, TrendingUp, AlertCircle, ShieldCheck, Clock, Calendar, Trash2, Plus, UserPlus, UserX, UserCheck } from 'lucide-react';
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

  const activeInterns = users.filter(u => u.role === UserRole.USER && u.accountStatus === AccountStatus.ACTIVE);
  const pendingUsers = users.filter(u => u.accountStatus === AccountStatus.PENDING);
  const inactiveUsers = users.filter(u => u.accountStatus === AccountStatus.INACTIVE);
  const unassignedUsersCount = activeInterns.filter(u => !u.supervisorId).length;

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
      return Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Tanggal ini sudah ada dalam daftar libur/cuti bersama.',
        confirmButtonColor: '#e11d48'
      });
    }
    const updatedHolidays = [...settings.holidays, newHoliday].sort();
    const newSettings = { ...settings, holidays: updatedHolidays };
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
    setNewHoliday('');
    Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: 'Hari libur/cuti bersama telah ditambahkan.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleRemoveHoliday = async (date: string) => {
    Swal.fire({
      title: 'Hapus Hari Libur?',
      text: `Apakah Anda yakin ingin menghapus ${format(new Date(date), 'dd MMM yyyy')} dari daftar libur?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updatedHolidays = settings.holidays.filter(h => h !== date);
        const newSettings = { ...settings, holidays: updatedHolidays };
        setSettings(newSettings);
        await storage.saveSettings(newSettings);
        Swal.fire('Terhapus', 'Daftar libur diperbarui.', 'success');
      }
    });
  };

  const weekdays = [ { id: 1, label: 'Senin' }, { id: 2, label: 'Selasa' }, { id: 3, label: 'Rabu' }, { id: 4, label: 'Kamis' }, { id: 5, label: 'Jumat' }, { id: 6, label: 'Sabtu' }, { id: 0, label: 'Minggu' } ];

  return (
    <div className="space-y-8 fade-up pb-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <VisualStatCard label="Hadir Hari Ini" value={attendance.filter(r => r.date === format(new Date(), 'yyyy-MM-dd')).length} subLabel="Aktif Hari Ini" icon={<TrendingUp size={20}/>} color="bg-rose-600" />
        <VisualStatCard label="Antrian Aktivasi" value={pendingUsers.length} subLabel="Verifikasi Akun" icon={<UserPlus size={20}/>} color="bg-emerald-600" />
        <VisualStatCard label="Butuh Pembimbing" value={unassignedUsersCount} subLabel="Belum Penempatan" icon={<AlertCircle size={20}/>} color="bg-orange-50" />
        <VisualStatCard label="Akun Non-Aktif" value={inactiveUsers.length} subLabel="Tersuspensi" icon={<UserX size={20}/>} color="bg-black" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-[2rem] border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-8 py-5 border-b bg-black text-white flex justify-between items-center">
             <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-rose-500" />
                <h2 className="text-[10px] font-black uppercase tracking-widest">Validasi Koreksi Absensi</h2>
             </div>
             <span className={`${editRequests.length > 0 ? 'bg-rose-600 animate-pulse' : 'bg-slate-700'} px-3 py-1 rounded-full text-[8px] font-black transition-all`}>
                {editRequests.length} Antrian
             </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-50 font-bold">
            {editRequests.length > 0 ? editRequests.map(req => (
              <div key={req.id} className="p-6 hover:bg-slate-50 transition-all space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-black uppercase text-[10px] tracking-tight">{req.userName}</h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">
                      {req.date ? format(new Date(req.date), 'EEEE, dd MMM yyyy', { locale: localeId }) : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600">{req.requestedIn || '--:--'} - {req.requestedOut || '--:--'}</p>
                    <p className="text-[8px] font-black text-rose-500 uppercase">{req.requestedStatus}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-rose-500">
                  <p className="text-[9px] text-slate-500 italic leading-relaxed font-medium">"{req.reason}"</p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                   <button 
                     onClick={() => handleApproveEdit(req.id, PermitStatus.REJECTED)} 
                     className="px-6 py-3 bg-slate-100 text-slate-400 rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
                   >
                     Tolak
                   </button>
                   <button 
                     onClick={() => handleApproveEdit(req.id, PermitStatus.APPROVED)} 
                     className="px-6 py-3 bg-black text-white rounded-xl font-black text-[8px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg"
                   >
                     Setujui & Update
                   </button>
                </div>
              </div>
            )) : (
              <div className="py-32 text-center space-y-4">
                 <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                    <ShieldCheck size={24} />
                 </div>
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                    {isLoadingRequests ? 'Memuat data...' : 'Tidak ada koreksi yang menunggu.'}
                 </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-[2rem] border shadow-sm p-8 space-y-6">
          <div className="pt-4 space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 pb-4 border-b"><Calendar size={14} className="text-rose-600" /> Kalender Hari Libur & Cuti</h2>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black outline-none focus:border-rose-600 transition-all"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
              />
              <button onClick={handleAddHoliday} className="p-3 bg-black text-white rounded-xl hover:bg-rose-600 transition-all"><Plus size={18} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
              {settings.holidays.map(date => (
                <div key={date} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                    {format(new Date(date), 'EEEE, dd MMM yyyy', { locale: localeId })}
                  </span>
                  <button onClick={() => handleRemoveHoliday(date)} className="text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
              {settings.holidays.length === 0 && <p className="text-center py-10 text-[10px] text-slate-300 font-black uppercase italic tracking-widest">Belum ada hari libur diinput.</p>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-black rounded-[2.5rem] p-10 text-white grid grid-cols-1 lg:grid-cols-12 gap-10">
         <div className="lg:col-span-4 space-y-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight">Jadwal Kerja <br/> <span className="text-rose-500">Peserta Magang</span></h2>
            <div className="pt-4 flex flex-wrap gap-2">
               {weekdays.map(day => (
                 <button key={day.id} onClick={() => {
                   const current = [...settings.operationalDays];
                   const idx = current.indexOf(day.id);
                   if(idx > -1) { if(current.length > 1) current.splice(idx,1); } else current.push(day.id);
                   setSettings({...settings, operationalDays: current.sort()});
                 }} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase border transition-all ${settings.operationalDays.includes(day.id) ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}>{day.label}</button>
               ))}
            </div>
         </div>
         <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <AdminTimeInput label="Mulai Absen Masuk" value={settings.clockInStart} onOpen={() => setActivePicker({ field: 'clockInStart', label: 'Mulai Absen Masuk' })} />
               <AdminTimeInput label="Batas Absen Masuk" value={settings.clockInEnd} onOpen={() => setActivePicker({ field: 'clockInEnd', label: 'Batas Absen Masuk' })} />
               <AdminTimeInput label="Awal Absen Pulang" value={settings.clockOutStart} onOpen={() => setActivePicker({ field: 'clockOutStart', label: 'Mulai Absen Pulang' })} />
               <AdminTimeInput label="Batas Sesi Absen" value={settings.clockOutEnd} onOpen={() => setActivePicker({ field: 'clockOutEnd', label: 'Batas Akhir Sesi' })} />
            </div>
            <div className="flex justify-end pt-4">
               <button onClick={async () => { await storage.saveSettings(settings); Swal.fire('Sukses', 'Konfigurasi waktu diperbarui.', 'success'); }} className="px-12 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all shadow-2xl">Simpan Pengaturan</button>
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
  <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-5 transition-all hover:border-rose-200">
    <div className={`p-4 rounded-2xl text-white ${color} shadow-lg shadow-black/5`}>{icon}</div>
    <div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900 leading-none my-1 tracking-tighter">{value}</p>
      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{subLabel}</p>
    </div>
  </div>
);

const AdminTimeInput = ({ label, value, onOpen }: any) => (
  <button 
    onClick={onOpen}
    className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center space-y-3 group hover:border-rose-500 transition-all flex flex-col items-center w-full"
  >
     <p className="text-[8px] font-black text-white/40 uppercase tracking-widest group-hover:text-rose-500">{label}</p>
     <div className="text-white font-black text-xl tracking-widest">
        {value}
     </div>
     <div className="text-[7px] font-black text-rose-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Klik Ubah Dial</div>
  </button>
);

export default AdminDashboard;
