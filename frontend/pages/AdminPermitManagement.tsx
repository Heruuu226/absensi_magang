
import React, { useState, useEffect } from 'react';
import { PermitRecord, PermitStatus } from '../types';
import { storage } from '../services/storageService';
import { CheckCircle, XCircle, Eye, Search, Calendar, User, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

const AdminPermitManagement: React.FC = () => {
  const [permits, setPermits] = useState<PermitRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadPermits = async () => {
      const p = await storage.getPermits();
      setPermits(p.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };
    loadPermits();
  }, []);

  const updateStatus = async (permitId: string, status: PermitStatus) => {
    await storage.updatePermitStatus(permitId, status);
    const p = await storage.getPermits();
    setPermits(p.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    Swal.fire({
      icon: 'success',
      title: status === PermitStatus.APPROVED ? 'Disetujui' : 'Ditolak',
      text: `Status pengajuan telah diperbarui dan akan mempengaruhi data kehadiran.`,
      confirmButtonColor: '#e11d48'
    });
  };

  const viewDocument = (url: string) => {
    Swal.fire({
      title: 'Berkas Lampiran',
      imageUrl: url,
      imageAlt: 'Dokumen Bukti',
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#0f172a'
    });
  };

  const filtered = permits.filter(p => 
    p.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByDate = filtered.reduce((acc: any, permit) => {
    if (!acc[permit.date]) acc[permit.date] = [];
    acc[permit.date].push(permit);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 fade-up">
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Validasi Pengajuan Peserta</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {permits.filter(p => p.status === PermitStatus.PENDING).length} Pengajuan Menunggu Persetujuan
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input 
            type="text" 
            placeholder="Cari Nama Peserta..."
            className="w-full md:w-72 pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-rose-500 font-bold text-xs uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-8">
        {sortedDates.map(date => (
          <div key={date} className="space-y-4">
             <div className="flex items-center gap-3 px-2">
                <div className="bg-rose-100 p-2 rounded-xl">
                   <Calendar size={14} className="text-rose-600" />
                </div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.1em]">
                    Log Pengajuan: {format(new Date(date), 'EEEE, dd MMMM yyyy', { locale: id })}
                </h3>
             </div>

             <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b text-slate-400 uppercase font-black tracking-widest">
                      <th className="px-6 py-4">Peserta Magang</th>
                      <th className="px-6 py-4 text-center">Tipe</th>
                      <th className="px-6 py-4">Alasan / Keterangan</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupedByDate[date].map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-3">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-300">
                                <User size={14} />
                             </div>
                             <span className="font-black text-slate-900 uppercase tracking-tight">{p.userName}</span>
                           </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${p.type === 'Sakit' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                           <div className="flex items-start gap-2 max-w-[200px]">
                              <FileText size={12} className="text-slate-300 mt-0.5 shrink-0" />
                              <span className="text-slate-500 font-medium leading-tight line-clamp-2">{p.reason}</span>
                           </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                            p.status === PermitStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            p.status === PermitStatus.PENDING ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => viewDocument(p.fileUrl)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all">
                              <Eye size={14} />
                            </button>
                            {p.status === PermitStatus.PENDING && (
                              <>
                                <button onClick={() => updateStatus(p.id, PermitStatus.APPROVED)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                                  <CheckCircle size={14} />
                                </button>
                                <button onClick={() => updateStatus(p.id, PermitStatus.REJECTED)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPermitManagement;
