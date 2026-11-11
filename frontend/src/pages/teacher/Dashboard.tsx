import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { teacherApi } from '@/api/teacherApi';
import { ClassData } from '@/types';
import { useAuthStore } from '@/context/authStore';
import { Users, BookOpen, TrendingUp, Plus, Play } from 'lucide-react';
import { TeacherAttendanceAnalytics } from '@/types';

const chartBlue = '#f17868';
const chartGrid = 'rgba(255,250,240,.12)';
const chartText = '#d7d2c7';

export function TeacherDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ total_classes: 0, today_sessions: 0, attendance_rate: 0 });
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [analytics, setAnalytics] = useState<TeacherAttendanceAnalytics | null>(null);
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
    const fetchData = async () => {
      try {
        const [statsRes, classesRes, analyticsRes] = await Promise.all([
          teacherApi.getDashboardStats(),
          teacherApi.listClasses(),
          teacherApi.getAttendanceAnalytics(),
        ]);
        if (statsRes.data?.data) setStats(statsRes.data.data);
        if (classesRes.data?.data) setClasses(classesRes.data.data);
        if (analyticsRes.data?.data) setAnalytics(analyticsRes.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div ref={dashboardRef} className="dashboard-shell auth-shell container mx-auto px-4 py-6" onPointerMove={event => { const panel = (event.target as HTMLElement).closest('.glass-panel'); const orbs = [...(event.currentTarget.querySelectorAll<HTMLElement>('.auth-orbs i'))]; orbs.forEach(orb => orb.classList.remove('is-nearest')); if (panel) { const nearest = orbs.reduce((best, orb) => { const rect = orb.getBoundingClientRect(); const distance = Math.hypot(rect.left + rect.width / 2 - event.clientX, rect.top + rect.height / 2 - event.clientY); return distance < best.distance ? { orb, distance } : best; }, { orb: orbs[0], distance: Infinity }).orb; nearest?.classList.add('is-nearest'); event.currentTarget.style.setProperty('--active-x', `${(event.clientX / window.innerWidth) * 100}%`); event.currentTarget.style.setProperty('--active-y', `${(event.clientY / window.innerHeight) * 100}%`); } }} onPointerLeave={event => event.currentTarget.querySelector('.auth-orbs .is-nearest')?.classList.remove('is-nearest')}>
      <div className="auth-orbs" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="dashboard-welcome mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#fffaf0]/15 bg-gradient-to-br from-[#fffaf0]/[.10] via-[#fffaf0]/[.04] to-[#f17868]/[.08] p-6 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-8">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-[#f17868]">Your teaching space</p>
          <h1 className="text-2xl font-bold text-[#fffaf0] sm:text-3xl">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}. Here’s your classroom overview.</p>
        </div>
        <Link to="/teacher/classes/new"><Button><Plus className="mr-2 h-4 w-4" /> New Class</Button></Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="dashboard-metric"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-[#fffaf0]/70">Total Classes</CardTitle><span className="rounded-xl border border-[#f17868]/25 bg-[#f17868]/10 p-2"><BookOpen className="h-4 w-4 text-[#f17868]" /></span></CardHeader><CardContent><div className="text-4xl font-semibold tracking-tight text-[#fffaf0]">{stats.total_classes}</div><p className="mt-1 text-xs text-[#fffaf0]/50">Across your teaching space</p></CardContent></Card>
        <Card className="dashboard-metric"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-[#fffaf0]/70">Today's Sessions</CardTitle><span className="rounded-xl border border-[#f17868]/25 bg-[#f17868]/10 p-2"><Play className="h-4 w-4 text-[#f17868]" /></span></CardHeader><CardContent><div className="text-4xl font-semibold tracking-tight text-[#fffaf0]">{stats.today_sessions}</div><p className="mt-1 text-xs text-[#fffaf0]/50">Sessions started today</p></CardContent></Card>
        <Card className="dashboard-metric"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-[#fffaf0]/70">Attendance Rate</CardTitle><span className="rounded-xl border border-[#f17868]/25 bg-[#f17868]/10 p-2"><TrendingUp className="h-4 w-4 text-[#f17868]" /></span></CardHeader><CardContent><div className="text-4xl font-semibold tracking-tight text-[#fffaf0]">{stats.attendance_rate}%</div><p className="mt-1 text-xs text-[#fffaf0]/50">Aggregate over the last 30 days</p></CardContent></Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <TrendChart analytics={analytics} loading={loading} />
        <StatusChart analytics={analytics} loading={loading} />
      </div>
      <ClassInsight analytics={analytics} loading={loading} />

      <Card>
        <CardHeader><CardTitle>Your Classes</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : classes.length === 0 ? (
            <div className="py-8 text-center"><p className="mb-4 text-muted-foreground">No classes yet</p><Link to="/teacher/classes/new"><Button variant="outline">Create your first class</Button></Link></div>
          ) : (
            <div className="grid gap-4">
              {classes.map(cls => (
                <div key={cls.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[.035] p-4 transition-colors hover:bg-white/[.06] sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="font-semibold">{cls.name}</h3><p className="text-sm text-muted-foreground">{cls.code}</p></div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <Link to={`/teacher/classes/${cls.id}/roster`}><Button size="sm" variant="outline">Roster</Button></Link>
                    <div className="flex items-center gap-1 text-sm" aria-label={`${cls.total_students} enrolled students`}><Users className="h-4 w-4" /><span>{cls.total_students} students</span></div>
                    <div className="flex items-center gap-1 text-sm" aria-label={`${cls.total_sessions} sessions`}><BookOpen className="h-4 w-4" /><span>{cls.total_sessions} sessions</span></div>
                    <Link to={`/teacher/kiosk/${cls.id}`}><Button size="sm">Start Kiosk</Button></Link>
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

function TrendChart({ analytics, loading }: { analytics: TeacherAttendanceAnalytics | null; loading: boolean }) {
  const rows = analytics?.daily || [];
  return <Card className="dashboard-panel"><CardHeader><CardTitle>Attendance trend</CardTitle><p className="text-sm text-muted-foreground">Daily attendance across closed sessions · last {analytics?.days ?? 30} days</p></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-muted-foreground">Loading...</p> : !rows.length ? <p className="py-8 text-center text-muted-foreground">No closed sessions in this period</p> : <><p id="teacher-trend-desc" className="sr-only">Line chart of daily attendance rate. Exact daily counts are in the table below.</p><figure aria-describedby="teacher-trend-desc" className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}><defs><linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartBlue} stopOpacity={0.38} /><stop offset="100%" stopColor={chartBlue} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="date" tick={{ fill: chartText, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chartGrid }} minTickGap={24} /><YAxis domain={[0, 100]} unit="%" tick={{ fill: chartText, fontSize: 11 }} tickLine={false} axisLine={false} /><ReferenceLine y={75} stroke="#fbbf24" strokeDasharray="4 4" /><Tooltip contentStyle={{ background: '#102139', border: '1px solid rgba(255,250,240,.22)', borderRadius: 12, color: '#fffaf0' }} formatter={(value: number, _name: string, item: { payload?: TeacherAttendanceAnalytics['daily'][number] }) => [`${value}% · ${item.payload?.present ?? 0} present/late of ${item.payload?.opportunities ?? 0}`, 'Attendance']} labelFormatter={label => String(label)} /><Area type="monotone" dataKey="attendance_rate" name="Attendance rate" stroke={chartBlue} strokeWidth={2} fill="url(#attendanceFill)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></figure><details className="mt-3 rounded-lg border border-white/10 px-4 py-3"><summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View daily data table</summary><table className="mt-3 w-full text-left text-sm"><caption className="sr-only">Daily attendance rates and counts</caption><thead><tr className="border-b border-white/10 text-muted-foreground"><th className="py-2">Date</th><th className="py-2">Rate</th><th className="py-2">Present / late</th><th className="py-2">Opportunities</th></tr></thead><tbody>{rows.map(row => <tr key={row.date} className="border-b border-white/5"><th scope="row" className="py-2 font-medium">{row.date}</th><td>{row.attendance_rate}%</td><td>{row.present + row.late}</td><td>{row.opportunities}</td></tr>)}</tbody></table></details></>}</CardContent></Card>;
}

function StatusChart({ analytics, loading }: { analytics: TeacherAttendanceAnalytics | null; loading: boolean }) {
  const rows = (analytics?.statuses || []).filter(row => row.count > 0);
  const colors = ['#3987e5', '#d95926', '#199e70'];
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return <Card className="dashboard-panel"><CardHeader><CardTitle>Attendance status mix</CardTitle><p className="text-sm text-muted-foreground">Recorded present and late marks; remaining closed-session opportunities count as absent</p></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-muted-foreground">Loading...</p> : !total ? <p className="py-8 text-center text-muted-foreground">No attendance opportunities in this period</p> : <div className="grid items-center gap-4 sm:grid-cols-2"><figure className="h-56" aria-label="Donut chart showing teacher attendance status mix"><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={rows} dataKey="count" nameKey="status" innerRadius="58%" outerRadius="82%" paddingAngle={3} isAnimationActive={false}>{rows.map((row, index) => <Cell key={row.status} fill={colors[index]} />)}</Pie><Tooltip contentStyle={{ background: '#102139', border: '1px solid rgba(255,250,240,.22)', borderRadius: 12, color: '#fffaf0' }} formatter={(value: number, name: string) => [`${value} (${(value / total * 100).toFixed(1)}%)`, name]} /></PieChart></ResponsiveContainer><figcaption className="sr-only">Attendance statuses and exact counts are listed beside the chart.</figcaption></figure><div className="space-y-3" aria-label="Attendance status counts">{rows.map((row, index) => <div key={row.status} className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2 capitalize"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index] }} />{row.status}</span><span className="font-semibold">{row.count} <span className="font-normal text-muted-foreground">({(row.count / total * 100).toFixed(1)}%)</span></span></div>)}</div></div>}</CardContent></Card>;
}

function ClassInsight({ analytics, loading }: { analytics: TeacherAttendanceAnalytics | null; loading: boolean }) {
  const rows = analytics?.classes || [];
  return <Card className="mb-6"><CardHeader><CardTitle>Class attendance details</CardTitle><p className="text-sm text-muted-foreground">Attendance rate uses present plus late over enrolled students × closed sessions.</p></CardHeader><CardContent>{loading ? <p className="py-6 text-center text-muted-foreground">Loading...</p> : !rows.length ? <p className="py-6 text-center text-muted-foreground">No classes yet</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Class attendance session and status metrics for the selected period</caption><thead><tr className="border-b border-white/10 text-muted-foreground"><th className="py-3 pr-4">Class</th><th className="py-3 pr-4">Sessions</th><th className="py-3 pr-4">Enrolled</th><th className="py-3 pr-4">Present</th><th className="py-3 pr-4">Late</th><th className="py-3 pr-4">Absent</th><th className="py-3">Rate</th></tr></thead><tbody>{rows.map(row => <tr key={row.class_id} className="border-b border-white/5"><th scope="row" className="py-3 pr-4 font-medium">{row.class_name} <span className="text-muted-foreground">({row.class_code})</span></th><td>{row.sessions}</td><td>{row.students}</td><td>{row.present}</td><td>{row.late}</td><td>{row.absent}</td><td>{row.attendance_rate}%</td></tr>)}</tbody></table></div>}</CardContent></Card>;
}
