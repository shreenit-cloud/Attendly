import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { studentApi } from '@/api/studentApi';
import { useAuthStore } from '@/context/authStore';
import { AttendanceSummary, StudentAttendanceHistory, StudentAttendanceHistoryItem } from '@/types';
import { Target, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

const chartBlue = '#f17868';
const chartGrid = 'rgba(255,250,240,.12)';
const chartText = '#d7d2c7';

export function StudentDashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [history, setHistory] = useState<StudentAttendanceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = dashboardRef.current;
    if (!shell || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timers: number[] = [];
    shell.querySelectorAll<HTMLElement>('.auth-orbs i').forEach(orb => {
      const move = () => {
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
        timers.push(window.setTimeout(move, 7000 + Math.random() * 9000));
      };
      move();
    });
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    Promise.all([studentApi.getAttendanceSummary(), studentApi.getAttendanceHistory()])
      .then(([summaryRes, historyRes]) => {
        if (summaryRes.data?.data) setSummary(summaryRes.data.data);
        if (historyRes.data?.data) setHistory(historyRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const subjects = summary?.subject_breakdown || [];
  const historyItems = history?.items || [];
  const nextHistoryOffset = history ? history.offset + history.items.length : 0;
  const statusData = useMemo(() => {
    const values: Record<'present' | 'late' | 'absent', number> = { present: 0, late: 0, absent: 0 };
    historyItems.forEach(item => { values[item.status] += 1; });
    return Object.entries(values).filter(([, count]) => count > 0).map(([status, count]) => ({ status, count }));
  }, [historyItems]);
  const statusColors = { present: '#3987e5', late: '#d95926', absent: '#199e70' };

  return (
    <div ref={dashboardRef} className="dashboard-shell auth-shell container mx-auto px-4 py-6" onPointerMove={event => { const panel = (event.target as HTMLElement).closest('.glass-panel'); const orbs = [...(event.currentTarget.querySelectorAll<HTMLElement>('.auth-orbs i'))]; orbs.forEach(orb => orb.classList.remove('is-nearest')); if (panel) { const nearest = orbs.reduce((best, orb) => { const rect = orb.getBoundingClientRect(); const distance = Math.hypot(rect.left + rect.width / 2 - event.clientX, rect.top + rect.height / 2 - event.clientY); return distance < best.distance ? { orb, distance } : best; }, { orb: orbs[0], distance: Infinity }).orb; nearest?.classList.add('is-nearest'); event.currentTarget.style.setProperty('--active-x', `${(event.clientX / window.innerWidth) * 100}%`); event.currentTarget.style.setProperty('--active-y', `${(event.clientY / window.innerHeight) * 100}%`); } }} onPointerLeave={event => event.currentTarget.querySelector('.auth-orbs .is-nearest')?.classList.remove('is-nearest')}>
      <div className="auth-orbs" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="dashboard-welcome mb-6 flex flex-wrap items-end justify-between gap-5 rounded-3xl border border-[#fffaf0]/15 bg-gradient-to-br from-[#fffaf0]/[.10] via-[#fffaf0]/[.04] to-[#f17868]/[.08] p-6 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-[#f17868]">Your attendance space</p>
          <h1 className="text-2xl font-bold text-[#fffaf0] sm:text-3xl">Student Dashboard</h1>
        <p className="text-[#fffaf0]/70">Welcome back, {user?.name}. Here’s your attendance at a glance.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="dashboard-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.overall_percentage ?? 0}%</div>
            <p className="text-xs text-muted-foreground">Target: 75%</p>
          </CardContent>
        </Card>
        <Card className="dashboard-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes Attended</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.attended_classes || 0}</div>
            <p className="text-xs text-muted-foreground">out of {summary?.total_classes || 0}</p>
          </CardContent>
        </Card>
        <Card className="dashboard-metric">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{subjects.length}</div>
            <p className="text-xs text-muted-foreground">enrolled</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="dashboard-panel"><CardHeader><CardTitle>Recent attendance status</CardTitle><p className="text-sm text-muted-foreground">Your latest closed sessions · counts over the latest 30 records</p></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-muted-foreground">Loading...</p> : !statusData.length ? <p className="py-8 text-center text-muted-foreground">No attendance history yet</p> : <div className="grid items-center gap-3 sm:grid-cols-2"><figure className="h-52" aria-label="Donut chart of your present, late, and absent attendance records"><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={statusData} dataKey="count" nameKey="status" innerRadius="57%" outerRadius="82%" paddingAngle={3} isAnimationActive={false}>{statusData.map(item => <Cell key={item.status} fill={statusColors[item.status as keyof typeof statusColors]} />)}</Pie><Tooltip contentStyle={{ background: '#102139', border: '1px solid rgba(255,250,240,.22)', borderRadius: 12, color: '#fffaf0' }} /></PieChart></ResponsiveContainer></figure><div className="space-y-3">{statusData.map(item => <p key={item.status} className="flex justify-between text-sm capitalize"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[item.status as keyof typeof statusColors] }} />{item.status}</span><strong>{item.count}</strong></p>)}</div></div>}</CardContent></Card>
        <Card className="dashboard-panel"><CardHeader><CardTitle>Attendance timeline</CardTitle><p className="text-sm text-muted-foreground">Your latest attendance history · present and late count as attended</p></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-muted-foreground">Loading...</p> : !historyItems.length ? <p className="py-8 text-center text-muted-foreground">No attendance history yet</p> : <><p id="student-timeline-desc" className="sr-only">Line chart showing attendance outcome for recent class sessions. Exact session details appear below.</p><figure className="h-52" aria-describedby="student-timeline-desc"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={[...historyItems].reverse().map(item => ({ ...item, attended: item.status === 'present' || item.status === 'late' ? 1 : 0 }))} margin={{ top: 12, right: 8, left: -20, bottom: 4 }}><CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="started_at" tickFormatter={value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} tick={{ fill: chartText, fontSize: 10 }} minTickGap={20} /><YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={value => value ? 'Attended' : 'Missed'} tick={{ fill: chartText, fontSize: 10 }} /><ReferenceLine y={0.5} stroke={chartGrid} /><Tooltip contentStyle={{ background: '#102139', border: '1px solid rgba(255,250,240,.22)', borderRadius: 12, color: '#fffaf0' }} formatter={(value: number, _name: string, item: { payload?: StudentAttendanceHistoryItem }) => [item.payload?.status ?? (value ? 'Attended' : 'Missed'), item.payload?.class_name ?? 'Session']} labelFormatter={value => new Date(String(value)).toLocaleString()} /><Area type="stepAfter" dataKey="attended" stroke={chartBlue} fill="rgba(57,135,229,.18)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></figure></>}</CardContent></Card>
      </div>
      <Card className="mb-6"><CardHeader><CardTitle>Attendance by subject</CardTitle><p className="text-sm text-muted-foreground">Attendance percentage per class · target 75%</p></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-muted-foreground">Loading...</p> : !subjects.length ? <p className="py-8 text-center text-muted-foreground">No attendance data yet</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.map(subject => <div key={subject.class_id} className="rounded-xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-center gap-3"><div className="relative h-20 w-20 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Attended', value: subject.percentage }, { name: 'Remaining', value: Math.max(0, 100 - subject.percentage) }]} dataKey="value" innerRadius="70%" outerRadius="90%" startAngle={90} endAngle={-270} isAnimationActive={false}><Cell fill={subject.percentage >= 75 ? '#3987e5' : '#f59e0b'} /><Cell fill="rgba(255,255,255,.12)" /></Pie></PieChart></ResponsiveContainer><span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{subject.percentage}%</span></div><div className="min-w-0"><h3 className="truncate font-semibold">{subject.class_name}</h3><p className="text-sm text-muted-foreground">{subject.code}</p><p className="text-xs text-muted-foreground">{subject.attended}/{subject.total} sessions · {subject.percentage >= 75 ? 'On track' : 'Below target'}</p></div></div></div>)}</div>}<details className="mt-4 rounded-lg border border-white/10 px-4 py-3"><summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View subject details table</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Attendance by subject</caption><thead><tr className="border-b border-white/10 text-muted-foreground"><th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Attendance</th><th className="py-2">Attended / total</th></tr></thead><tbody>{subjects.map(subject => <tr key={subject.class_id} className="border-b border-white/5"><th scope="row" className="py-2 pr-4">{subject.class_name} ({subject.code})</th><td>{subject.percentage}%</td><td>{subject.attended} / {subject.total}</td></tr>)}</tbody></table></div></details></CardContent></Card>
      <Card className="dashboard-panel"><CardHeader><CardTitle>Recent session details</CardTitle><p className="text-sm text-muted-foreground">Most recent {history?.limit ?? 30} closed sessions</p></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-muted-foreground">Loading...</p> : !historyItems.length ? <p className="py-8 text-center text-muted-foreground">No session details yet</p> : <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Recent class session attendance status</caption><thead><tr className="border-b border-white/10 text-muted-foreground"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Class</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Method</th><th className="py-2">Marked at</th></tr></thead><tbody>{historyItems.map(item => <tr key={item.session_id} className="border-b border-white/5"><td className="py-2 pr-4">{new Date(item.started_at).toLocaleString()}</td><th scope="row" className="py-2 pr-4">{item.class_name} ({item.class_code})</th><td className="py-2 pr-4 capitalize">{item.status}</td><td className="py-2 pr-4">{item.method?.replace(/_/g, ' ') || '—'}</td><td className="py-2">{item.marked_at ? new Date(item.marked_at).toLocaleTimeString() : '—'}</td></tr>)}</tbody></table></div>{historyItems.length === (history?.limit ?? 30) && <Button className="mt-3" variant="outline" onClick={() => studentApi.getAttendanceHistory(history?.limit ?? 30, nextHistoryOffset).then(res => { if (res.data?.data) setHistory(prev => prev ? { ...res.data!.data!, items: [...prev.items, ...res.data!.data!.items] } : res.data!.data!); })}>Load more history</Button>}</>}</CardContent></Card>

      <Card className="dashboard-panel">
        <CardHeader><CardTitle>Subject details</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : subjects.length === 0 ? <div className="py-8 text-center text-muted-foreground">No attendance data yet</div> : (
            <div className="grid gap-4">
              {subjects.map(subject => (
                <div key={subject.class_id} className={`rounded-xl border p-4 ${subject.status === 'safe' ? 'border-emerald-300/20 bg-emerald-300/[.07]' : 'border-amber-300/25 bg-amber-300/[.07]'}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{subject.class_name}</h3>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${subject.status === 'safe' ? 'bg-emerald-300/10 text-emerald-200' : 'bg-amber-300/10 text-amber-100'}`}>{subject.status === 'safe' ? 'On track' : 'Below target'}</span>
                      <p className="text-sm text-muted-foreground">{subject.code}</p>
                    </div>
                    <div className="text-right"><div className="text-2xl font-bold">{subject.percentage}%</div><p className="text-xs text-muted-foreground">{subject.attended}/{subject.total} classes</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${subject.status === 'safe' ? 'bg-emerald-300' : 'bg-amber-300'}`} style={{ width: `${subject.percentage}%` }} /></div>
                    {subject.status === 'safe' ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : <AlertTriangle className="h-4 w-4 text-amber-200" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
