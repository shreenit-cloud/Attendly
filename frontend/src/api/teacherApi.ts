import { apiClient } from './client';
import { ApiResponse, ClassData, ClassCreate, StudentRoster, Session, FrameResult, TeacherAttendanceAnalytics } from '@/types';

export const teacherApi = {
  listClasses: () => apiClient.get<ApiResponse<ClassData[]>>('/classes'),

  createClass: (data: ClassCreate) => apiClient.post<ApiResponse<ClassData>>('/classes', data),

  getRoster: (classId: string) => apiClient.get<ApiResponse<StudentRoster[]>>(`/classes/${classId}/roster`),

  enrollStudents: (classId: string, studentPrns: string[]) =>
    apiClient.post<ApiResponse<{ enrolled_count: number; already_enrolled: string[] }>>(`/classes/${classId}/enroll`, { student_prns: studentPrns }),

  startSession: (classId: string, roomNumber?: string) =>
    apiClient.post<ApiResponse<Session>>('/attendance/sessions/start', { class_id: classId, room_number: roomNumber }),

  recognizeFrame: (sessionId: string, frame: File) => {
    const formData = new FormData();
    formData.append('frame', frame);
    return apiClient.post<ApiResponse<FrameResult>>(`/attendance/sessions/${sessionId}/recognize-frame`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  manualMark: (sessionId: string, studentId: string, status: string, notes?: string) =>
    apiClient.post<ApiResponse<null>>(`/attendance/sessions/${sessionId}/manual-mark`, { student_id: studentId, status, notes }),

  closeSession: (sessionId: string) =>
    apiClient.post<ApiResponse<{ session_id: string; status: string; total_enrolled: number; present_count: number; absent_count: number; attendance_percentage: number }>>(`/attendance/sessions/${sessionId}/close`),

  getDashboardStats: () => apiClient.get<ApiResponse<{ total_classes: number; today_sessions: number; attendance_rate: number }>>('/analytics/dashboard/stats'),

  getAttendanceAnalytics: (days = 30) => apiClient.get<ApiResponse<TeacherAttendanceAnalytics>>('/analytics/dashboard/attendance', { params: { days } }),

  exportAttendance: (classId: string) =>
    apiClient.get(`/analytics/classes/${classId}/export`, { responseType: 'blob' }),
};