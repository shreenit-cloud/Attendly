import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { teacherApi } from '@/api/teacherApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({ name: z.string().min(1, 'Class name is required'), code: z.string().min(1, 'Class code is required'), schedule_description: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function CreateClass() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const authShellRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const shell = authShellRef.current;
    if (!shell || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: number;
    const move = () => {
      shell.querySelectorAll<HTMLElement>('.auth-orbs i').forEach(orb => {
        for (let attempt = 0; attempt < 30; attempt++) {
          const x = 8 + Math.random() * 84;
          const y = 8 + Math.random() * 84;
          const spaced = [...shell.querySelectorAll<HTMLElement>('.auth-orbs i')].every(other => {
            if (other === orb) return true;
            const otherX = parseFloat(other.style.getPropertyValue('--circle-x'));
            const otherY = parseFloat(other.style.getPropertyValue('--circle-y'));
            return !Number.isFinite(otherX) || Math.hypot((x - otherX) * window.innerWidth / 100, (y - otherY) * window.innerHeight / 100) >= 230;
          });
          if (spaced) {
            orb.style.setProperty('--circle-x', `${x}%`);
            orb.style.setProperty('--circle-y', `${y}%`);
            break;
          }
        }
      });
      timer = window.setTimeout(move, 8000 + Math.random() * 6000);
    };
    move();
    return () => window.clearTimeout(timer);
  }, []);
  const submit = async (data: FormValues) => {
    setError(''); setLoading(true);
    try { await teacherApi.createClass(data); navigate('/teacher'); }
    catch (e: any) { setError(e.response?.data?.detail || 'Could not create class'); }
    finally { setLoading(false); }
  };
  return <main ref={authShellRef} className="dashboard-shell auth-shell container mx-auto min-h-screen max-w-xl px-4 py-8"><div className="auth-orbs" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><Card className="login-card relative border-[#fffaf0]/20 bg-[#fffaf0]/[.08] shadow-2xl shadow-black/30 backdrop-blur-2xl"><CardHeader><CardTitle>Create a class</CardTitle></CardHeader><CardContent>
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div><Input {...register('name')} placeholder="Class name" />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
      <div><Input {...register('code')} placeholder="Class code" />{errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}</div>
      <Input {...register('schedule_description')} placeholder="Schedule (optional)" />
      <div className="flex gap-2"><Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Create class'}</Button><Button type="button" variant="outline" onClick={() => navigate('/teacher')}>Cancel</Button></div>
    </form>
  </CardContent></Card></main>;
}
