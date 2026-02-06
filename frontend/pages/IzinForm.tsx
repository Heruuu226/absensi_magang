
import React, { useState, useEffect } from 'react';
import { User, PermitStatus, PermitRecord, AttendanceStatus, SystemSettings } from '../types';
import MapView from '../components/MapView';
import { storage } from '../services/storageService';
import { MapPin, FileUp, Loader2, Image as ImageIcon, AlertCircle, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { DEFAULT_SETTINGS } from '../constants';

interface IzinFormProps {
  user: User;
  onSuccess: () => void;
}

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800; 
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
  });
};

const IzinForm: React.FC<IzinFormProps> = ({ user, onSuccess }) => {
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [type, setType] = useState<'Izin' | 'Sakit'>('Izin');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [isHoliday, setIsHoliday] = useState(false);

  useEffect(() => {
    checkStatus();
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err)
    );
  }, []);

  const checkStatus = async () => {
    try {
      const serverTime = await storage.getServerTime();
      const today = serverTime.date;
      
      const [permits, records, settings] = await Promise.all([
        storage.getPermitsByUser(user.id),
        storage.getAttendanceByUser(user.id),
        storage.getSettings()
      ]);

      const existingPermit = permits.find(p => p.date === today);
      const existingRecord = records.find(r => r.date === today);
      
      const hasClockIn = existingRecord && existingRecord.clockIn;
      const isAlphaSystem = existingRecord && existingRecord.status === AttendanceStatus.ALPHA_SYSTEM;
      const holidayFound = settings.holidays.includes(today);

      if (holidayFound) {
        setIsHoliday(true);
        setBlockReason("Hari ini adalah Hari Libur / Cuti Bersama. Pengajuan izin atau sakit tidak diperlukan karena sistem mencatat kehadiran Anda secara otomatis.");
      } else if (existingPermit) {
        setBlockReason("Anda sudah mengirimkan satu pengajuan izin/sakit hari ini.");
      } else if (hasClockIn) {
        setBlockReason("Akses Ditolak: Anda sudah melakukan absensi masuk hari ini. Izin/Sakit tidak bisa diajukan jika sudah melakukan absensi.");
      } else if (isAlphaSystem) {
        setBlockReason("Akses Ditolak: Status Anda hari ini adalah Alpha (Sistem). Silakan hubungi admin jika ini adalah kesalahan.");
      }
    } catch (error) {
      console.error("Gagal memvalidasi status pengajuan:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.type.startsWith('image/')) {
        return Swal.fire('Error', 'Hanya format gambar (JPG/PNG) yang diperbolehkan!', 'error');
      }
      const reader = new FileReader();
      reader.onloadend = () => setFile(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockReason) return;
    if (!file) return Swal.fire('Error', 'Foto bukti (Surat Dokter/Lampiran) wajib diunggah!', 'error');
    if (!reason) return Swal.fire('Error', 'Alasan wajib diisi!', 'error');
    if (!coords) return Swal.fire('Error', 'Akses lokasi diperlukan!', 'error');

    setIsLoading(true);
    try {
      const compressedFile = await compressImage(file);
      const serverTime = await storage.getServerTime();
      
      await storage.savePermit({
        id: `PRM-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        type,
        date: serverTime.date,
        reason,
        fileUrl: compressedFile,
        status: PermitStatus.PENDING,
        lat: coords.lat,
        lng: coords.lng
      });

      await Swal.fire('Berhasil', 'Pengajuan terkirim. Tunggu konfirmasi Admin.', 'success');
      onSuccess();
    } catch (err: any) {
      Swal.fire('Error', 'Gagal mengirim pengajuan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (blockReason) {
    return (
      <div className="max-w-xl mx-auto py-20 px-10 bg-white rounded-[2.5rem] border-b-8 border-rose-600 shadow-2xl text-center space-y-6 fade-up">
        <div className={`w-20 h-20 ${isHoliday ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-full flex items-center justify-center mx-auto`}>
          {isHoliday ? <Calendar size={48} /> : <AlertCircle size={48} />}
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            {isHoliday ? 'Hari Libur / Cuti Bersama' : 'Akses Dibatasi'}
          </h2>
          <p className="text-slate-500 text-[11px] font-bold leading-relaxed uppercase tracking-tight">
            {blockReason}
          </p>
        </div>
        <button onClick={onSuccess} className="w-full py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 fade-down pb-10">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Form Izin / Sakit</h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Wajib Melampirkan Bukti Foto Jelas (JPG/PNG)</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-2xl space-y-8 border-b-8 border-rose-600">
        <div className="grid grid-cols-2 gap-4">
          {['Izin', 'Sakit'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t as any)}
              className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${type === t ? 'bg-rose-600 text-white border-rose-600 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-50'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan / Alasan</label>
          <textarea
            required
            className="w-full p-5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 text-xs font-medium outline-none transition-all h-32"
            placeholder="Tuliskan alasan pengajuan Anda secara detail..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lampiran Foto Bukti</label>
          <div className="relative border-4 border-dashed border-slate-50 rounded-[2rem] p-10 text-center hover:bg-slate-50 transition-all cursor-pointer overflow-hidden min-h-[150px] flex items-center justify-center">
            {file ? (
              <img src={file} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-300">
                <ImageIcon size={40} />
                <p className="text-[9px] font-black uppercase tracking-widest">Klik / Drag Foto Bukti Ke Sini</p>
              </div>
            )}
            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/jpeg,image/png" />
          </div>
        </div>

        {coords && (
          <div className="space-y-2">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={10}/> Verifikasi Lokasi Pengajuan</label>
             <div className="h-40 rounded-2xl overflow-hidden border">
                <MapView lat={coords.lat} lng={coords.lng} />
             </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-600 disabled:opacity-50 shadow-2xl transition-all flex items-center justify-center gap-4"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : 'Kirim Pengajuan Sekarang'}
        </button>
      </form>
    </div>
  );
};

export default IzinForm;
