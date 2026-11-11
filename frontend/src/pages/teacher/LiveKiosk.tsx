import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { teacherApi } from '@/api/teacherApi';
import { WebcamCapture } from '@/components/camera/WebcamCapture';
import { RecognizedStudent, StudentRoster } from '@/types';
import { Play, Square, CheckCircle2, XCircle, Users, Clock } from 'lucide-react';

export function LiveKiosk() {
  const { classId } = useParams<{ classId: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roster, setRoster] = useState<StudentRoster[]>([]);
  const [recognized, setRecognized] = useState<RecognizedStudent[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [closeSummary, setCloseSummary] = useState<{ total_enrolled: number; present_count: number; absent_count: number; attendance_percentage: number } | null>(null);
  const sendingRef = useRef(false);
  const authShellRef = useRef<HTMLDivElement>(null);
  const recognizedCount = roster.filter(student => recognized.some(item => String(item.student_id) === String(student.student_id))).length;

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

  useEffect(() => {
    if (classId) {
      teacherApi.getRoster(classId).then(res => {
        if (res.data?.data) setRoster(res.data.data);
      });
    }
  }, [classId]);

  const startSession = async () => {
    if (!classId) return;
    setError('');
    setCloseSummary(null);
    setRecognized([]);
    try {
      const res = await teacherApi.startSession(classId);
      if (res.data?.data?.session_id != null) {
        setSessionId(String(res.data.data.session_id));
        setIsActive(true);
      }
    } catch (e: any) { setError(e.response?.data?.detail || 'Could not start attendance session'); }
  };


  const handleFrameCapture = useCallback(async (imageSrc: string) => {
    if (!sessionId || !imageSrc) return;
    setLastFrame(imageSrc);
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const res = await teacherApi.recognizeFrame(sessionId, b64ToFile(imageSrc));
      if (res.data?.data) {
        setRecognized(prev => {
          const newIds = new Set(res.data!.data!.recognized_students.map(s => String(s.student_id)));
          const merged = [...prev.filter(p => !newIds.has(String(p.student_id))), ...res.data!.data!.recognized_students];
          return merged;
        });
      }
    } catch (e: any) { setError(e.response?.data?.detail || 'Frame recognition failed'); }
    finally { sendingRef.current = false; }
  }, [sessionId]);

  const closeSession = async () => {
    if (!sessionId) return;
    setError('');
    try {
      const res = await teacherApi.closeSession(sessionId);
      setCloseSummary(res.data?.data ?? null);
      setIsActive(false);
      setSessionId(null);
      setLastFrame(null);
    } catch (e: any) { setError(e.response?.data?.detail || 'Could not close session'); }
  };

  return (
    <div ref={authShellRef} className="dashboard-shell auth-shell min-h-[calc(100vh-4rem)] px-4 py-3 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:overflow-hidden"><div className="auth-orbs" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><div className="container relative z-10 mx-auto flex min-h-[calc(100vh-5.5rem)] flex-col lg:h-full lg:min-h-0">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Attendance Kiosk</h1>
          <p className="text-muted-foreground">
            {isActive ? `Session: ${sessionId?.slice(0, 8)}...` : 'Ready to start'}
          </p>
        </div>
        {!isActive ? (
          <Button onClick={startSession}><Play className="h-4 w-4 mr-2" /> Start Session</Button>
        ) : (
          <Button variant="destructive" onClick={closeSession}><Square className="h-4 w-4 mr-2" /> Close Session</Button>
        )}
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {closeSummary && <Card className="mb-3 shrink-0"><CardContent className="grid grid-cols-4 gap-2 p-3 text-center">{[['Enrolled', closeSummary.total_enrolled], ['Present', closeSummary.present_count], ['Absent', closeSummary.absent_count], ['Attendance', `${closeSummary.attendance_percentage}%`]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold">{value}</p></div>)}</CardContent></Card>}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <div className="min-h-0">
          <Card className="h-full">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Camera Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <WebcamCapture onCapture={handleFrameCapture} faceGuide={isActive} capturedImage={isActive ? null : lastFrame} continuous={isActive} compact square />
                {isActive && (
                  <p className="text-sm text-center text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Capturing at 1 FPS • {recognizedCount}/{roster.length} recognized
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0">
          <Card className="h-full">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Live Roster</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {recognizedCount}/{roster.length} recognized
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 p-3 pt-0">
              <div className="space-y-2 max-h-[min(48vh,500px)] overflow-y-auto lg:max-h-none lg:h-[calc(100vh-13rem)]">
                {roster.map(student => {
                  const rec = recognized.find(r => String(r.student_id) === String(student.student_id));
                  const isPresent = !!rec;
                  return (
                    <div key={student.student_id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${isPresent ? 'border-emerald-300/20 bg-emerald-300/[.07]' : 'border-white/10 bg-white/[.035]'}`}>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className={`text-xs font-medium ${isPresent ? 'text-emerald-200' : 'text-slate-400'}`}>{isPresent ? 'Recognized · Present' : isActive ? 'Not recognized yet' : closeSummary ? 'Not recognized · Absent' : 'Not yet recognized'}</p>
                        <p className="text-sm text-muted-foreground">Enrollment ID: {student.student_id} · PRN: {student.prn}</p>
                      </div>
                      {!isPresent && isActive && <Button size="sm" variant="outline" onClick={() => teacherApi.manualMark(sessionId!, student.student_id, 'present').then(() => setRecognized(prev => [...prev.filter(item => item.student_id !== student.student_id), { student_id: student.student_id, name: student.name, prn: student.prn, similarity: 1, bounding_box: [], already_marked: false }])).catch(console.error)}>Mark present</Button>}
                      {isPresent ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                      ) : student.face_registered ? (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <XCircle className="h-5 w-5 text-amber-200" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div></div>
  );
}

function b64ToFile(b64: string): File {
  const arr = b64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bytes = Uint8Array.from(atob(arr[1]), char => char.charCodeAt(0));
  return new File([bytes], 'frame.jpg', { type: mime });
}