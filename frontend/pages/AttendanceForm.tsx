
import React, { useState, useEffect } from 'react';
import { User, AttendanceStatus, AttendanceRecord, PermitRecord, SystemSettings } from '../types';
import CameraView from '../components/CameraView';
import MapView from '../components/MapView';
import { storage } from '../services/storageService';
import { calculateStatus } from '../services/attendanceLogic';
import { Loader2, RefreshCcw, ShieldCheck, AlertCircle, CheckCircle2, Calendar, Clock } from 'lucide-react';
import { format, getDay } from 'date-fns';
import Swal from 'sweetalert2';
import { DEFAULT_SETTINGS } from '../constants';

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
  });
};

const AttendanceForm: React.FC<{ user: User, type: 'in' | 'out', onSuccess: () => void }> = ({ user, type, onSuccess }) => {
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [todayPermit, setTodayPermit] = useState<PermitRecord | null>(null);
  const [serverInfo, setServerInfo] = useState<{ date: string; time: string } | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fungsi untuk memuat data dari server
  const loadSyncData = async () => {
    try {
        const info = await storage.getServerTime();
        setServerInfo(info);
        
        const [records, permits, fetchedSettings] = await Promise.all([
          storage.getAttendanceByUser(user.id),
          storage.getPermitsByUser(user.id),
          storage.getSettings() // Sinkronisasi dengan database admin
        ]);
        
        setSettings(fetchedSettings);
        const foundRecord = records.find(r => r.date === info.date);
        const foundPermit = permits.find(p => p.date === info.date);
        
        setTodayRecord(foundRecord || null);
        setTodayPermit(foundPermit || null);
        setDataLoaded(true);
    } catch (error) {
        console.error("Sync Error:", error);
    }
  };

  useEffect(() => {
    loadSyncData();
    
    // Auto-sync setiap 30 detik untuk memastikan jam & jadwal tetap akurat
    const syncInterval = setInterval(loadSyncData, 30000);
    
    navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
    
    return () => clearInterval(syncInterval);
  }, [user.id]);

  const handleSubmit = async () => {
    if (!photo || !coords) return Swal.fire('Error', 'Foto dan Lokasi wajib ada.', 'error');
    
    setIsLoading(true);
    try {
      const compressedPhoto = await compressImage(photo);
      const serverTime = await storage.getServerTime();
      const currentSettings = await storage.getSettings();

      if (type === 'in') {
        if (todayRecord?.clockIn) throw new Error("Akses ditolak: Anda sudah melakukan absen masuk hari ini.");
        
        const calc = calculateStatus(serverTime.time, currentSettings);
        await storage.saveAttendance({
          id: `ATT-${user.id}-${Date.now()}`, userId: user.id, userName: user.name, date: serverTime.date,
          clockIn: serverTime.time, clockOut: null, status: calc.status, lateMinutes: calc.lateMinutes,
          photoIn: compressedPhoto, photoOut: null, latIn: coords.lat, lngIn: coords.lng, latOut: null, lngOut: null
        });
      } else {
        if (!todayRecord) throw new Error("Akses ditolak: Silakan lakukan absen masuk terlebih dahulu.");
        if (todayRecord.clockOut) throw new Error("Akses ditolak: Anda sudah melakukan absen pulang hari ini.");
        
        await storage.saveAttendance({
          ...todayRecord, clockOut: serverTime.time, photoOut: compressedPhoto, latOut: coords.lat, lngOut: coords.lng, status: AttendanceStatus.PULANG
        });
      }
      
      Swal.fire('Berhasil', 'Presensi berhasil disimpan.', 'success');
      onSuccess();
    } catch (err: any) { 
      Swal.fire('Gagal', err.message, 'error'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (!dataLoaded) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-rose-600" size={40} />
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Memvalidasi Jadwal Kerja...</p>
    </div>
  );

  // LOGIKA BLOKIR OTOMATIS BERDASARKAN JADWAL DARI DATABASE
  let blockReason = "";
  const isHoliday = serverInfo && settings.holidays.includes(serverInfo.date);
  const dayOfWeek = serverInfo ? getDay(new Date(serverInfo.date)) : -1;
  const isOperationalDay = settings.operationalDays.includes(dayOfWeek);

  if (serverInfo) {
    if (isHoliday) {
      blockReason = "Hari ini adalah Hari Libur / Cuti Bersama. Anda tidak perlu melakukan absensi.";
    } else if (!isOperationalDay) {
      blockReason = "Akses Ditolak: Hari ini bukan hari kerja sesuai jadwal yang diatur oleh Admin.";
    } else if (todayPermit) {
      blockReason = "Absensi Ditolak: Anda sudah memiliki pengajuan Izin/Sakit hari ini.";
    } else if (todayRecord?.status === AttendanceStatus.ALPHA_SYSTEM) {
      blockReason = "Absensi Terkunci: Status Anda hari ini adalah Alpha (Sistem). Silakan ajukan koreksi ke Admin jika ini kesalahan.";
    } else if (type === 'in') {
       if (todayRecord?.clockIn) {
         blockReason = "Absensi Ditolak: Anda sudah melakukan Absen Masuk hari ini.";
       } else if (serverInfo.time < settings.clockInStart) {
         blockReason = `Sesi Absen Masuk Belum Dibuka. Jadwal masuk Anda dimulai pukul ${settings.clockInStart} WIB.`;
       }
    } else if (type === 'out') {
       if (!todayRecord) {
         blockReason = "Absensi Ditolak: Silakan lakukan Absen Masuk terlebih dahulu.";
       } else if (todayRecord.clockOut) {
         blockReason = "Absensi Ditolak: Anda sudah melakukan Absen Pulang hari ini.";
       } else if (serverInfo.time < settings.clockOutStart) {
         blockReason = `Belum Waktunya Pulang. Jadwal pulang Anda diatur pukul ${settings.clockOutStart} WIB.`;
       } else if (serverInfo.time > settings.clockOutEnd) {
         blockReason = `Sesi Absen Pulang Sudah Berakhir. Batas akhir sesi hari ini adalah pukul ${settings.clockOutEnd} WIB.`;
       }
    }
  }

  if (blockReason) {
    return (
      <div className="max-w-xl mx-auto space-y-6 fade-up py-10">
        <div className="bg-white p-12 rounded-[3rem] border shadow-2xl text-center space-y-6 border-b-8 border-rose-600">
           <div className={`w-20 h-20 ${isHoliday ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-full flex items-center justify-center mx-auto shadow-inner`}>
              {isHoliday ? <Calendar size={40} /> : <Clock size={40} />}
           </div>
           <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                {isHoliday ? 'Hari Libur Kerja' : 'Sesi Belum Tersedia'}
              </h2>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <p className="text-slate-600 text-[11px] font-bold leading-relaxed uppercase tracking-tight">{blockReason}</p>
              </div>
           </div>
           <button onClick={onSuccess} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-all shadow-xl">Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-10">
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Presensi {type === 'in' ? 'Masuk' : 'Pulang'}</h1>
        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
            <ShieldCheck size={14}/> Waktu Terverifikasi Server
        </p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-2xl space-y-8 border-b-8 border-rose-600">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border text-center">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tanggal</p>
             <p className="font-black text-xs text-black">{serverInfo ? format(new Date(serverInfo.date), 'dd MMM yyyy') : '--'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border text-center">
             <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Jam Server</p>
             <p className="font-black text-xs text-black">{serverInfo ? serverInfo.time : '--:--'} WIB</p>
          </div>
        </div>

        {!photo ? <CameraView onCapture={setPhoto} /> : (
          <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl max-w-[280px] mx-auto group">
            <img src={photo} className="w-full" />
            <button onClick={() => setPhoto(null)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-[10px] uppercase gap-2"><RefreshCcw size={16}/> Ambil Ulang</button>
          </div>
        )}

        <div className="h-40 rounded-2xl overflow-hidden border">
           {coords ? <MapView lat={coords.lat} lng={coords.lng} /> : <div className="h-full flex items-center justify-center bg-slate-50 text-[10px] font-black uppercase text-slate-300">GPS...</div>}
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={isLoading || !photo || !coords} 
          className="w-full py-5 bg-black text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-rose-600 disabled:opacity-30 transition-all flex items-center justify-center gap-3 shadow-xl"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : 'Kirim Presensi Sekarang'}
        </button>
      </div>
    </div>
  );
};

export default AttendanceForm;
