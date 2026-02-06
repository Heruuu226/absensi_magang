
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'PESERTA MAGANG'
}

export enum AttendanceStatus {
  HADIR = 'Hadir',
  TERLAMBAT = 'Terlambat',
  IZIN = 'Izin',
  SAKIT = 'Sakit',
  ALPHA = 'Alpha',
  ALPHA_SYSTEM = 'Alpha (Sistem)',
  PULANG = 'Pulang',
  CUTI_BERSAMA = 'Cuti Bersama'
}

export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum PermitStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface Supervisor {
  id: string;
  name: string;
  division: string;
  employeeId: string;
}

export interface SystemSettings {
  clockInStart: string;
  clockInEnd: string;
  clockOutStart: string;
  clockOutEnd: string;
  operationalDays: number[];
  holidays: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isActive: boolean;
  university: string; 
  major: string; 
  division: string;
  supervisorId: string;
  supervisorName: string;
  startDate: string;
  endDate: string;
  password?: string;
  photoUrl?: string;
  phone?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  photoIn: string | null;
  photoOut: string | null;
  latIn: number | null;
  lngIn: number | null;
  latOut: number | null;
  lngOut: number | null;
  note?: string; 
  isEdited?: boolean | number;
}

export interface EditRequest {
  id: string;
  attendanceId: string;
  userId: string;
  userName: string;
  date: string;
  requestedIn: string;
  requestedOut: string;
  requestedStatus: AttendanceStatus;
  reason: string;
  status: PermitStatus;
  createdAt: string;
}

export interface PermitRecord {
  id: string;
  userId: string;
  userName: string;
  type: 'Izin' | 'Sakit';
  date: string;
  reason: string;
  fileUrl: string;
  status: PermitStatus;
  lat: number | null;
  lng: number | null;
}
