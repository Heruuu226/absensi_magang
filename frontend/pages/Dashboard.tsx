
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, AttendanceStatus, UserRole, PermitRecord } from '../types';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, FileX, Info } from 'lucide-react';
import { storage } from '../services/storageService';
import { format } from 'date-fns';
// Fix: Import 'id' from the specific locale path 'date-fns/locale/id' instead of the barrel file
import { id } from 'date-fns/locale/id';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [permits, setPermits] = useState<PermitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user.role === UserRole.USER) {
        await storage.syncAlphaStatus(user);
      }
      const [fetchedRecords, fetchedPermits] = await Promise.all([
        storage.getAttendance(),
        storage.getPermits()
      ]);
      setAllRecords(fetchedRecords.filter(r => r.userId === user.id));
      setPermits(fetchedPermits.filter(p => p.userId === user.id));
      setLoading(false);
    };
    loadData();
  }, [user]);

  const records = [...allRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const currentData = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.HADIR:
      case AttendanceStatus.PULANG:
        return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-100"><CheckCircle2 size={12}/> {status}</span>;
      case AttendanceStatus.TERLAMBAT:
        return <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-100"><Clock size={12}/> {status}</span>;
      case AttendanceStatus.IZIN:
      case AttendanceStatus.SAKIT:
        return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-100"><AlertCircle size={12}/> {status}</span>;
      case AttendanceStatus.ALPHA:
      case AttendanceStatus.ALPHA_SYSTEM:
        return <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-100"><FileX size={12}/> {status}</span>;
      default:
        return <span>{String(status)}</span>;
    }
  };

  if (loading) return null;

  const statHadir = allRecords.filter(r => r.status === AttendanceStatus.HADIR || r.status === AttendanceStatus.PULANG).length;
  const statTerlambat = allRecords.filter(r => r.status === AttendanceStatus.TERLAMBAT).length;
  const statAlpha = allRecords.filter(r => r.status === AttendanceStatus.ALPHA || r.status === AttendanceStatus.ALPHA_SYSTEM).length;
  
  const totalDays = differenceInDays(new Date(), new Date(user.startDate)) + 1;

  return (
    <div className="space-y-6 fade-up">
      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
        <h1 className="text-2xl font-extrabold text-black tracking-tight">Halo, {user.name.split(' ')[0]}! 👋</h1>
        <div className="flex items-start gap-4 p-5 bg-black rounded-2xl border border-white/10 text-sm text-white/80 shadow-xl">
          <Info className="shrink-0 text-rose-500 mt-0.5" size={20} />
          <div className="space-y-2">
            <p className="font-black text-white uppercase tracking-widest text-[10px]">Pemberitahuan Sistem Absensi:</p>
            <ul className="space-y-1.5 text-[11px] font-medium leading-relaxed">
              <li>• Tidak absen datang & pulang → <span className="text-rose-500 font-bold">Alpha by system</span></li>
              <li>• Absen datang saja (Lupa Pulang) → <span className="text-rose-500 font-bold">Alpha by system</span></li>
              <li>• Batas absen datang: <span className="font-bold text-white">08:00 - 08:30 WIB</span>.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Hadir" value={statHadir} color="emerald" />
        <StatCard label="Terlambat" value={statTerlambat} color="orange" />
        <StatCard label="Izin" value={permits.filter(p => p.type === 'Izin').length} color="blue" />
        <StatCard label="Sakit" value={permits.filter(p => p.type === 'Sakit').length} color="indigo" />
        <StatCard label="Alpha" value={statAlpha} color="rose" />
        <StatCard label="Total Hari" value={totalDays} color="slate" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-black text-white">
          <h2 className="font-black uppercase text-xs tracking-widest">Aktivitas Terakhir</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-black tracking-widest">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Hari, Tanggal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Datang</th>
                <th className="px-6 py-4">Pulang</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[11px] font-bold">
              {currentData.length > 0 ? currentData.map((record, index) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-300">{(currentPage - 1) * 10 + index + 1}</td>
                  <td className="px-6 py-4 text-black uppercase">
                    {format(new Date(record.date), 'EEEE, dd MMM yyyy', { locale: id })}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                  <td className="px-6 py-4 text-emerald-600">{record.clockIn || '--:--'}</td>
                  <td className="px-6 py-4 text-rose-600">{record.clockOut || '--:--'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Belum ada aktivitas tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string, value: number, color: string }) => {
  const colorMap: Record<string, string> = {
    rose: 'text-rose-600 bg-rose-50',
    orange: 'text-orange-600 bg-orange-50',
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    slate: 'text-black bg-slate-50'
  };
  return (
    <div className={`p-5 rounded-2xl border flex flex-col items-center gap-1 text-center transition-all hover:scale-105 ${colorMap[color]}`}>
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
};

function differenceInDays(dateLeft: Date, dateRight: Date): number {
  return Math.floor((dateLeft.getTime() - dateRight.getTime()) / (1000 * 60 * 60 * 24));
}

export default Dashboard;
