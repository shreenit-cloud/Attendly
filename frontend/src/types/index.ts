export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp?: string;
}

export interface User {
  id: string;
  name: string;
  prn?: string;
  email?: string;
  role: 'teacher' | 'student';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Classes
export interface ClassData {
  id: string;
  name: string;
  code: string;
  total_students: number;
  total_sessions: number;
  avg_attendance_rate: number;
}

export interface ClassCreate {
  name: string;
  code: string;
  schedule_description?: string;
}

// Attendance
export interface Session {
  session_id: string;
  class_id: string;
  status: 'active' | 'closed' | 'cancelled';
  started_at: string;
  room_number?: string;
}

export interface RecognizedStudent {
  student_id: string;
  name: string;
  prn: string;
  similarity: number;
  bounding_box: number[];
  already_marked: boolean;
}

export interface UnrecognizedFace {
  bounding_box: number[];
  detection_score: number;
}

export interface FrameResult {
  total_faces_detected: number;
  recognized_students: RecognizedStudent[];
  unrecognized_faces: UnrecognizedFace[];
}

export interface StudentRoster {
  student_id: string;
  prn: string;
  name: string;
  face_registered: boolean;
}

// Student
export interface SubjectAttendance {
  class_id: string;
  class_name: string;
  code: string;
  attended: number;
  total: number;
  percentage: number;
  status: 'safe' | 'low_warning';
}

export interface StudentAttendanceHistoryItem {
  session_id: string | number;
  class_id: string | number;
  class_name: string;
  class_code: string;
  started_at: string;
  room_number?: string | null;
  status: 'present' | 'absent' | 'late';
  method?: string | null;
  marked_at?: string | null;
}

export interface StudentAttendanceHistory {
  items: StudentAttendanceHistoryItem[];
  limit: number;
  offset: number;
}

export interface TeacherAttendanceAnalytics {
  days: number;
  daily: Array<{ date: string; opportunities: number; present: number; late: number; absent: number; attendance_rate: number }>;
  statuses: Array<{ status: 'present' | 'late' | 'absent'; count: number }>;
  classes: Array<{ class_id: string | number; class_name: string; class_code: string; sessions: number; students: number; present: number; late: number; absent: number; attendance_rate: number }>;
}

export interface AttendanceSummary {
  overall_percentage: number;
  total_classes: number;
  attended_classes: number;
  subject_breakdown: SubjectAttendance[];
}