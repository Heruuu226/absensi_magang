
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, AttendanceStatus, PermitStatus, EditRequest } from '../types';
import { storage } from '../services/storageService';
import { Download, FileText, ChevronLeft, ChevronRight, Loader2, Printer, Edit3, X, Send, Clock as ClockIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import { exportAttendancePDF } from '../services/pdfService';
import Swal from 'sweetalert2';
import CircularTimePicker from '../components/CircularTimePicker';

interface ReportPreviewPageProps {
  user: User;
}

const ReportPreviewPage: React.FC<ReportPreviewPageProps> = ({ user }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Edit State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ in: '08:00', out: '17:00', reason: '', status: AttendanceStatus.HADIR });
  const [activePicker, setActivePicker] = useState<'in' | 'out' | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, currentDate]);

  const loadData = async () => {
    try {
        const [attData, reqData] = await Promise.all([
          storage.getAttendanceByUser(user.id),
          storage.getEditRequests()
        ]);
        
        const filteredAtt = attData.filter(r => {
          const d = new Date(r.date);
          return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
        
        setRecords(filteredAtt.sort((a, b) => a.date.localeCompare(b.date)));
        setEditRequests(reqData.filter(req => req.userId === user.id));
    } catch (err) {
        console.error("Gagal memuat data laporan:", err);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
        await exportAttendancePDF(user, records, currentDate.getMonth(), currentDate.getFullYear());
    } finally {
        setIsExporting(false);
    }
  };

  const openEditModal = (r: AttendanceRecord) => {
    const isPending = editRequests.some(req => req.attendanceId === r.id && req.status === PermitStatus.PENDING);
    if (isPending) {
        return Swal.fire({
          icon: 'info',
          title: 'Pengajuan Diproses',
          text: 'Anda sudah mengajukan koreksi untuk tanggal ini dan sedang menunggu validasi admin. Tidak dapat mengirim pengajuan baru sampai pengajuan sebelumnya selesai diproses.',
          confirmButtonColor: '#000000'
        });
    }

    setEditingRecord(r);
    let initialStatus = AttendanceStatus.HADIR;
    if ([AttendanceStatus.IZIN, AttendanceStatus.SAKIT].includes(r.status as AttendanceStatus)) initialStatus = AttendanceStatus.IZIN;
    else if ([AttendanceStatus.ALPHA, AttendanceStatus.ALPHA_SYSTEM].includes(r.status as AttendanceStatus)) initialStatus = AttendanceStatus.ALPHA;

    setEditForm({ 
      in: r.clockIn || '08:00', 
      out: r.clockOut || '17:00', 
      reason: '', 
      status: initialStatus
    });
  };

  const handleRequestEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!editForm.reason.trim()) return Swal.fire('Alasan Wajib Diisi', 'Mohon berikan keterangan mengapa data dikoreksi.', 'warning');

    try {
        await storage.saveEditRequest({
          id: `EDT-${Date.now()}`,
          attendanceId: editingRecord.id,
          userId: user.id,
          userName: user.name,
          date: editingRecord.date,
          requestedIn: editForm.in,
          requestedOut: editForm.out,
          requestedStatus: editForm.status,
          reason: editForm.reason,
          status: PermitStatus.PENDING,
          createdAt: new Date().toISOString()
        });

        Swal.fire('Berhasil', 'Permohonan koreksi telah dikirim ke Admin.', 'success');
        setEditingRecord(null);
        loadData(); 
    } catch (err: any) {
        Swal.fire('Gagal', err.message || 'Gagal mengirim permohonan.', 'error');
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

  return (
    <div className="space-y-8 fade-up pb-10 relative z-0">
      <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border-b-8 border-rose-600">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 justify-center md:justify-start">
            <Printer size={32} className="text-rose-600" />
            Rekap Bulanan
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Periode: {format(currentDate, 'MMMM yyyy', { locale: localeId })}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
          <button onClick={prevMonth} className="p-3 hover:bg-rose-600 rounded-xl transition-all"><ChevronLeft /></button>
          <span className="font-black text-sm uppercase px-4 min-w-[140px] text-center tracking-widest">{format(currentDate, 'MMM yyyy', { locale: localeId })}</span>
          <button onClick={nextMonth} className="p-3 hover:bg-rose-600 rounded-xl transition-all"><ChevronRight /></button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 text-black">
          <h2 className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
            <FileText size={14} className="text-rose-600"/> Log Kehadiran Mandiri
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
                <th className="px-8 py-4">No</th>
                <th className="px-6 py-4">Hari, Tanggal</th>
                <th className="px-6 py-4 text-center">In</th>
                <th className="px-6 py-4 text-center">Out</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-8 py-4 text-right">Koreksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.length > 0 ? records.map((r, i) => {
                const pendingReq = editRequests.find(req => req.attendanceId === r.id && req.status === PermitStatus.PENDING);
                const s = r.status as AttendanceStatus;
                const isAlpha = s === AttendanceStatus.ALPHA_SYSTEM || s === AttendanceStatus.ALPHA;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors text-[11px] font-bold text-black group">
                    <td className="px-8 py-5 text-slate-300 font-medium">{i + 1}</td>
                    <td className="px-6 py-5 uppercase tracking-tighter">{format(new Date(r.date), 'EEEE, dd MMM yyyy', { locale: localeId })}</td>
                    <td className="px-6 py-5 text-center text-emerald-600 font-black">{r.clockIn || '--:--'}</td>
                    <td className="px-6 py-5 text-center text-rose-600 font-black">{r.clockOut || '--:--'}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                        [AttendanceStatus.HADIR, AttendanceStatus.PULANG, AttendanceStatus.CUTI_BERSAMA, AttendanceStatus.TERLAMBAT].includes(s) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        isAlpha ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {[AttendanceStatus.HADIR, AttendanceStatus.PULANG, AttendanceStatus.TERLAMBAT].includes(s) ? 'HADIR' : (isAlpha ? 'ALPHA' : 'IZIN/SAKIT')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       {pendingReq ? (
                         <div className="flex items-center justify-end gap-2 text-rose-500 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 animate-pulse">
                            <ClockIcon size={14} />
                            <span className="text-[9px] font-black uppercase tracking-tight">Pending Admin</span>
                         </div>
                       ) : (
                         <button 
                           type="button"
                           onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(r); }}
                           className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer relative z-20 active:scale-90"
                           title="Edit Baris"
                         >
                           <Edit3 size={18} />
                         </button>
                       )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center text-slate-300 font-black uppercase tracking-widest text-[10px] italic">
                    Belum ada data untuk periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-10 bg-slate-50 border-t flex flex-col items-center gap-6">
          <button 
            onClick={handleExport}
            disabled={isExporting || records.length === 0}
            className="group flex items-center justify-center gap-4 w-full max-w-md py-5 bg-rose-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-rose-600/20 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" /> : <Download size={20} />}
            <span>{isExporting ? 'Exporting PDF...' : 'Unduh Laporan Bulanan (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Modal Koreksi Manual */}
      {editingRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingRecord(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-black text-white flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest leading-none">Koreksi Data Absensi</h3>
                <p className="text-[8px] text-rose-500 font-bold uppercase tracking-widest mt-2">
                  Data: {format(new Date(editingRecord.date), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                </p>
              </div>
              <button type="button" onClick={() => setEditingRecord(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRequestEdit} className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-4 font-black">
                  <div className="space-y-1.5">
                     <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1">Ubah Jam Masuk</label>
                     <button 
                       type="button"
                       onClick={() => setActivePicker('in')}
                       className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-100 text-xs font-black text-left hover:border-rose-600 transition-all text-black"
                     >
                        {editForm.in}
                     </button>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1">Ubah Jam Pulang</label>
                     <button 
                       type="button"
                       onClick={() => setActivePicker('out')}
                       className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-100 text-xs font-black text-left hover:border-rose-600 transition-all text-black"
                     >
                        {editForm.out}
                     </button>
                  </div>
               </div>
               
               <div className="space-y-1.5 font-black">
                  <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1">Status Seharusnya</label>
                  <select 
                    className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-100 text-xs font-black outline-none focus:border-rose-600 transition-all text-black"
                    value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value as AttendanceStatus})}
                  >
                    <option value={AttendanceStatus.HADIR}>Hadir</option>
                    <option value={AttendanceStatus.IZIN}>Izin / Sakit</option>
                    <option value={AttendanceStatus.ALPHA}>Alpha</option>
                  </select>
               </div>

               <div className="space-y-1.5 font-black">
                  <label className="text-[9px] text-slate-400 uppercase tracking-widest ml-1">Keterangan Alasan Koreksi</label>
                  <textarea 
                    required 
                    className="w-full p-5 rounded-xl bg-slate-50 border-2 border-slate-100 text-xs font-bold h-28 outline-none focus:border-rose-600 transition-all text-black" 
                    placeholder="Jelaskan mengapa data ini perlu diperbaiki (contoh: lupa absen pulang karena lembur, dll)..." 
                    value={editForm.reason} 
                    onChange={e => setEditForm({...editForm, reason: e.target.value})} 
                  />
               </div>
               <button 
                 type="submit" 
                 className="w-full py-5 bg-black text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-600 shadow-xl transition-all flex items-center justify-center gap-3"
               >
                 <Send size={14} /> Ajukan Perbaikan Data
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Clock Pickers */}
      {activePicker === 'in' && (
        <CircularTimePicker 
          label="Sesuaikan Jam Datang"
          value={editForm.in}
          onChange={(v) => setEditForm({...editForm, in: v})}
          onClose={() => setActivePicker(null)}
        />
      )}
      {activePicker === 'out' && (
        <CircularTimePicker 
          label="Sesuaikan Jam Pulang"
          value={editForm.out}
          onChange={(v) => setEditForm({...editForm, out: v})}
          onClose={() => setActivePicker(null)}
        />
      )}
    </div>
  );
};

export default ReportPreviewPage;
