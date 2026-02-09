
import React, { useState, useEffect } from 'react';
import { Supervisor, User, UserRole } from '../types';
import { storage } from '../services/storageService';
import { Trash2, Edit3, UserCheck, X, Users, ChevronLeft, ChevronRight, GraduationCap, ShieldAlert, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const AdminSupervisorManagement: React.FC = () => {
  const [list, setList] = useState<Supervisor[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<User[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [name, setName] = useState('');
  const [division, setDivision] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [s, u] = await Promise.all([
        storage.getSupervisors(),
        storage.getUsers()
      ]);
      setList(s);
      setAllUsers(u.filter(user => user.role === UserRole.USER));
    };
    loadData();
  }, []);

  const toTitleCase = (str: string) => {
    return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  };

  const handleNameChange = (val: string) => {
    setName(toTitleCase(val));
  };

  const handleDivisionChange = (val: string) => {
    setDivision(val.toUpperCase());
  };

  const handleNumericIdChange = (val: string) => {
    const numericVal = val.replace(/\D/g, '');
    setEmployeeId(numericVal);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !division || !employeeId) return Swal.fire('Gagal', 'Data pembimbing tidak lengkap.', 'error');
    
    const trimmedId = employeeId.trim();

    // VALIDASI: Cek apakah ID Pembimbing sudah ada untuk mencegah overwrite nama
    const isDuplicateId = list.some(s => s.employeeId === trimmedId && s.id !== isEditing);

    if (isDuplicateId) {
      return Swal.fire({
        icon: 'error',
        title: 'ID Pembimbing Sudah Ada!',
        html: `ID <b>${trimmedId}</b> sudah terdaftar di sistem.<br/><br/>Anda tidak dapat mendaftarkan ID yang sama karena akan merusak integritas data pembimbing yang sudah ada.`,
        confirmButtonColor: '#e11d48'
      });
    }

    const supervisorData: Supervisor = { 
      id: isEditing || `S-${Date.now()}`, 
      name, 
      division, 
      employeeId: trimmedId 
    };

    const result = await storage.saveSupervisor(supervisorData);
    
    if (result.success) {
      setList(await storage.getSupervisors());
      setIsEditing(null); setName(''); setDivision(''); setEmployeeId('');
      Swal.fire('Sukses', result.message, 'success');
    } else {
      Swal.fire('Gagal', result.message, 'error');
    }
  };

  const handleEdit = (s: Supervisor) => {
    setIsEditing(s.id); setName(s.name); setDivision(s.division); setEmployeeId(s.employeeId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const assignedUsers = allUsers.filter(u => u.supervisorId === id);
    if (assignedUsers.length > 0) return Swal.fire('Gagal', 'Pembimbing ini masih bertugas membimbing peserta aktif.', 'error');
    
    Swal.fire({
      title: 'Hapus Pembimbing?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await storage.deleteSupervisor(id);
        setList(await storage.getSupervisors());
        Swal.fire('Terhapus', 'Data pembimbing berhasil dihilangkan.', 'success');
      }
    });
  };

  const totalPages = Math.ceil(list.length / itemsPerPage);
  const currentItems = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-10 fade-up pb-20">
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
           <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center text-white shadow-xl">
                 <UserCheck size={28} />
              </div>
              <div>
                 <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
                   {isEditing ? 'Perbarui Data Pembimbing' : 'Pendaftaran Pembimbing'}
                 </h2>
                 <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] mt-2">Database Internal PT Semen Padang</p>
              </div>
           </div>
           {isEditing && (
              <button 
                onClick={() => {setIsEditing(null); setName(''); setDivision(''); setEmployeeId('');}} 
                className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm"
              >
                Batalkan Perubahan
              </button>
           )}
        </div>
        
        <form onSubmit={handleSave} className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
          <SimpleBlockInput label="Nama Lengkap" value={name} onChange={handleNameChange} placeholder="" />
          <SimpleBlockInput label="Unit Kerja / Bidang" value={division} onChange={handleDivisionChange} placeholder="" />
          <SimpleBlockInput label="ID Pembimbing" value={employeeId} onChange={handleNumericIdChange} placeholder="" />
          
          <div className="lg:col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
             <ShieldAlert size={20} className="text-orange-500 shrink-0" />
             <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic uppercase tracking-tighter">ID Pembimbing wajib unik dan tidak boleh sama dengan yang sudah terdaftar.</p>
          </div>

          <button type="submit" className="w-full py-6 bg-rose-600 text-white rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-rose-200">
             {isEditing ? 'Simpan Perubahan' : 'Daftarkan Pembimbing'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><Users size={20} className="text-rose-600" /> Database Pembimbing Aktif</h2>
           <div className="bg-black text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">{list.length} Terdaftar</div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-widest border-b text-[10px]">
              <tr>
                <th className="px-10 py-8">ID & Profil Pembimbing</th>
                <th className="px-6 py-8">Penempatan Unit</th>
                <th className="px-6 py-8 text-center">Peserta</th>
                <th className="px-10 py-8 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-[12px]">
              {currentItems.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                  <td className="px-10 py-7">
                     <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-rose-600 transition-colors">{s.name}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 font-mono">ID: {s.employeeId}</span>
                     </div>
                  </td>
                  <td className="px-6 py-7">
                    <span className="text-slate-500 uppercase font-black text-[11px] tracking-tight">{s.division}</span>
                  </td>
                  <td className="px-6 py-7 text-center">
                     <button 
                       onClick={() => setSelectedParticipants(allUsers.filter(u => u.supervisorId === s.id))} 
                       className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase hover:border-rose-600 transition-all shadow-sm"
                     >
                       {allUsers.filter(u => u.supervisorId === s.id).length} Orang
                     </button>
                  </td>
                  <td className="px-10 py-7 text-right">
                     <div className="flex justify-end gap-3">
                        <button onClick={() => handleEdit(s)} className="p-4 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all border border-slate-100"><Edit3 size={18}/></button>
                        <button onClick={() => handleDelete(s.id)} className="p-4 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-slate-100"><Trash2 size={18}/></button>
                     </div>
                  </td>
                </tr>
              ))}
              {currentItems.length === 0 && (
                <tr>
                   <td colSpan={4} className="py-24 text-center text-slate-300 font-black uppercase tracking-[0.2em] italic">Database pembimbing belum terisi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-10 bg-slate-50/50 border-t flex items-center justify-between">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Halaman {currentPage} Dari {totalPages}</span>
             <div className="flex gap-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:border-rose-600 transition-all"><ChevronLeft size={20}/></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:border-rose-600 transition-all"><ChevronRight size={20}/></button>
             </div>
          </div>
        )}
      </div>

      {selectedParticipants && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedParticipants(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex items-center justify-between bg-black text-white font-black text-sm uppercase tracking-[0.15em]">
              <h3>Daftar Peserta Bimbingan</h3>
              <button onClick={() => setSelectedParticipants(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={28}/></button>
            </div>
            <div className="p-10 max-h-[60vh] overflow-y-auto space-y-5 bg-slate-50/50">
              {selectedParticipants.map(p => (
                <div key={p.id} className="flex items-center gap-6 p-6 bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-md">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0"><GraduationCap size={28}/></div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-slate-900 uppercase truncate mb-1">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight">{p.university}</p>
                  </div>
                </div>
              ))}
              {selectedParticipants.length === 0 && (
                <div className="text-center py-20 text-slate-300">
                  <AlertCircle className="mx-auto mb-4" size={48} />
                  <p className="text-[11px] font-black uppercase tracking-widest italic">Belum ada peserta diplotting.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SimpleBlockInput = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-3">
    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{label}</label>
    <input 
      type="text" 
      placeholder={placeholder} 
      className="w-full p-6 rounded-3xl bg-slate-50 border-2 border-slate-100 text-sm font-black focus:border-rose-600 focus:bg-white outline-none transition-all placeholder:text-slate-200 placeholder:font-normal" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

export default AdminSupervisorManagement;
