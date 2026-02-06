
import { User, AttendanceRecord, UserRole, AttendanceStatus, AccountStatus, SystemSettings, PermitRecord, PermitStatus, Supervisor, EditRequest } from '../types';
import { format, eachDayOfInterval, getDay, isBefore } from 'date-fns';
import { DEFAULT_SETTINGS } from '../constants';

const API_URL = 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('pro_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const storage = {
  getServerTime: async (): Promise<{ iso: string; time: string; date: string }> => {
    try {
      const res = await fetch(`${API_URL}/time`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (e) {
      const now = new Date();
      return { 
        iso: now.toISOString(), 
        time: format(now, 'HH:mm'), 
        date: format(now, 'yyyy-MM-dd') 
      };
    }
  },

  getSupervisors: async (): Promise<Supervisor[]> => {
    const res = await fetch(`${API_URL}/supervisors`, { headers: getHeaders() });
    return res.ok ? await res.json() : [];
  },

  saveSupervisor: async (s: Supervisor): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/supervisors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(s)
    });
    return { success: res.ok, message: res.ok ? 'Berhasil' : 'Gagal' };
  },

  deleteSupervisor: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/supervisors/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
    return res.ok ? await res.json() : [];
  },

  saveUser: async (user: User): Promise<void> => {
    await fetch(`${API_URL}/users/update`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user)
    });
  },

  deleteUser: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  registerUser: async (user: User): Promise<void> => {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal mendaftar');
    }
  },

  getAttendance: async (): Promise<AttendanceRecord[]> => {
    const res = await fetch(`${API_URL}/attendance`, { headers: getHeaders() });
    return res.ok ? await res.json() : [];
  },

  saveAttendance: async (record: AttendanceRecord): Promise<void> => {
    await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record)
    });
  },

  getAttendanceByUser: async (userId: string): Promise<AttendanceRecord[]> => {
    const res = await fetch(`${API_URL}/attendance/${userId}`, { headers: getHeaders() });
    return res.ok ? await res.json() : [];
  },

  setSession: (user: User | null, token?: string): void => {
    if (user) {
        localStorage.setItem('pro_session', JSON.stringify(user));
        if (token) localStorage.setItem('pro_token', token);
    } else {
        localStorage.removeItem('pro_session');
        localStorage.removeItem('pro_token');
    }
  },

  getSession: (): User | null => {
    const s = localStorage.getItem('pro_session');
    return s ? JSON.parse(s) : null;
  },

  getSettings: async (): Promise<SystemSettings> => {
    const s = localStorage.getItem('pro_settings');
    return s ? JSON.parse(s) : DEFAULT_SETTINGS;
  },

  saveSettings: async (settings: SystemSettings): Promise<void> => {
    localStorage.setItem('pro_settings', JSON.stringify(settings));
  },

  getPermits: async (): Promise<PermitRecord[]> => {
    const res = await fetch(`${API_URL}/permits`, { headers: getHeaders() });
    return res.ok ? await res.json() : [];
  },

  getPermitsByUser: async (userId: string): Promise<PermitRecord[]> => {
    const res = await fetch(`${API_URL}/permits/${userId}`, { headers: getHeaders() });
    return res.ok ? await res.json() : [];
  },

  savePermit: async (permit: PermitRecord): Promise<void> => {
    await fetch(`${API_URL}/permits`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(permit)
    });
  },

  updatePermitStatus: async (permitId: string, status: PermitStatus): Promise<void> => {
    await fetch(`${API_URL}/permits/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id: permitId, status })
    });
  },

  getEditRequests: async (): Promise<EditRequest[]> => {
    const res = await fetch(`${API_URL}/edit-requests`, { headers: getHeaders() });
    return res.ok ? await res.json() : [];
  },

  saveEditRequest: async (request: EditRequest): Promise<void> => {
    await fetch(`${API_URL}/edit-requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request)
    });
  },

  updateEditRequestStatus: async (requestId: string, status: PermitStatus): Promise<void> => {
    await fetch(`${API_URL}/edit-requests/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id: requestId, status })
    });
  },

  login: async (email: string, pass: string) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) throw new Error('Email atau Password salah.');
    return await res.json();
  },

  syncAlphaStatus: async (user: User) => {
    if (user.role === UserRole.ADMIN) return;
    try {
        const settings = await storage.getSettings();
        const records = await storage.getAttendanceByUser(user.id);
        const permits = (await storage.getPermitsByUser(user.id)).filter(p => p.status === PermitStatus.APPROVED);
        const serverTime = await storage.getServerTime();
        
        const startDate = new Date(user.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        const today = new Date(serverTime.date);
        today.setHours(0, 0, 0, 0);
        
        const interval = eachDayOfInterval({ start: startDate, end: today });

        for (const day of interval) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = dateStr === serverTime.date;
            const dayOfWeek = getDay(day);
            const isOperational = settings.operationalDays.includes(dayOfWeek);
            const isHoliday = settings.holidays.includes(dateStr);
            
            const hasRecord = records.some(r => r.date === dateStr);
            const hasPermit = permits.some(p => p.date === dateStr);

            if (isHoliday) {
                if (!hasRecord) {
                    await storage.saveAttendance({
                        id: `HOL-${user.id}-${dateStr}`,
                        userId: user.id,
                        userName: user.name,
                        date: dateStr,
                        clockIn: null, clockOut: null,
                        status: AttendanceStatus.CUTI_BERSAMA,
                        lateMinutes: 0, photoIn: null, photoOut: null,
                        latIn: null, lngIn: null, latOut: null, lngOut: null,
                        note: 'Sistem: Hari Libur / Cuti Bersama.'
                    });
                }
                continue;
            }

            if (isOperational && !isToday && !hasRecord && !hasPermit) {
                await storage.saveAttendance({
                    id: `ALP-${user.id}-${dateStr}`,
                    userId: user.id,
                    userName: user.name,
                    date: dateStr,
                    clockIn: null, clockOut: null,
                    status: AttendanceStatus.ALPHA_SYSTEM,
                    lateMinutes: 0, photoIn: null, photoOut: null,
                    latIn: null, lngIn: null, latOut: null, lngOut: null,
                    note: 'Sistem: Tidak melakukan presensi harian hingga akhir hari.'
                });
            }
        }
    } catch (e) { console.error("Auto Sync Error:", e); }
  }
};

export { storage };
