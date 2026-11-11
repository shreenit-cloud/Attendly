import { apiClient } from './client';
import { ApiResponse, AttendanceSummary, StudentAttendanceHistory } from '@/types';

export const studentApi = {
  getAttendanceSummary: () => apiClient.get<ApiResponse<AttendanceSummary>>('/student/attendance/summary'),

  getAttendanceHistory: (limit = 30, offset = 0) => apiClient.get<ApiResponse<StudentAttendanceHistory>>('/student/attendance/history', { params: { limit, offset } }),
};