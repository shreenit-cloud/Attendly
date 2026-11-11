import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/context/authStore';
import { GraduationCap, Eye, EyeOff, ScanFace } from 'lucide-react';
import { WebcamCapture } from '@/components/camera/WebcamCapture';

const prnLoginSchema = z.object({
  prn: z.string().length(10, 'PRN must be 10 digits'),
  password: z.string().min(1, 'Password is required'),
});

type PRNLoginForm = z.infer<typeof prnLoginSchema>;

export function StudentLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'prn' | 'face'>('prn');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const authShellRef = useRef<HTMLDivElement>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<PRNLoginForm>({
    resolver: zodResolver(prnLoginSchema),
  });

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

  const handleFaceLogin = async () => {
    if (!capturedImage) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await authApi.loginStudentFace(b64ToFile(capturedImage));
      if (res.data.success && res.data.data) {
        setAuth(res.data.data.user, res.data.data.access_token);
        const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
        doc.startViewTransition ? doc.startViewTransition(() => navigate('/student')) : navigate('/student');
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(apiError.response?.data?.detail || apiError.message || 'Face not recognized');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PRNLoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authApi.loginStudentPRN(data);
      if (res.data.success && res.data.data) {
        setAuth(res.data.data.user, res.data.data.access_token);
        const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
        doc.startViewTransition ? doc.startViewTransition(() => navigate('/student')) : navigate('/student');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={authShellRef} className="auth-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="auth-orbs" aria-hidden="true"><i /></div>
      <Card className={`login-card w-full max-w-md border-[#fffaf0]/20 bg-[#fffaf0]/[.08] shadow-2xl shadow-black/30 backdrop-blur-2xl ${isLoading ? 'is-signing-in' : ''}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl border border-[#f17868]/30 bg-[#f17868]/10 p-3">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Student Login</CardTitle>
          <CardDescription>Sign in with PRN or Face ID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant={loginMode === 'prn' ? 'default' : 'outline'} onClick={() => setLoginMode('prn')} className="flex-1">
              PRN Login
            </Button>
            <Button variant={loginMode === 'face' ? 'default' : 'outline'} onClick={() => setLoginMode('face')} className="flex-1">
              <ScanFace className="h-4 w-4 mr-2" />
              Face ID
            </Button>
          </div>

          {loginMode === 'prn' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
              <div className="space-y-2">
                <Input {...register('prn')} placeholder="PRN (10 digits)" maxLength={10} />
                {errors.prn && <p className="text-sm text-destructive">{errors.prn.message}</p>}
              </div>
              <div className="space-y-2 relative">
                <Input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
              <WebcamCapture onCapture={setCapturedImage} faceGuide />
              <Button onClick={handleFaceLogin} className="w-full" disabled={!capturedImage || isLoading}>
                {isLoading ? 'Verifying...' : 'Login with Face'}
              </Button>
            </div>
          )}
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">New student? </span>
            <Link to="/student-register" className="text-primary hover:underline">Register here</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function b64ToFile(b64: string): File {
  const arr = b64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(arr[1]);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new File([bytes], 'capture.jpg', { type: mime });
}