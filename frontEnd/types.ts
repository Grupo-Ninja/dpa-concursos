
export type Role = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  cohortId?: string;
  avatar?: string;
  status: 'active' | 'pending' | 'blocked';
}

export interface Cohort {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string; // hex code
}

export interface AppSettings {
  schoolName: string;
  phone: string;
  email: string;
  welcomeMessage: string;
  whatsappLink: string;
  instructorName: string;
}

export interface Task {
  id: string;
  cohortId: string;
  studentId?: string; // If present, this task is specific to a student. If undefined, it's a base cohort task.
  subject: string;
  mode: 'Video' | 'Reading' | 'Questions' | 'Review';
  durationMinutes: number; // Planned duration
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  date?: string; // specific date YYYY-MM-DD
  description?: string; // Instructions or observations
}

export interface CheckIn {
  id: string;
  taskId: string;
  studentId: string;
  completed: boolean;
  actualDurationMinutes?: number;
  reasonForFailure?: string; // 'Work', 'Tired', etc.
  period?: 'Morning' | 'Afternoon' | 'Night' | 'Dawn';
  note?: string;
  timestamp: string;
}

export interface DailyStat {
  day: string;
  goal: number;
  actual: number;
}

export interface StudentRank {
  id: string;
  name: string;
  efficiency: number; // percentage
  totalHours: number;
  trend: 'up' | 'down' | 'stable';
  failures: number;
  cohortId: string;
  status: 'active' | 'blocked';
}
