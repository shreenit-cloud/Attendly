import { apiClient } from './client';
import { ApiResponse, User } from '@/types';

interface TeacherRegister { name: string; email: string; password: string; }
interface StudentRegister { name: string; prn: string; password: string; face_image: File; }

export const authApi = {
  registerTeacher: (data: TeacherRegister) =>
    apiClient.post<ApiResponse<{ teacher_id: string; name: string; email: string; role: string }>>('/auth/teacher/register', data),

  registerStudent: (data: StudentRegister) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('prn', data.prn);
    formData.append('password', data.password);
    formData.append('face_image', data.face_image);
    return apiClient.post<ApiResponse<{ student_id: string; prn: string; name: string; face_registered: boolean }>>('/auth/student/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  loginTeacher: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<{ access_token: string; token_type: string; expires_in: number; user: User }>>('/auth/teacher/login', data),

  loginStudentPRN: (data: { prn: string; password: string }) =>
    apiClient.post<ApiResponse<{ access_token: string; token_type: string; user: User }>>('/auth/student/login-prn', data),

  loginStudentFace: (face_image: File) => {
    const formData = new FormData();
    formData.append('face_image', face_image);
    return apiClient.post<ApiResponse<{ access_token: string; token_type: string; similarity_score: number; user: User }>>('/student/attendance/login-face', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  getMe: () => apiClient.get<ApiResponse<{ user_id: string; role: string; name: string; prn?: string }>>('/auth/me'),
};