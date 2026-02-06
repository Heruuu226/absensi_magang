
import { AttendanceStatus, SystemSettings } from '../types';

export const calculateStatus = (currentTime: string, settings: SystemSettings): { status: AttendanceStatus, lateMinutes: number } => {
  const [nowH, nowM] = currentTime.split(':').map(Number);
  const [startH, startM] = settings.clockInStart.split(':').map(Number);
  const [endH, endM] = settings.clockInEnd.split(':').map(Number);

  const nowMinutes = nowH * 60 + nowM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (nowMinutes <= endMinutes) {
    return { status: AttendanceStatus.HADIR, lateMinutes: 0 };
  } else {
    return { 
      status: AttendanceStatus.TERLAMBAT, 
      lateMinutes: nowMinutes - endMinutes 
    };
  }
};

export const isCheckOutTime = (currentTime: string, settings: SystemSettings): boolean => {
  const [nowH, nowM] = currentTime.split(':').map(Number);
  const [startH, startM] = settings.clockOutStart.split(':').map(Number);
  const [endH, endM] = settings.clockOutEnd.split(':').map(Number);

  const nowMinutes = nowH * 60 + nowM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
};
