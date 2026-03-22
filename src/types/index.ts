export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY';
export type AttendanceType = 'QR_CODE' | 'MANUAL';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department?: string;
  position?: string;
  phone?: string;
  isActive: boolean;
  workStartTime: string;
  workEndTime: string;
  createdAt: string;
}

export interface QrCode {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  dataUrl?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  type: AttendanceType;
  status: AttendanceStatus;
  note?: string;
  user?: User;
}

export interface Leave {
  id: string;
  userId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  reason: string;
  reviewerId?: string;
  reviewedAt?: string;
  user?: User;
  reviewer?: User;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface TodayStats {
  total: number;
  present: number;
  late: number;
  absent: number;
}

export interface MonthlyStatEntry {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    department: string | null;
  };
  present: number;
  late: number;
  totalDays: number;
}

export interface LeaveStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
}
