import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { teacherApi } from '@/api/teacherApi';
import { StudentRoster } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RosterPage() {
  const { classId = '' } = useParams();
  const [roster, setRoster] = useState<StudentRoster[]>([]);
  const [prns, setPrns] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = () => teacherApi.getRoster(classId).then(r => setRoster(r.data.data || [])).catch(e => setError(e.response?.data?.detail || 'Could not load roster'));
  useEffect(() => { load(); }, [classId]);
  const enroll = async (e: React.FormEvent) => { e.preventDefault(); setError(''); setNotice(''); try { const r = await teacherApi.enrollStudents(classId, prns.split(/[\s,]+/).map(x => x.trim()).filter(Boolean)); setNotice(`Enrolled ${r.data.data?.enrolled_count || 0}; already enrolled: ${r.data.data?.already_enrolled.join(', ') || 'none'}`); setPrns(''); load(); } catch (err: any) { setError(err.response?.data?.detail || 'Enrollment failed'); } };
  return <main className="container mx-auto max-w-3xl space-y-4 px-4 py-8"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Class roster</h1><Link to="/teacher"><Button variant="outline">Back to classes</Button></Link></div><Card><CardHeader><CardTitle>Enroll students</CardTitle></CardHeader><CardContent><form onSubmit={enroll} className="flex gap-2"><Input value={prns} onChange={e => setPrns(e.target.value)} aria-label="Student PRNs" placeholder="PRNs separated by commas or spaces" required /><Button>Enroll</Button></form>{notice && <p role="status" className="mt-3 text-sm">{notice}</p>}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</CardContent></Card><Card><CardHeader><CardTitle>Enrolled students ({roster.length})</CardTitle></CardHeader><CardContent className="space-y-2">{roster.map(s => <div key={s.student_id} className="flex justify-between border-b py-2"><span>{s.name} · {s.prn}</span><span>{s.face_registered ? 'Face registered' : 'No face profile'}</span></div>)}{!roster.length && <p className="text-sm text-muted-foreground">No enrolled students yet.</p>}</CardContent></Card></main>;
}
