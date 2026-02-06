
import React, { useState, useEffect } from 'react';
import { User, Supervisor } from '../types';
import { storage } from '../services/storageService';
import { Save, Lock, User as UserIcon, Camera, Eye, EyeOff, ShieldCheck, Mail, Phone, School, Briefcase, ChevronDown, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState<User>(({ ...user }));
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ new: false, confirm: false });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const fetchSupervisors = async () => {
      const data = await storage.getSupervisors();
      setSupervisors(data);
    };
    fetchSupervisors();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await storage.saveUser(formData);
        storage.setSession(formData);
        onUpdate(formData);
        Swal.fire({
          icon: 'success',
          title: 'Profil Diperbarui',
          text: 'Data profil Anda telah berhasil disimpan.',
          confirmButtonColor: '#e11d48'
        });
    } catch (err: any) {
        Swal.fire('Gagal', err.message, 'error');
    }
  };

  const handlePasswordChange = async () => {
    if (!passwords.new || !passwords.confirm) {
        return Swal.fire('Peringatan', 'Silakan isi sandi baru dan konfirmasi.', 'warning');
    }
    
    if (passwords.new !== passwords.confirm) {
        return Swal.fire('Gagal', 'Sandi baru dan konfirmasi tidak cocok!', 'error');
    }

    if (passwords.new.length < 6) {
        return Swal.fire('Gagal', 'Sandi minimal harus 6 karakter.', 'error');
    }

    setIsUpdatingPassword(true);
    try {
        const updatedUser = { ...user, ...formData, password: passwords.new };
        await storage.saveUser(updatedUser);
        storage.setSession(updatedUser);
        onUpdate(updatedUser);
        setPasswords({ new: '', confirm: '' });
        Swal.fire({
          icon: 'success',
          title: 'Sandi Berhasil Diubah',
          text: 'Gunakan sandi baru Anda untuk login berikutnya.',
          confirmButtonColor: '#000000'
        });
    } catch (err: any) {
        Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan sandi baru.', 'error');
    } finally {
        setIsUpdatingPassword(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return Swal.fire('Foto Terlalu Besar', 'Maksimal ukuran foto adalah 2MB.', 'error');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-12 fade-up pb-10">
      <div className="flex flex-col items-center gap-8">
        <div className="relative group">
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden bg-slate-50 border-8 border-white shadow-xl">
            {formData.photoUrl ? (
              <img src={formData.photoUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-4xl font-black uppercase">
                {user.name.charAt(0)}
              </div>
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 p-3.5 bg-rose-600 text-white rounded-2xl shadow-lg cursor-pointer hover:bg-black transition-colors ring-4 ring-white">
            <Camera size={22}/>
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{user.name}</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
              <ShieldCheck size={14}/> Akun Magang Aktif
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveProfile} className="bg-white p-10 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
               <UserIcon className="text-rose-600" size={24}/>
               <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Detail Informasi Profil</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ProfileInput label="Nama Lengkap" value={formData.name} icon={<UserIcon size={18}/>} onChange={(v:any) => setFormData({...formData, name: v})} />
              <ProfileInput label="Alamat Email" value={formData.email} icon={<Mail size={18}/>} onChange={(v:any) => setFormData({...formData, email: v})} />
              <ProfileInput label="Kampus / Sekolah" value={formData.university} icon={<School size={18}/>} onChange={(v:any) => setFormData({...formData, university: v})} />
              <ProfileInput label="Jurusan" value={formData.major} icon={<Briefcase size={18}/>} onChange={(v:any) => setFormData({...formData, major: v})} />
              <ProfileInput label="Bagian Magang" value={formData.division} icon={<Briefcase size={18}/>} onChange={(v:any) => setFormData({...formData, division: v})} />
              <ProfileInput label="Nomor WhatsApp" value={formData.phone || ''} icon={<Phone size={18}/>} onChange={(v:any) => setFormData({...formData, phone: v})} />
              
              <div className="space-y-3 md:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pembimbing Lapangan</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-600">
                    <UserIcon size={18}/>
                  </div>
                  <select 
                    value={formData.supervisorId}
                    onChange={(e) => {
                      const selected = supervisors.find(s => s.id === e.target.value);
                      if (selected) setFormData({ ...formData, supervisorId: selected.id, supervisorName: selected.name });
                    }}
                    className="w-full pl-14 pr-10 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-sm font-bold text-slate-900 focus:border-rose-600 focus:bg-white outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="">-- Pilih Nama Pembimbing --</option>
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.division})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={18}/>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button type="submit" className="w-full max-w-sm py-5 bg-black text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-600 transition-all shadow-lg flex items-center justify-center gap-3">
                <Save size={20}/> Perbarui Data Profil
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
              <Lock className="text-rose-600" size={20}/>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Keamanan Password</h2>
            </div>
            <div className="space-y-6">
              <div className="relative">
                <ProfileInput label="Password Baru" type={showPass.new ? "text" : "password"} value={passwords.new} onChange={(v:any) => setPasswords({...passwords, new: v})} />
                <button type="button" onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-5 bottom-4 text-slate-400 hover:text-rose-600">
                   {showPass.new ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
              <div className="relative">
                <ProfileInput label="Konfirmasi Password Baru" type={showPass.confirm ? "text" : "password"} value={passwords.confirm} onChange={(v:any) => setPasswords({...passwords, confirm: v})} />
                <button type="button" onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})} className="absolute right-5 bottom-4 text-slate-400 hover:text-rose-600">
                   {showPass.confirm ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
              <button 
                type="button" 
                onClick={handlePasswordChange}
                disabled={isUpdatingPassword}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              >
                {isUpdatingPassword ? 'Menyimpan...' : <><Lock size={14}/> Simpan Password Baru</>}
              </button>
            </div>
          </div>
          
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] border-l-4 border-rose-600 shadow-xl">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Pusat Bantuan</p>
            <p className="text-[11px] text-slate-400 font-bold leading-relaxed italic">
              "Jika Anda lupa sandi atau mengalami kendala akun, silakan hubungi Admin Semen Padang untuk reset akun secara manual."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileInput = ({ label, value, onChange, icon, type = "text" }: any) => (
  <div className="space-y-2 w-full">
    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
    <div className="relative group">
      {icon && (
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-600 transition-colors">
          {icon}
        </div>
      )}
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange?.(e.target.value)}
        className={`w-full ${icon ? 'pl-14' : 'px-6'} pr-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-sm font-bold text-slate-900 focus:border-rose-600 focus:bg-white outline-none transition-all`} 
      />
    </div>
  </div>
);

export default Profile;
