import { Link } from 'react-router-dom';
import { useAuthStore } from '@/context/authStore';
import { ArrowDown, ArrowRight, BookOpenCheck, BarChart3, ScanFace, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  { icon: BookOpenCheck, title: 'Create your class', text: 'Set up a class and enroll students with a simple roster.' },
  { icon: ScanFace, title: 'Take attendance', text: 'Start a session and record attendance from the classroom kiosk.' },
  { icon: BarChart3, title: 'See the details', text: 'Review session records, class trends, and attendance status.' },
];

export function LandingPage() {
  const { user, logout } = useAuthStore();
  const dashboardPath = user?.role === 'student' ? '/student' : '/teacher';
  return (
    <main className="landing-shell min-h-screen overflow-hidden px-4 py-6 sm:px-8 lg:px-12">
      <header className="landing-nav mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-[#fffaf0]/20 bg-[#fffaf0]/[.08] px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-xl sm:px-6">
        <a href="#top" className="flex items-center gap-3 font-semibold tracking-tight text-[#fffaf0]">
          <span className="rounded-xl border border-[#f17868]/35 bg-[#f17868]/15 p-2 text-[#f17868]"><ScanFace className="h-5 w-5" /></span>
          <span>Attend<span className="text-[#f17868]">ly</span></span>
        </a>
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? <><Link to={dashboardPath}><Button variant="outline" className="border-[#fffaf0]/25 bg-[#fffaf0]/[.06]">Open dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><Button variant="ghost" className="text-[#fffaf0]" onClick={logout}>Log out</Button></> : <><Link to="/student-login" className="hidden text-sm text-[#fffaf0]/75 transition-colors hover:text-[#fffaf0] sm:inline">Student login</Link><Link to="/login"><Button variant="outline" className="border-[#fffaf0]/25 bg-[#fffaf0]/[.06]">Teacher login <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></>}
        </div>
      </header>

      <section id="top" className="landing-hero mx-auto grid min-h-[76vh] max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <div className="landing-copy relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#fffaf0]/20 bg-[#fffaf0]/[.07] px-4 py-2 text-sm text-[#fffaf0]/85 shadow-lg shadow-black/10 backdrop-blur-xl"><Sparkles className="h-4 w-4 text-[#f17868]" /> Smarter classroom attendance</div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-[#fffaf0] sm:text-6xl lg:text-7xl">Attendance,<br /><span className="text-[#f17868]">made clear.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#fffaf0]/70 sm:text-lg">A simpler way for teachers to run class sessions and for students to follow their attendance—without losing sight of the details.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? <Link to={dashboardPath}><Button size="lg" className="landing-cta bg-[#f17868] text-[#102139] shadow-lg shadow-[#f17868]/20 hover:bg-[#ff8d7d]">Open your dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button></Link> : <><Link to="/login"><Button size="lg" className="landing-cta bg-[#f17868] text-[#102139] shadow-lg shadow-[#f17868]/20 hover:bg-[#ff8d7d]">Teacher sign in <ArrowRight className="ml-2 h-4 w-4" /></Button></Link><Link to="/student-login"><Button size="lg" variant="outline" className="border-[#fffaf0]/25 bg-[#fffaf0]/[.06] text-[#fffaf0]">Student sign in</Button></Link></>}
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#fffaf0]/55"><span className="h-px w-10 bg-[#f17868]/70" /> Designed for clear records, from check-in to summary</div>
        </div>

        <div className="landing-visual relative mx-auto flex min-h-[390px] w-full max-w-[560px] items-center justify-center sm:min-h-[480px]">
          <div className="landing-orbit landing-orbit-one" /><div className="landing-orbit landing-orbit-two" />
          <div className="landing-orb landing-orb-one" /><div className="landing-orb landing-orb-two" />
          <Card className="landing-glass relative z-10 w-full max-w-md border-[#fffaf0]/25 bg-[#fffaf0]/[.12] shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm text-[#fffaf0]/60">Class overview</p><h2 className="mt-1 text-xl font-semibold text-[#fffaf0]">Today at a glance</h2></div>
                <span className="rounded-xl border border-[#f17868]/30 bg-[#f17868]/10 p-2.5 text-[#f17868]"><BarChart3 className="h-5 w-5" /></span>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#fffaf0]/15 bg-[#102139]/45 p-4"><p className="text-xs text-[#fffaf0]/55">SESSION</p><p className="mt-2 text-lg font-semibold text-[#fffaf0]">Attendance</p><p className="mt-1 text-xs text-[#fffaf0]/55">Live class record</p></div>
                <div className="rounded-2xl border border-[#fffaf0]/15 bg-[#102139]/45 p-4"><p className="text-xs text-[#fffaf0]/55">INSIGHT</p><p className="mt-2 text-lg font-semibold text-[#fffaf0]">Clear details</p><p className="mt-1 text-xs text-[#fffaf0]/55">Sessions and status</p></div>
              </div>
              <div className="mt-4 rounded-2xl border border-[#fffaf0]/15 bg-[#102139]/35 p-4">
                <div className="flex items-center justify-between"><span className="text-sm text-[#fffaf0]/70">Attendance workflow</span><span className="text-xs text-[#f17868]">Simple · traceable</span></div>
                <div className="mt-4 flex items-center gap-2" aria-hidden="true"><span className="h-2 flex-1 rounded-full bg-[#f17868]"/><span className="h-2 flex-1 rounded-full bg-[#fffaf0]/45"/><span className="h-2 flex-1 rounded-full bg-[#fffaf0]/20"/></div>
                <div className="mt-3 flex justify-between text-[11px] text-[#fffaf0]/50"><span>Set up</span><span>Check in</span><span>Review</span></div>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-[#fffaf0]/55"><ShieldCheck className="h-4 w-4 text-[#f17868]" /> Face verification is used for attendance check-in.</p>
            </CardContent>
          </Card>
          <div className="landing-float-chip landing-float-chip-a"><ScanFace className="h-4 w-4 text-[#f17868]" /><span>Class check-in</span></div>
          <div className="landing-float-chip landing-float-chip-b"><BookOpenCheck className="h-4 w-4 text-[#fffaf0]" /><span>Session records</span></div>
        </div>
      </section>

      <section className="landing-how mx-auto max-w-7xl border-t border-[#fffaf0]/15 py-16 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium uppercase tracking-[.2em] text-[#f17868]">A clear flow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#fffaf0] sm:text-4xl">From classroom to clear insights.</h2></div><a href="#access" className="inline-flex items-center gap-2 text-sm text-[#fffaf0]/65 transition-colors hover:text-[#fffaf0]">Explore access <ArrowDown className="h-4 w-4" /></a></div>
        <div className="grid gap-4 md:grid-cols-3">{steps.map((step, index) => { const Icon = step.icon; return <Card key={step.title} className="landing-step border-[#fffaf0]/15 bg-[#fffaf0]/[.07] backdrop-blur-xl"><CardContent className="p-6"><div className="flex items-center justify-between"><span className="text-sm tabular-nums text-[#fffaf0]/40">0{index + 1}</span><Icon className="h-5 w-5 text-[#f17868]" /></div><h3 className="mt-8 text-lg font-semibold text-[#fffaf0]">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[#fffaf0]/65">{step.text}</p></CardContent></Card>; })}</div>
      </section>

      <footer id="access" className="landing-footer mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-[#fffaf0]/15 py-6 text-sm text-[#fffaf0]/55">
        <p>AI Attendance <span className="mx-2 text-[#f17868]">•</span> Clear records for every class.</p>
        <div className="flex flex-wrap gap-5"><Link className="transition-colors hover:text-[#fffaf0]" to="/teacher/register">Teacher registration</Link><Link className="transition-colors hover:text-[#fffaf0]" to="/student-register">Student registration</Link><Link className="transition-colors hover:text-[#fffaf0]" to="/student-login">Student login</Link></div>
      </footer>
    </main>
  );
}
