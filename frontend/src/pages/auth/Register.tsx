import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/context/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WebcamCapture } from '@/components/camera/WebcamCapture';

const teacherSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
const studentSchema = z.object({ name: z.string().min(1), prn: z.string().regex(/^\d{10}$/, 'PRN must be 10 digits'), password: z.string().min(8) });
type TeacherForm = z.infer<typeof teacherSchema>;
type StudentForm = z.infer<typeof studentSchema>;

export function RegisterPage({ role }: { role: 'teacher' | 'student' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const authShellRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const teacherForm = useForm<TeacherForm>({ resolver: zodResolver(teacherSchema) });
  const studentForm = useForm<StudentForm>({ resolver: zodResolver(studentSchema) });

  useEffect(() => {
    const shell = authShellRef.current;
    if (!shell || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: number;
    const move = () => {
      shell.style.setProperty('--circle-x', `${8 + Math.random() * 84}%`);
      shell.style.setProperty('--circle-y', `${8 + Math.random() * 84}%`);
      timer = window.setTimeout(move, 8000 + Math.random() * 6000);
    };
    move();
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (values: TeacherForm | StudentForm) => {
    setLoading(true); setError('');
    try {
      if (role === 'teacher') {
        await authApi.registerTeacher(values as TeacherForm);
        const login = await authApi.loginTeacher({ email: (values as TeacherForm).email, password: values.password });
        if (login.data.data) { setAuth(login.data.data.user, login.data.data.access_token); navigate('/teacher'); }
      } else {
        if (!capturedImage) throw new Error('Capture your face before registering.');
        const result = await authApi.registerStudent({ ...(values as StudentForm), face_image: dataUrlToFile(capturedImage) });
        const login = await authApi.loginStudentPRN({ prn: (values as StudentForm).prn, password: values.password });
        if (login.data.data) { setAuth(login.data.data.user, login.data.data.access_token); navigate('/student'); }
        else if (!result.data.success) setError('Registration failed');
      }
    } catch (e: any) { setError(e.response?.data?.detail || e.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return <div ref={authShellRef} className="auth-shell flex min-h-screen items-center justify-center p-4 sm:p-6"><div className="auth-orbs" aria-hidden="true"><i /></div><Card className="login-card w-full max-w-md border-[#fffaf0]/20 bg-[#fffaf0]/[.08] shadow-2xl shadow-black/30 backdrop-blur-2xl"><CardHeader><CardTitle>{role === 'teacher' ? 'Teacher registration' : 'Student registration'}</CardTitle><CardDescription>Create your account to get started.</CardDescription></CardHeader><CardContent>
    {error && <p role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {role === 'teacher' ? <form onSubmit={teacherForm.handleSubmit(submit)} className="space-y-4">
      <div><Input {...teacherForm.register('name')} placeholder="Full name" autoComplete="name" />{teacherForm.formState.errors.name && <p className="mt-1 text-sm text-destructive" role="alert">Enter your name.</p>}</div>
      <div><Input {...teacherForm.register('email')} placeholder="Email" type="email" autoComplete="email" />{teacherForm.formState.errors.email && <p className="mt-1 text-sm text-destructive" role="alert">Enter a valid email address.</p>}</div>
      <div><Input {...teacherForm.register('password')} placeholder="Password (at least 8 characters)" type="password" autoComplete="new-password" />{teacherForm.formState.errors.password && <p className="mt-1 text-sm text-destructive" role="alert">Password must be at least 8 characters.</p>}</div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
    </form> : <form onSubmit={studentForm.handleSubmit(submit)} className="space-y-4">
      <div><Input {...studentForm.register('name')} placeholder="Full name" autoComplete="name" />{studentForm.formState.errors.name && <p className="mt-1 text-sm text-destructive" role="alert">Enter your name.</p>}</div>
      <div><Input {...studentForm.register('prn')} placeholder="PRN (10 digits)" inputMode="numeric" maxLength={10} />{studentForm.formState.errors.prn && <p className="mt-1 text-sm text-destructive" role="alert">PRN must contain exactly 10 digits.</p>}</div>
      <div><Input {...studentForm.register('password')} placeholder="Password (at least 8 characters)" type="password" autoComplete="new-password" />{studentForm.formState.errors.password && <p className="mt-1 text-sm text-destructive" role="alert">Password must be at least 8 characters.</p>}</div>
      <WebcamCapture onCapture={setCapturedImage} capturedImage={capturedImage || null} faceGuide />
      {!capturedImage && <p className="text-sm text-muted-foreground">Capture your face to continue registration.</p>}
      <Button type="submit" className="w-full" disabled={loading || !capturedImage}>{loading ? 'Creating account…' : 'Create account'}</Button>
    </form>}
    <p className="mt-4 text-center text-sm text-muted-foreground">Already registered? <Link to={role === 'teacher' ? '/login' : '/student-login'} className="text-primary hover:underline">Sign in</Link></p>
  </CardContent></Card></div>;
}

function dataUrlToFile(value: string) {
  const [meta, data] = value.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  return new File([Uint8Array.from(binary, c => c.charCodeAt(0))], 'face.jpg', { type: mime });
}
