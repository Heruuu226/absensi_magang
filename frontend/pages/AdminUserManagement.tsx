
import React, { useState, useEffect } from 'react';
import { User, AccountStatus, UserRole, AttendanceRecord, Supervisor } from '../types';
import { storage } from '../services/storageService';
import { Search, X, Eye, GraduationCap, EyeOff, UserX, UserCheck, CalendarDays, Briefcase, School, Phone, MessageCircle, MapPin, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';

const AddressDisplay: React.FC<{ lat: number | null, lng: number | null }> = ({ lat, lng }) => {
  const [address, setAddress] = useState<string>('Mencari lokasi...');

  useEffect(() => {
    if (!lat || !lng) {
      setAddress('Lokasi tidak tersedia');
      return;
    }

    const fetchAddress = async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
          headers: { 'Accept-Language': 'id' }
        });
        const data = await response.json();
        const display = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setAddress(display);
      } catch (error) {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    };

    fetchAddress();
  }, [lat, lng]);

  return (
    <div className="flex items-start gap-1.5 text-slate-500">
      <MapPin size={10} className="shrink-0 mt-0.5 text-rose-500" />
      <span className="text-[9px] leading-relaxed line-clamp-2 italic">{address}</span>
    </div>
  );
};

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRecords, setUserRecords] = useState<AttendanceRecord[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => { 
    loadData();
  }, []);

  const loadData = async () => {
    const [u, s] = await Promise.all([
      storage.getUsers(),
      storage.getSupervisors()
    ]);
    setUsers(u.filter(user => user.role !== UserRole.ADMIN));
    setSupervisors(s);
  };

  const handleAssignSupervisor = async (userId: string, supervisorId: string) => {
    const user = users.find(u => u.id === userId);
    const supervisor = supervisors.find(s => s.id === supervisorId);
    
    if (!user) return;
    
    const updatedUser = { 
      ...user, 
      supervisorId: supervisor ? supervisor.id : '',
      supervisorName: supervisor ? supervisor.name : ''
    };

    await storage.saveUser(updatedUser);
    loadData();
    
    if (supervisor) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Penempatan pembimbing berhasil untuk ${user.name}`,
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  const togglePasswordVisibility = async (id: string) => {
    if (showPasswords[id]) {
      setShowPasswords(prev => ({ ...prev, [id]: false }));
      return;
    }

    const { value: pin } = await Swal.fire({
      title: 'Validasi Keamanan Admin',
      input: 'password',
      inputLabel: 'Masukkan Password',
      inputPlaceholder: 'Kode Akses...',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonText: 'Batal'
    });

    if (pin === 'Admin123!') {
      setShowPasswords(prev => ({ ...prev, [id]: true }));
    } else if (pin) {
      Swal.fire('Gagal', 'Kode verifikasi salah.', 'error');
    }
  };

  const handleActivation = (userId: string, status: AccountStatus) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const actionText = status === AccountStatus.ACTIVE ? 'Mengaktifkan' : 'Menonaktifkan';
    
    Swal.fire({
      title: `${actionText} Akun?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: status === AccountStatus.ACTIVE ? '#10B981' : '#e11d48',
      confirmButtonText: 'Ya'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await storage.saveUser({ ...user, accountStatus: status, isActive: status === AccountStatus.ACTIVE });
        loadData();
        Swal.fire('Selesai', 'Status akun diperbarui.', 'success');
      }
    });
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    Swal.fire({
      title: 'Hapus Akun Peserta?',
      html: `Seluruh data absensi, izin, dan koreksi milik <b>${user.name}</b> akan dihapus <b>PERMANEN</b> dari sistem untuk menghemat storage!<br/><br/><small class="text-rose-600 font-bold uppercase tracking-widest">Tindakan ini tidak dapat dibatalkan.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Permanen',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await storage.deleteUser(userId);
          loadData();
          Swal.fire('Terhapus', 'Akun dan seluruh data terkait telah dibersihkan dari database.', 'success');
        } catch (err: any) {
          Swal.fire('Gagal', err.message || 'Terjadi kesalahan saat menghapus user.', 'error');
        }
      }
    });
  };

  const openUserDetail = async (user: User) => {
    const records = (await storage.getAttendanceByUser(user.id)).sort((a, b) => b.date.localeCompare(a.date));
    setUserRecords(records);
    setSelectedUser(user);
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const groupedUsers: Record<string, User[]> = supervisors.reduce((acc, s) => {
    acc[s.id] = filteredUsers.filter(u => u.supervisorId === s.id);
    return acc;
  }, {} as Record<string, User[]>);

  const unassignedUsers = filteredUsers.filter(u => !u.supervisorId);

  return (
    <div className="space-y-8 fade-up pb-10">
      <div className="bg-white px-8 py-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">Database Peserta Magang</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Struktur Data Berdasarkan Pembimbing Lapangan</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input type="text" placeholder="Cari Nama..." className="w-full md:w-80 pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border-none focus:ring-1 focus:ring-rose-500 font-black text-[10px] uppercase transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {supervisors.map(s => {
        const usersInGroup = groupedUsers[s.id];
        if (usersInGroup.length === 0 && !searchTerm) return null;

        return (
          <div key={s.id} className="space-y-4">
            <div className="flex items-center gap-3 px-4">
               <div className="bg-black p-2.5 rounded-xl text-white shadow-lg">
                  <UserCheck size={16} />
               </div>
               <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Pembimbing: {s.name}</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Unit: {s.division} — {usersInGroup.length} Peserta</p>
               </div>
            </div>

            <UserTable 
              data={usersInGroup} 
              supervisors={supervisors} 
              onAssign={handleAssignSupervisor}
              onTogglePass={togglePasswordVisibility}
              showPasswords={showPasswords}
              onActivate={handleActivation}
              onDelete={handleDeleteUser}
              onDetail={openUserDetail}
            />
          </div>
        );
      })}

      {unassignedUsers.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
           <div className="flex items-center gap-3 px-4">
              <div className="bg-rose-600 p-2.5 rounded-xl text-white shadow-lg">
                 <X size={16} />
              </div>
              <div>
                 <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Belum Mendapat Pembimbing</h3>
                 <p className="text-[8px] text-rose-500 font-bold uppercase mt-1">{unassignedUsers.length} Peserta Butuh Penempatan</p>
              </div>
           </div>

           <UserTable 
              data={unassignedUsers} 
              supervisors={supervisors} 
              onAssign={handleAssignSupervisor}
              onTogglePass={togglePasswordVisibility}
              showPasswords={showPasswords}
              onActivate={handleActivation}
              onDelete={handleDeleteUser}
              onDetail={openUserDetail}
            />
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedUser(null)}></div>
          <div className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-black text-white font-black text-xs uppercase">
              <div className="flex items-center gap-4">
                <GraduationCap size={24}/>
                <div>
                   <h3>{selectedUser.name}</h3>
                   <p className="text-[9px] text-rose-500">{selectedUser.university}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/10 rounded-xl"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Informasi Kontak</h4>
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Phone size={20}/>
                     </div>
                     <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Nomor WhatsApp</p>
                        <p className="text-sm font-black text-slate-900">{selectedUser.phone || 'Tidak dicantumkan'}</p>
                     </div>
                  </div>
               </div>
               <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-[10px] font-bold">
                  <thead className="bg-slate-100 text-slate-500 uppercase font-black tracking-widest border-b">
                    <tr>
                      <th className="px-6 py-4">Hari, Tanggal</th>
                      <th className="px-6 py-4 text-center">Masuk / Pulang</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4">Lokasi Presensi (Maps)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 uppercase">
                    {userRecords.slice(0, 15).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">{format(new Date(r.date), 'EEEE, dd MMM yyyy', { locale: localeId })}</td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="text-emerald-600">{r.clockIn || '--:--'}</span> / <span className="text-rose-600">{r.clockOut || '--:--'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded-full border bg-slate-50 text-[8px] whitespace-nowrap">{r.status}</span>
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">
                           <AddressDisplay lat={r.latIn} lng={r.lngIn} />
                        </td>
                      </tr>
                    ))}
                    {userRecords.length === 0 && (
                       <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-300 italic uppercase">Belum ada riwayat absensi.</td>
                       </tr>
                    )}
                  </tbody>
                </table>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface UserTableProps {
  data: User[];
  supervisors: Supervisor[];
  onAssign: (uid: string, sid: string) => void;
  onTogglePass: (uid: string) => void;
  showPasswords: Record<string, boolean>;
  onActivate: (uid: string, s: AccountStatus) => void;
  onDelete: (uid: string) => void;
  onDetail: (u: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({ data, supervisors, onAssign, onTogglePass, showPasswords, onActivate, onDelete, onDetail }) => {
  if (data.length === 0) return (
    <div className="bg-white rounded-[2rem] border border-dashed py-10 text-center">
       <p className="text-[9px] font-black text-slate-300 uppercase italic">Tidak ada peserta ditemukan.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-400 uppercase font-black tracking-widest text-[9px]">
              <th className="px-6 py-4">Informasi Peserta</th>
              <th className="px-6 py-4">Pendidikan & Unit</th>
              <th className="px-6 py-4">Masa Magang</th>
              <th className="px-6 py-4 text-center">Sandi</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Kelola</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[10px] font-bold">
            {data.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 uppercase leading-none text-xs">{u.name}</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{u.email}</span>
                    {u.phone && (
                      <a 
                        href={`https://wa.me/${u.phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-600 font-black uppercase mt-2 tracking-tight hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 bg-emerald-50 w-fit px-3 py-1.5 rounded-xl border border-emerald-100"
                      >
                        <MessageCircle size={12} /> {u.phone}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1.5">
                     <div className="flex items-center gap-2 text-slate-600">
                        <School size={12} className="text-rose-600 shrink-0" />
                        <span className="uppercase tracking-tight truncate max-w-[180px]">{u.university}</span>
                     </div>
                     <div className="flex items-center gap-2 text-slate-400">
                        <Briefcase size={11} className="shrink-0" />
                        <span className="uppercase tracking-tight truncate max-w-[180px]">{u.division || 'Belum Penempatan'}</span>
                     </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl inline-flex flex-col items-center">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                         <CalendarDays size={12} className="text-black" />
                         <span className="text-[8px] font-black uppercase">Periode</span>
                      </div>
                      <span className="text-black whitespace-nowrap text-[9px]">
                        {format(new Date(u.startDate), 'dd MMM yy')} — {format(new Date(u.endDate), 'dd MMM yy')}
                      </span>
                   </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                     <span className={`font-mono text-[10px] tracking-tight ${showPasswords[u.id] ? 'text-rose-600 font-black' : 'text-slate-400'}`}>
                       {showPasswords[u.id] ? u.password : '••••••••'}
                     </span>
                     <button onClick={() => onTogglePass(u.id)} className="text-slate-300 hover:text-rose-600">
                       {showPasswords[u.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                     </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                   <span className={`px-3 py-1.5 rounded-full font-black text-[8px] uppercase tracking-widest border ${
                     u.accountStatus === AccountStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                     u.accountStatus === AccountStatus.PENDING ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                     'bg-rose-50 text-rose-600 border-rose-100'
                   }`}>
                     {u.accountStatus}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <select 
                      value={u.supervisorId || ''} 
                      onChange={(e) => onAssign(u.id, e.target.value)}
                      className="p-2.5 rounded-xl border font-black text-[9px] uppercase transition-all outline-none bg-white hover:border-rose-600 w-32"
                    >
                      <option value="">Ganti Pembimbing</option>
                      {supervisors.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {(u.accountStatus === AccountStatus.PENDING || u.accountStatus === AccountStatus.INACTIVE) && (
                      <button onClick={() => onActivate(u.id, AccountStatus.ACTIVE)} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-black transition-all" title="Verifikasi / Aktifkan">
                         <UserCheck size={14}/>
                      </button>
                    )}
                    {u.accountStatus === AccountStatus.ACTIVE && (
                      <button onClick={() => onActivate(u.id, AccountStatus.INACTIVE)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all" title="Non-aktifkan">
                         <UserX size={14}/>
                      </button>
                    )}
                    <button onClick={() => onDetail(u)} className="p-2.5 bg-slate-100 text-slate-400 hover:bg-black hover:text-white rounded-xl transition-all" title="Detail Riwayat">
                       <Eye size={14}/>
                    </button>
                    <button onClick={() => onDelete(u.id)} className="p-2.5 bg-rose-600 text-white rounded-xl hover:bg-black transition-all shadow-md" title="Hapus Akun Permanen">
                       <Trash2 size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserManagement;
