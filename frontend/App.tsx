
import React, { useState, useEffect } from 'react';
import { User, UserRole, AccountStatus } from './types';
import { storage } from './services/storageService';
import Layout from './components/Layout';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import AttendanceForm from './pages/AttendanceForm';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminPermitManagement from './pages/AdminPermitManagement';
import AdminSupervisorManagement from './pages/AdminSupervisorManagement';
import IzinForm from './pages/IzinForm';
import ReportPreviewPage from './pages/ReportPreviewPage';
import { Eye, EyeOff, Loader2, ArrowLeft, Mail, Lock, User as UserIcon, Phone, School, Briefcase, GraduationCap, Calendar, ShieldCheck, Check, X, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import { APP_NAME, COMPANY_NAME, LOGO_SEMEN_PADANG } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginView, setIsLoginView] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [regData, setRegData] = useState({
    name: '', email: '', pass: '', phone: '', univ: '', major: '', div: '', start: '', end: ''
  });

  // Password Strength Logic
  const passChecks = {
    length: regData.pass.length >= 6,
    hasLetter: /[a-zA-Z]/.test(regData.pass),
    hasNumber: /[0-9]/.test(regData.pass),
    hasSymbol: /[^a-zA-Z0-9]/.test(regData.pass)
  };

  useEffect(() => {
    const session = storage.getSession();
    if (session) {
      setUser(session);
      setActivePage(session.role === UserRole.ADMIN ? 'admin-dashboard' : 'dashboard');
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { user: foundUser, token } = await storage.login(email.trim(), password);
      if (foundUser.accountStatus === AccountStatus.INACTIVE) throw new Error('Akun dinonaktifkan.');
      if (foundUser.accountStatus === AccountStatus.PENDING) throw new Error('Menunggu aktivasi Admin.');
      storage.setSession(foundUser, token);
      setUser(foundUser);
      setActivePage(foundUser.role === UserRole.ADMIN ? 'admin-dashboard' : 'dashboard');
    } catch (err: any) { Swal.fire('Gagal', err.message, 'error'); }
    finally { setIsLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name || !regData.email || !regData.pass || !regData.univ || !regData.start || !regData.end || !regData.div) {
        return Swal.fire('Peringatan', 'Lengkapi seluruh data wajib (*).', 'warning');
    }
    if (!regData.email.includes('.com')) {
        return Swal.fire('Format Email', 'Email harus menggunakan domain valid (.com)', 'warning');
    }
    if (!Object.values(passChecks).every(Boolean)) {
        return Swal.fire('Password Lemah', 'Pastikan password memenuhi semua kriteria keamanan.', 'warning');
    }

    setIsLoading(true);
    try {
        await storage.registerUser({
            id: `USR-${Date.now()}`,
            name: regData.name, email: regData.email, password: regData.pass,
            role: UserRole.USER, accountStatus: AccountStatus.PENDING, isActive: false,
            university: regData.univ, major: regData.major, division: regData.div,
            phone: regData.phone, startDate: regData.start, endDate: regData.end,
            supervisorId: '', supervisorName: '', createdAt: new Date().toISOString()
        });
        Swal.fire('Berhasil!', 'Pendaftaran terkirim. Tunggu aktivasi admin.', 'success');
        setIsLoginView(true);
    } catch (err: any) { Swal.fire('Gagal', err.message, 'error'); }
    finally { setIsLoading(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-rose-600" size={48} /></div>;

  if (!user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] p-4">
          <div className={`w-full transition-all duration-500 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 ${isLoginView ? 'max-w-md' : 'max-w-4xl'}`}>
            <div className="bg-black pt-12 pb-10 px-8 text-center border-b-8 border-rose-600">
               <div className="flex items-center justify-center bg-white rounded-full w-24 h-24 mx-auto overflow-hidden shadow-xl">
                  <img src={LOGO_SEMEN_PADANG} className="w-full h-full object-contain p-4" alt="Logo" />
               </div>
               <h1 className="text-xl font-black text-white mt-6 uppercase tracking-tighter">{APP_NAME}</h1>
               <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] mt-1">{COMPANY_NAME}</p>
            </div>
            
            <div className="p-8 md:p-12">
              {isLoginView ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Mail size={12}/> Alamat Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-rose-600 focus:bg-white transition-all font-bold text-sm" placeholder="" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock size={12}/> Password</label>
                    <div className="relative">
                        <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-rose-600 focus:bg-white transition-all font-bold text-sm" placeholder="" />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors">
                            {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-rose-600 transition-all shadow-xl">Masuk ke Sistem</button>
                  <p className="text-center text-[10px] font-bold text-slate-400 uppercase">
                    Belum punya akun? <button type="button" onClick={() => setIsLoginView(false)} className="text-rose-800 hover:underline">Daftar</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-8">
                  <div className="flex items-center gap-4 mb-4">
                     <button type="button" onClick={() => setIsLoginView(true)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-black hover:text-white transition-colors"><ArrowLeft size={18}/></button>
                     <div className="space-y-1">
                        <h2 className="text-lg font-black uppercase tracking-tighter">Pendaftaran Peserta Baru</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Silakan lengkapi data magang Anda</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <RegInput 
                      label="Nama Lengkap *" 
                      icon={<UserIcon size={16}/>}
                      value={regData.name} 
                      onChange={(v: string) => {
                        const titleCased = v.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                        setRegData({...regData, name: titleCased});
                      }} 
                    />
                    <RegInput 
                      label="Email Aktif (harus .com) *" 
                      icon={<Mail size={16}/>}
                      type="email" 
                      value={regData.email} 
                      onChange={(v: string) => setRegData({...regData, email: v})} 
                    />
                    
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock size={12}/> Password *</label>
                        <div className="relative">
                            <input 
                              type={showRegPass ? "text" : "password"} 
                              value={regData.pass} 
                              onChange={(e) => setRegData({...regData, pass: e.target.value})} 
                              required 
                              className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-rose-600 focus:bg-white font-bold text-xs transition-all pl-12" 
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <button type="button" onClick={() => setShowRegPass(!showRegPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors">
                                {showRegPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                        {/* Password Strength Indicators */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Info size={10} className="text-rose-600" />
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Syarat Password Kuat:</p>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                <PassCheckItem label="Min. 6 Karakter" valid={passChecks.length} />
                                <PassCheckItem label="Ada Huruf" valid={passChecks.hasLetter} />
                                <PassCheckItem label="Ada Angka" valid={passChecks.hasNumber} />
                                <PassCheckItem label="Ada Simbol" valid={passChecks.hasSymbol} />
                            </div>
                        </div>
                    </div>

                    <RegInput 
                      label="Nomor WhatsApp *" 
                      icon={<Phone size={16}/>}
                      value={regData.phone} 
                      onChange={(v: string) => setRegData({...regData, phone: v.replace(/\D/g, '')})} 
                    />
                    <RegInput 
                      label="Asal Kampus / Sekolah *" 
                      icon={<School size={16}/>}
                      value={regData.univ} 
                      onChange={(v: string) => setRegData({...regData, univ: v.toUpperCase()})} 
                    />
                    <RegInput 
                      label="Jurusan *" 
                      icon={<GraduationCap size={16}/>}
                      value={regData.major} 
                      onChange={(v: string) => setRegData({...regData, major: v.toUpperCase()})} 
                    />
                    
                    <RegInput 
                      label="Divisi Penempatan *" 
                      icon={<Briefcase size={16}/>}
                      value={regData.div} 
                      onChange={(v: string) => setRegData({...regData, div: v.toUpperCase()})} 
                    />

                    <div></div> {/* Grid Spacer */}

                    <RegInput 
                      label="Mulai Magang *" 
                      icon={<Calendar size={16}/>}
                      type="date" 
                      value={regData.start} 
                      onChange={(v: string) => setRegData({...regData, start: v})} 
                    />
                    <RegInput 
                      label="Selesai Magang *" 
                      icon={<Calendar size={16}/>}
                      type="date" 
                      value={regData.end} 
                      onChange={(v: string) => setRegData({...regData, end: v})} 
                    />
                  </div>
                  
                  <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-4">
                    <ShieldCheck className="text-rose-600 shrink-0" size={24} />
                    <p className="text-[10px] text-rose-600 font-bold uppercase leading-relaxed tracking-tight">Data pendaftaran akan divalidasi secara manual oleh Admin PT Semen Padang.</p>
                  </div>

                  <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-rose-600 transition-all shadow-xl">Kirim Pendaftaran</button>
                </form>
              )}
            </div>
          </div>
        </div>
    );
  }

  return <Layout user={user} activePage={activePage} setActivePage={setActivePage} onLogout={() => { storage.setSession(null); setUser(null); }}>{activePage === 'dashboard' ? <UserDashboard user={user} /> : activePage === 'admin-dashboard' ? <AdminDashboard /> : activePage === 'admin-users' ? <AdminUserManagement /> : activePage === 'admin-supervisors' ? <AdminSupervisorManagement /> : activePage === 'admin-permits' ? <AdminPermitManagement /> : activePage === 'absen-datang' ? <AttendanceForm user={user} type="in" onSuccess={() => setActivePage('dashboard')} /> : activePage === 'absen-pulang' ? <AttendanceForm user={user} type="out" onSuccess={() => setActivePage('dashboard')} /> : activePage === 'izin-sakit' ? <IzinForm user={user} onSuccess={() => setActivePage('dashboard')} /> : activePage === 'report-preview' ? <ReportPreviewPage user={user} /> : <Profile user={user} onUpdate={setUser} />}</Layout>;
};

const PassCheckItem = ({ label, valid }: { label: string, valid: boolean }) => (
  <div className={`flex items-center gap-2 ${valid ? 'text-emerald-600' : 'text-slate-300'}`}>
    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${valid ? 'bg-emerald-100' : 'bg-slate-100'}`}>
        {valid ? <Check size={8} strokeWidth={4} /> : <X size={8} strokeWidth={4} />}
    </div>
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </div>
);

const RegInput = ({ label, value, onChange, icon, type = "text" }: { label: string, value: string, onChange: (v: string) => void, icon?: React.ReactNode, type?: string }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">{icon} {label}</label>
    <div className="relative">
        <input 
          type={type} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          required={label.includes('*')} 
          className={`w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-rose-600 focus:bg-white font-bold text-xs transition-all ${icon ? 'pl-12' : ''}`} 
          placeholder=""
        />
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
            {icon}
          </div>
        )}
    </div>
  </div>
);

export default App;
