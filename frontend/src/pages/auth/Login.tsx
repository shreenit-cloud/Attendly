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
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const authShellRef = useRef<HTMLDivElement>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const shell = authShellRef.current;
    if (!shell || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timers: number[] = [];
    shell.querySelectorAll<HTMLElement>('.auth-orbs i').forEach(orb => {
      const move = () => {
        orb.style.setProperty('--circle-x', `${8 + Math.random() * 84}%`);
        orb.style.setProperty('--circle-y', `${8 + Math.random() * 84}%`);
        timers.push(window.setTimeout(move, 7000 + Math.random() * 9000));
      };
      move();
    });
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authApi.loginTeacher(data);
      if (res.data.success && res.data.data) {
        setAuth(res.data.data.user, res.data.data.access_token);
        const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
        doc.startViewTransition ? doc.startViewTransition(() => navigate('/teacher')) : navigate('/teacher');
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
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your teacher account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Input {...register('email')} type="email" placeholder="Email" autoComplete="email" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2 relative">
              <Input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 space-y-2 text-center text-sm">
            <div><span className="text-muted-foreground">Student? </span><Link to="/student-login" className="text-primary hover:underline">Login here</Link></div>
            <div><span className="text-muted-foreground">New teacher? </span><Link to="/teacher/register" className="text-primary hover:underline">Register here</Link></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}