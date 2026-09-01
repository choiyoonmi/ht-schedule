import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import './App.css';
import { SEED_STUDENTS } from './seedStudents';

type Division = '초등부' | '중등부' | '고등부' | '유치부';
type DayOfWeek = '월' | '화' | '수' | '목' | '금';

interface Teacher {
  id: string;
  name: string;
  subject: string;
}

interface TeacherSelection {
  teacherId: string;
  day: DayOfWeek;
  hour: number;
}

interface Student {
  id: string;
  name: string;
  division: Division;
  grade: number;
  vocab?: string; // 단어 진도 (같은 책이라도 학생마다 다를 수 있음, 예: "Day 15", "3권 Unit 5")
  selectedTeachers: {
    [subject: string]: TeacherSelection[];
  };
}

interface ScheduleEntry {
  studentName: string;
  subject: string;
  teacherName: string;
  day: DayOfWeek;
  hour: number;
}

const TEACHERS: Teacher[] = [
  { id: 'korean_1', name: '문원영', subject: '국어' },
  { id: 'elem_math_1', name: '문소현', subject: '초등수학' },
  { id: 'elem_math_2', name: '안', subject: '초등수학' },
  { id: 'mid_math_1', name: '문소현', subject: '중등수학' },
  { id: 'mid_math_2', name: '안', subject: '중등수학' },
  { id: 'elem_eng_1', name: 'Kris', subject: '초등영어' },
  { id: 'elem_eng_2', name: '공', subject: '초등영어' },
  { id: 'elem_eng_3', name: '부원장', subject: '초등영어' },
  { id: 'elem_eng_4', name: '박은영', subject: '초등영어' },
  { id: 'elem_eng_5', name: '클리닉', subject: '초등영어' },
  { id: 'mid_eng_1', name: 'Kris', subject: '중등영어' },
  { id: 'mid_eng_2', name: '박은영', subject: '중등영어' },
  { id: 'high_eng_1', name: '박은영', subject: '고등영어' },
];

const DAYS: DayOfWeek[] = ['월', '화', '수', '목', '금'];

const TEACHER_COLORS: Record<string, {bg: string; border: string; text: string}> = {
  '문원영': { bg: '#E3F2FD', border: '#1976D2', text: '#0D47A1' },
  '문소현': { bg: '#E8F5E9', border: '#388E3C', text: '#1B5E20' },
  '안': { bg: '#F5F5F5', border: '#757575', text: '#424242' },
  'Kris': { bg: '#FFF3E0', border: '#F57C00', text: '#E65100' },
  '공': { bg: '#FCE4EC', border: '#C2185B', text: '#880E4F' },
  '부원장': { bg: '#F3E5F5', border: '#7B1FA2', text: '#4A148C' },
  '박은영': { bg: '#FFEBEE', border: '#D32F2F', text: '#B71C1C' },
  '클리닉': { bg: '#E0F2F1', border: '#00897B', text: '#004D40' },
  '숙제반': { bg: '#FFFDE7', border: '#F9A825', text: '#F57F17' },
};


function getSubjectsForDivision(division: Division): string[] {
  if (division === '유치부') return ['국어', '초등영어'];
  if (division === '초등부') return ['국어', '초등수학', '초등영어', '숙제반'];
  if (division === '중등부') return ['국어', '중등수학', '중등영어', '숙제반'];
  return ['고등영어', '숙제반'];
}

function getHoursForDivision(division: Division, subject?: string): number[] {
  if (subject === '숙제반') return [14, 15, 16, 17];
  if (division === '초등부' || division === '유치부') return [14, 15, 16, 17];
  if (division === '중등부') return [17, 18, 19, 20];
  return [18, 19, 20];
}

function getGradesForDivision(division: Division): number[] {
  if (division === '유치부') return [0];
  if (division === '초등부') return [1, 2, 3, 4, 5, 6];
  if (division === '중등부') return [1, 2, 3];
  return [1, 2, 3];
}

const generateSchedule = (students: Student[]): ScheduleEntry[] => {
  const schedule: ScheduleEntry[] = [];

  for (const student of students) {
    const subjects = getSubjectsForDivision(student.division);

    subjects.forEach(subject => {
      const selections = student.selectedTeachers[subject];
      if (!selections || selections.length === 0) return;

      selections.forEach(selection => {
        const { day, hour } = selection;

        if (subject === '숙제반') {
          schedule.push({
            studentName: student.name,
            subject,
            teacherName: '숙제반',
            day,
            hour,
          });
        } else {
          const teacher = TEACHERS.find(t => t.id === selection.teacherId);
          if (!teacher) return;

          schedule.push({
            studentName: student.name,
            subject,
            teacherName: teacher.name,
            day,
            hour,
          });
        }
      });
    });
  }
  return schedule;
};

// 시간표 검증: 교사 동시간 중복 / 학생 시간 겹침 / 공백(중간 빈시간)
function validateSchedule(students: Student[]): string[] {
  const warnings: string[] = [];
  const teacherName = (id: string) => (TEACHERS.find(t => t.id === id) || { name: id }).name;
  // 1) 교사가 같은 시간에 서로 다른 반을 맡음
  const slot: Record<string, Set<string>> = {};
  for (const st of students) {
    for (const subj in st.selectedTeachers) {
      for (const e of st.selectedTeachers[subj]) {
        const tid = e.teacherId;
        if (!tid || tid === 'elem_eng_5') continue; // 숙제·클리닉 제외
        // 영어·국어·중등수학은 한 교사=한 반(합반 가능). 학년별 분반은 초등수학만.
        const oneClass = subj.includes('영어') || subj === '국어' || subj === '중등수학';
        const cls = oneClass ? `${subj}|${tid}` : `${st.division}${st.grade}-${subj}`;
        const key = `${e.day}|${e.hour}|${tid}`;
        (slot[key] = slot[key] || new Set()).add(cls);
      }
    }
  }
  for (const key in slot) {
    if (slot[key].size > 1) {
      const [day, hour, tid] = key.split('|');
      warnings.push(`👨‍🏫 교사 중복: ${teacherName(tid)} — ${day} ${Number(hour) - 12}시에 ${slot[key].size}개 반 겹침`);
    }
  }
  // 2) 한 학생이 같은 시간에 두 수업
  for (const st of students) {
    const seen: Record<string, string> = {};
    for (const subj in st.selectedTeachers) {
      for (const e of st.selectedTeachers[subj]) {
        const k = `${e.day}|${e.hour}`;
        if (seen[k]) warnings.push(`🧑‍🎓 ${st.name}: ${e.day} ${e.hour - 12}시 수업 겹침 (${seen[k]}·${subj})`);
        seen[k] = subj;
      }
    }
  }
  // 3) 공백(수업 사이 빈 시간) — 단과·부분수강생에게 특히 문제
  for (const st of students) {
    const byDay: Record<string, number[]> = {};
    for (const subj in st.selectedTeachers)
      for (const e of st.selectedTeachers[subj])
        (byDay[e.day] = byDay[e.day] || []).push(e.hour);
    for (const day in byDay) {
      const hs = byDay[day].sort((a, b) => a - b);
      for (let h = hs[0]; h < hs[hs.length - 1]; h++) {
        if (!hs.includes(h)) { warnings.push(`⏳ ${st.name}: ${day} ${h - 12}시 공백(빈 시간)`); break; }
      }
    }
  }
  return warnings;
}

// 시드 명단 버전. 새 시드가 올라오면 화면 위에 안내만 뜨고, 바꿀지는 사용자가 고른다.
const SEED_VERSION = '2026-08-25-시트기준-중등포함-v18';

// 공용 저장소(구글시트 + Apps Script) — 선생님 누구나 같은 시간표를 보고 저장한다.
const SERVER_URL = 'https://script.google.com/macros/s/AKfycbwfjo6hlMaz0k48AnrYq4LJmrjF69kwQSfZTK8o6MoeX57_9BxYkF9H7DSODYyMX4ih6A/exec';
type SyncStatus = 'loading' | 'ok' | 'saving' | 'offline' | 'conflict' | 'empty';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'students' | 'teachers'>('dashboard');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('happytree_students');
      const parsed = saved ? JSON.parse(saved) : null;
      // ★저장한 시간표는 절대 자동으로 버리지 않는다.
      //   새 시드가 배포돼도 저장본을 그대로 쓰고, 위에 안내만 띄운다.
      if (parsed && parsed.length) return parsed;
      return SEED_STUDENTS as unknown as Student[];
    } catch {
      return SEED_STUDENTS as unknown as Student[];
    }
  });

  // 새로 배포된 시간표가 있는데 저장본을 쓰고 있는 상태인지
  const [seedNotice, setSeedNotice] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('happytree_students');
      const ver = localStorage.getItem('happytree_seed_version');
      return !!(saved && JSON.parse(saved).length && ver && ver !== SEED_VERSION);
    } catch {
      return false;
    }
  });

  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => {
    try {
      const saved = localStorage.getItem('happytree_schedule');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newStudentName, setNewStudentName] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<Division>('초등부');
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [copyFromId, setCopyFromId] = useState<string>(''); // 새 학생 만들 때 복사할 기존 학생
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [configTeacherId, setConfigTeacherId] = useState<string | null>(null);
  const [configDays, setConfigDays] = useState<DayOfWeek[]>([]);
  const [configHour, setConfigHour] = useState<number>(14);
  // 시간표 직접 편집(드래그 이동 / 클릭 복사·붙여넣기)
  const [copied, setCopied] = useState<{studentId: string; subject: string; teacherId: string; teacherName: string; day: DayOfWeek; hour: number} | null>(null);
  const dragRef = useRef<{studentId: string; subject: string; day: DayOfWeek; hour: number} | null>(null);
  // 선생님별 표에서 끌어 옮길 때 쓰는 정보 (studentId가 있으면 그 학생만, 없으면 반 전체)
  const ttDrag = useRef<{who: string; day: DayOfWeek; hour: number; subject: string; teacherId: string; studentId?: string} | null>(null);
  const [history, setHistory] = useState<Student[][]>([]); // 되돌리기용 편집 이력
  const [editMode, setEditMode] = useState<boolean>(false); // 편집 모드(수정하기 버튼으로 켜야 편집 가능)
  // 선생님별 표: 클릭으로 옮기기(고른 것) / 빈 칸에 학생 넣기
  const [ttPick, setTtPick] = useState<{who: string; day: DayOfWeek; hour: number; subject: string; teacherId: string; studentId?: string; label: string} | null>(null);
  const [ttAdd, setTtAdd] = useState<{who: string; day: DayOfWeek; hour: number} | null>(null);
  const [ttSearch, setTtSearch] = useState('');

  // 저장본이 없을 때(첫 방문)만 시드 버전을 찍는다.
  // 저장본이 있으면 버전을 그대로 둬서, 위 안내가 원장님이 선택할 때까지 남아 있게 한다.
  useEffect(() => {
    if (!localStorage.getItem('happytree_students')) {
      localStorage.setItem('happytree_seed_version', SEED_VERSION);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('happytree_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('happytree_schedule', JSON.stringify(schedule));
  }, [schedule]);

  // 학생 데이터가 바뀌면 전체 시간표를 자동 생성 (시드 학생도 바로 표시)
  useEffect(() => {
    setSchedule(generateSchedule(students));
  }, [students]);

  const pushHistory = () => setHistory([...history.slice(-29), students]); // 편집 전 상태 저장(최근 30개)
  const undo = () => {
    if (history.length === 0) return;
    setStudents(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setCopied(null);
  };
  // ── 저장본 보호: 백업 / 새 시간표 불러오기 / 파일로 내보내고 들여오기 ──
  const backupNow = () => {
    localStorage.setItem('happytree_backup', JSON.stringify(students));
    localStorage.setItem('happytree_backup_at', new Date().toLocaleString('ko-KR'));
  };
  const loadSeed = () => {
    if (!confirm('새로 배포된 시간표로 바꿉니다.\n지금 시간표는 백업해두니 ↩️되돌리기로 복구할 수 있습니다.\n계속할까요?')) return;
    backupNow();
    setStudents(SEED_STUDENTS as unknown as Student[]);
    localStorage.setItem('happytree_seed_version', SEED_VERSION);
    setSeedNotice(false);
  };
  const keepMine = () => {
    localStorage.setItem('happytree_seed_version', SEED_VERSION);
    setSeedNotice(false);
  };
  // 어떤 시간표인지 한 줄 요약 (초1은 3~5시, 초2는 2~4시가 다 차야 정상)
  const summarize = (list: Student[]) => {
    const slots = list.reduce((a, s2) =>
      a + Object.values(s2.selectedTeachers || {}).reduce((b, v) => b + v.length, 0), 0);
    const fill = (g: number, hs: number[]) => {
      const kids = list.filter(s2 => s2.division === '초등부' && s2.grade === g);
      if (!kids.length) return '-';
      const got = kids.map(s2 => {
        const f = new Set(Object.values(s2.selectedTeachers || {}).flat().map(c => `${c.day}|${c.hour}`));
        return DAYS.reduce((a, d) => a + hs.filter(h => f.has(`${d}|${h}`)).length, 0);
      });
      return (got.reduce((a, b) => a + b, 0) / kids.length).toFixed(1) + '/' + (DAYS.length * hs.length);
    };
    return `학생 ${list.length}명 · 수업 ${slots}칸 · 초1 ${fill(1, [15, 16, 17])}칸 · 초2 ${fill(2, [14, 15, 16])}칸`;
  };

  const restoreBackup = () => {
    const b = localStorage.getItem('happytree_backup');
    if (!b) { alert('이 브라우저에 백업이 없습니다.'); return; }
    const at = localStorage.getItem('happytree_backup_at') || '';
    let list: Student[];
    try { list = JSON.parse(b); } catch { alert('백업을 읽지 못했습니다.'); return; }
    const ok = confirm('이 브라우저에 남아 있는 백업으로 되돌립니다.\n\n[백업] ' + at + '\n  ' + summarize(list) +
      '\n\n[지금 화면]\n  ' + summarize(students) + '\n\n계속할까요? (지금 화면도 다시 백업됩니다)');
    if (!ok) return;
    backupNow();
    setStudents(list);
  };
  const exportFile = () => {
    const blob = new Blob([JSON.stringify(students, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `해피트리_시간표_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        if (!Array.isArray(data) || !data.length) throw new Error('형식이 다릅니다');
        if (!confirm(`${data.length}명짜리 시간표를 불러옵니다.\n지금 시간표는 백업해둡니다. 계속할까요?`)) return;
        backupNow();
        setStudents(data);
      } catch {
        alert('시간표 파일이 아닙니다.');
      }
    };
    r.readAsText(file);
  };

  // ── 공용 저장소: 받아오기 / 올리기 / 남이 바꿨는지 확인 ──────────────
  const [me, setMe] = useState<string>(() => localStorage.getItem('happytree_me') || '');
  const [sync, setSync] = useState<{ status: SyncStatus; at: string; by: string; err?: string }>(
    { status: 'loading', at: '', by: '' });
  const [serverCopy, setServerCopy] = useState<{ students: Student[]; at: string; by: string } | null>(null);
  const [replacedNotice, setReplacedNotice] = useState(false);   // 예전 자료를 서버 것으로 맞췄음
  const revRef = useRef<number>(-1);      // 내가 받아간 서버 버전
  const studentsRef = useRef<Student[]>(students);        // 타이머 안에서 최신 학생 목록 보기
  const meRef = useRef<string>(me);
  const syncedRef = useRef<Record<string, string>>({});   // 서버가 갖고 있는 내용(학생별)
  const lastAppliedRef = useRef<string>('');              // 방금 서버에서 받아 적용한 내용
  const lastEditRef = useRef<number>(0);                  // 마지막으로 사람이 고친 시각
  const dirtyRef = useRef<Set<string>>(new Set());        // 이 창에서 내가 고친 학생 (아직 못 올린 것)
  const deletedRef = useRef<Set<string>>(new Set());      // 이 창에서 내가 지운 학생
  const prevRef = useRef<Student[]>(students);            // 직전 학생 목록 (무엇이 바뀌었는지 비교용)
  const pendingRef = useRef(false);       // 아직 서버에 못 올린 편집이 있다
  const saveTimer = useRef<number | undefined>(undefined);

  // 두 시간표가 같은 내용인지 (키 순서·형식 차이는 무시)
  const signature = (list: Student[]) => list.map(s =>
    `${s.name}|${s.division}${s.grade}|${s.vocab || ''}|` +
    Object.keys(s.selectedTeachers || {}).sort().map(sub =>
      (s.selectedTeachers[sub] || []).map(c => `${sub}@${c.teacherId}@${c.day}@${c.hour}`).sort().join(',')
    ).join(';')
  ).sort().join('\n');

  const snapshotOf = (list: Student[]) => {
    const m: Record<string, string> = {};
    list.forEach(s2 => { m[s2.id] = JSON.stringify(s2); });
    return m;
  };
  // ★서버 내용을 받아들이되, 아직 못 보낸 내 수정은 절대 지우지 않는다.
  //   (저장하는 1~3초 사이에 고친 것이 서버 응답에 덮여 사라지던 문제)
  const applyServerList = (list: Student[], rev: number, at: string, by: string) => {
    const localEdited = new Map<string, Student>();
    studentsRef.current.forEach(s2 => {
      if (dirtyRef.current.has(s2.id)) localEdited.set(s2.id, s2);   // 내가 고친 것만 지킨다
    });
    const merged = list.map(s2 => localEdited.get(s2.id) || s2);
    const onServer = new Set(list.map(s2 => s2.id));
    localEdited.forEach((s2, id) => { if (!onServer.has(id)) merged.push(s2); });   // 내가 새로 만든 학생

    lastAppliedRef.current = JSON.stringify(merged);
    setStudents(merged);
    syncedRef.current = snapshotOf(list);        // 서버가 아는 내용
    revRef.current = rev;
    pendingRef.current = localEdited.size > 0 || deletedRef.current.size > 0;
    setServerCopy(null);
    localStorage.setItem('happytree_rev', String(rev));
    setSync({ status: 'ok', at, by });
    if (localEdited.size > 0) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => { pushNow(); }, 800);
    }
  };

  const pullNow = async (opts: { firstTime?: boolean } = {}) => {
    try {
      const r = await fetch(`${SERVER_URL}?action=load`, { redirect: 'follow' });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || '서버 오류');
      revRef.current = d.rev;
      if (d.students && d.students.length) {
        const hadLocal = !!localStorage.getItem('happytree_students');
        const syncedBefore = localStorage.getItem('happytree_rev') !== null;
        const differs = signature(d.students) !== signature(studentsRef.current);
        if (opts.firstTime && hadLocal && differs && !syncedBefore) {
          backupNow();
          setReplacedNotice(true);
        } else if (opts.firstTime && hadLocal && differs && syncedBefore) {
          setServerCopy({ students: d.students, at: d.at, by: d.by });
          setSync({ status: 'conflict', at: d.at, by: d.by });
          return;
        }
        applyServerList(d.students, d.rev, d.at, d.by);
      } else {
        setSync({ status: 'empty', at: d.at, by: d.by });   // 서버가 아직 비어 있음
      }
    } catch (e) {
      setSync({ status: 'offline', at: '', by: '', err: String(e) });
    }
  };

  // 서버 것을 그대로 받아 화면을 맞춘다(내 것은 백업 후 버림).
  // 관리자가 예전 시점으로 되돌렸을 때처럼, 서버가 정답인 경우에 쓴다.
  const forcePull = async () => {
    try {
      const r = await fetch(`${SERVER_URL}?action=load`, { redirect: 'follow' });
      const d = await r.json();
      if (!d.ok || !d.students || !d.students.length) throw new Error(d.error || '서버에 자료가 없습니다');
      const mine = JSON.stringify(studentsRef.current);
      const theirs = JSON.stringify(d.students);
      if (mine === theirs) { setSync({ status: 'ok', at: d.at, by: d.by }); alert('이미 서버와 같은 시간표입니다.'); return; }
      if (!confirm(`서버에 저장된 시간표(학생 ${d.students.length}명, ${d.at} ${d.by})로 이 화면을 맞춥니다.
지금 화면의 내용은 백업해두니 ↩️되돌리기로 복구할 수 있습니다.
계속할까요?`)) return;
      backupNow();
      window.clearTimeout(saveTimer.current);
      lastAppliedRef.current = theirs;
      dirtyRef.current.clear();
      deletedRef.current.clear();
      prevRef.current = d.students;
      setStudents(d.students);
      syncedRef.current = snapshotOf(d.students);
      revRef.current = d.rev;
      pendingRef.current = false;
      setServerCopy(null);
      setReplacedNotice(false);
      localStorage.setItem('happytree_rev', String(d.rev));
      setSync({ status: 'ok', at: d.at, by: d.by });
    } catch (e) {
      setSync(s2 => ({ ...s2, status: 'offline', err: String(e) }));
      alert('서버에서 받아오지 못했습니다. 인터넷을 확인해 주세요.');
    }
  };

  // 고친 학생만 보낸다 → 두 선생님이 서로 다른 학생을 고치면 부딪히지 않는다
  const pushNow = async (whole = false) => {
    const list = studentsRef.current;
    // ★내가 이 창에서 직접 고친 학생만 보낸다.
    //   예전에는 '서버가 아는 내용과 다른 학생'을 전부 보내서, 오래된 창이
    //   남의 최신 수정을 옛 내용으로 되돌려버렸다.
    const changed = list.filter(s2 => dirtyRef.current.has(s2.id));
    const deleted = Array.from(deletedRef.current);
    if (!whole && !changed.length && !deleted.length) {
      pendingRef.current = false;
      return;
    }
    setSync(s2 => ({ ...s2, status: 'saving' }));
    try {
      const body = whole
        ? { students: list, by: meRef.current || '이름없음', force: true }
        : { mode: 'patch', changed, deleted, by: meRef.current || '이름없음' };
      const r = await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // 미리검사(preflight) 피하기
        redirect: 'follow',
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.conflict) { setSync({ status: 'conflict', at: d.at, by: d.by }); return; }
      if (!d.ok) throw new Error(d.error || '저장 실패');
      changed.forEach(s2 => dirtyRef.current.delete(s2.id));
      deleted.forEach(id => deletedRef.current.delete(id));
      if (d.students && d.students.length) {
        applyServerList(d.students, d.rev, d.at, d.by);
      } else {
        revRef.current = d.rev;
        syncedRef.current = snapshotOf(list);
        pendingRef.current = false;
        localStorage.setItem('happytree_rev', String(d.rev));
        setSync({ status: 'ok', at: d.at, by: d.by });
      }
    } catch (e) {
      // 실패하면 pendingRef를 남겨둬서 다음 확인 주기에 자동으로 다시 시도한다
      setSync(s2 => ({ ...s2, status: 'offline', err: String(e) }));
    }
  };

  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { meRef.current = me; }, [me]);
  useEffect(() => { pullNow({ firstTime: true }); }, []);                     // 시작할 때 서버에서 받아온다

  useEffect(() => {                                        // 사람이 고치면 1.2초 뒤 자동 저장
    if (sync.status === 'loading') return;                 // 첫 로드 전에는 올리지 않는다
    // 서버에서 받아 적용한 그대로면 내 수정이 아니므로 저장하지 않는다
    const prev = prevRef.current;
    prevRef.current = students;
    if (lastAppliedRef.current === JSON.stringify(students)) return;
    const pm = new Map(prev.map(s2 => [s2.id, JSON.stringify(s2)]));
    students.forEach(s2 => { if (pm.get(s2.id) !== JSON.stringify(s2)) dirtyRef.current.add(s2.id); });
    prev.forEach(s2 => { if (!students.some(x => x.id === s2.id)) deletedRef.current.add(s2.id); });
    lastEditRef.current = Date.now();
    pendingRef.current = true;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { pushNow(); }, 1200);
  }, [students]);

  useEffect(() => {                    // 창을 다시 보면 곧바로 최신으로 맞춘다
    const wake = () => {
      if (document.hidden) return;
      if (pendingRef.current) pushNow(); else pullNow();
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
  }, []);

  useEffect(() => {                    // 7초마다 확인 — 못 보낸 저장은 다시 시도하고, 남이 고쳤으면 받아온다
    const t = window.setInterval(async () => {
      if (sync.status === 'conflict' || sync.status === 'saving') return;
      if (pendingRef.current) { pushNow(); return; }
      if (Date.now() - lastEditRef.current < 3000) return;   // 지금 고치는 중이면 건드리지 않는다
      try {
        const r = await fetch(`${SERVER_URL}?action=rev`, { redirect: 'follow' });
        const d = await r.json();
        if (d.ok && d.rev !== revRef.current) pullNow();
      } catch { /* 연결 안 되면 다음 주기에 다시 */ }
    }, 7000);
    return () => window.clearInterval(t);
  }, [sync.status]);

  const updateVocab = (studentId: string, value: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, vocab: value } : s));
  };
  const findTeacherId = (student: Student, subject: string, day: DayOfWeek, hour: number): string => {
    const f = (student.selectedTeachers[subject] || []).find(x => x.day === day && x.hour === hour);
    return f ? f.teacherId : '';
  };
  const moveClass = (studentId: string, subject: string, srcDay: DayOfWeek, srcHour: number, dstDay: DayOfWeek, dstHour: number) => {
    if (srcDay === dstDay && srcHour === dstHour) return;
    pushHistory();
    // 드래그한 수업의 선생님 = 같은 반 식별 기준(같은 과목·시간·선생님이면 같은 반)
    const dragger = students.find(s => s.id === studentId);
    const dragEntry = (dragger?.selectedTeachers[subject] || []).find(x => x.day === srcDay && x.hour === srcHour);
    const classTeacher = dragEntry ? dragEntry.teacherId : null;
    setStudents(prev => prev.map(s => {
      const cur = s.selectedTeachers[subject];
      if (!cur) return s;
      // 이 학생이 같은 반(같은 과목·시간·선생님)에 속하면 함께 이동
      const inClass = cur.some(x => x.day === srcDay && x.hour === srcHour && x.teacherId === classTeacher);
      if (!inClass) return s;
      const next = cur.map(x => (x.day === srcDay && x.hour === srcHour && x.teacherId === classTeacher) ? { ...x, day: dstDay, hour: dstHour } : x);
      return { ...s, selectedTeachers: { ...s.selectedTeachers, [subject]: next } };
    }));
  };
  const pasteClass = (studentId: string, subject: string, teacherId: string, dstDay: DayOfWeek, dstHour: number) => {
    pushHistory();
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const cur = s.selectedTeachers[subject] || [];
      if (cur.some(x => x.day === dstDay && x.hour === dstHour)) return s; // 이미 그 칸에 있으면 스킵
      return { ...s, selectedTeachers: { ...s.selectedTeachers, [subject]: [...cur, { teacherId, day: dstDay, hour: dstHour }] } };
    }));
  };
  const deleteClass = (studentId: string, subject: string, day: DayOfWeek, hour: number) => {
    pushHistory();
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const cur = s.selectedTeachers[subject] || [];
      return { ...s, selectedTeachers: { ...s.selectedTeachers, [subject]: cur.filter(x => !(x.day === day && x.hour === hour)) } };
    }));
  };

  const cloneTeachers = (st: Student) => {
    const out: { [subject: string]: TeacherSelection[] } = {};
    for (const k in st.selectedTeachers) out[k] = st.selectedTeachers[k].map(x => ({ ...x }));
    return out;
  };

  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const src = copyFromId ? students.find(s => s.id === copyFromId) : null;
    const newStudent: Student = {
      id: `student_${Date.now()}`,
      name: newStudentName,
      division: src ? src.division : selectedDivision, // 복사 시 원본 학년/부 따라감
      grade: src ? src.grade : selectedGrade,
      vocab: src ? src.vocab : undefined,
      selectedTeachers: src ? cloneTeachers(src) : {},
    };
    setStudents([...students, newStudent]);
    setNewStudentName('');
    setCopyFromId('');
    setEditingStudent(newStudent);
  };

  const duplicateStudent = (src: Student) => {
    const dup: Student = {
      id: `student_${Date.now()}`,
      name: src.name + ' 사본',
      division: src.division,
      grade: src.grade,
      vocab: src.vocab,
      selectedTeachers: cloneTeachers(src),
    };
    setStudents([...students, dup]);
    setEditingStudent(dup);
  };

  const deleteStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
    setEditingStudent(null);
  };

  const addTeacherToSubject = (subject: string, teacherId: string) => {
    if (!editingStudent) return;
    setSelectedSubject(subject);
    setConfigTeacherId(teacherId);
    setConfigDays([]);
    setConfigHour(getHoursForDivision(editingStudent.division, subject)[0] || 14);
  };

  const toggleDay = (day: DayOfWeek) => {
    setConfigDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const saveTeacherConfig = () => {
    if (!editingStudent || !selectedSubject || !configTeacherId || configDays.length === 0) {
      alert('요일과 시간을 선택해주세요');
      return;
    }

    const current = editingStudent.selectedTeachers[selectedSubject] || [];
    const newSelections: TeacherSelection[] = configDays.map(day => ({
      teacherId: configTeacherId,
      day,
      hour: configHour,
    }));
    const updated = [...current, ...newSelections];

    const updatedStudent = {
      ...editingStudent,
      selectedTeachers: {
        ...editingStudent.selectedTeachers,
        [selectedSubject]: updated,
      },
    };
    setStudents(students.map(s => s.id === editingStudent.id ? updatedStudent : s));
    setEditingStudent(updatedStudent);
    setSelectedSubject(null);
    setConfigTeacherId(null);
    setConfigDays([]);
  };

  const removeTeacher = (subject: string, idx: number) => {
    if (!editingStudent) return;
    const updated = editingStudent.selectedTeachers[subject].filter((_, i) => i !== idx);
    const updatedStudent = {
      ...editingStudent,
      selectedTeachers: {
        ...editingStudent.selectedTeachers,
        [subject]: updated,
      },
    };
    setStudents(students.map(s => s.id === editingStudent.id ? updatedStudent : s));
    setEditingStudent(updatedStudent);
  };

  const generateAllSchedules = () => {
    const newSchedule = generateSchedule(students);
    setSchedule(newSchedule);
  };

  const scheduleWarnings = validateSchedule(students);

  // ===== 선생님별 시간표 =====
  if (currentView === 'teachers') {
    // 초등 2시 ~ 중등·고등 8시까지 한 표에
    const HOURS = [14, 15, 16, 17, 18, 19, 20];
    type Item = { studentId: string; name: string; subject: string; teacherId: string };
    type Cell = { subject: string; grades: Set<string>; names: string[]; items: Item[] };
    // 선생님 한 분이 초등·중등 아이디를 따로 갖고 있어서 '사람' 기준으로 묶는다
    const grid: Record<string, Record<string, Cell>> = {};
    const divTag = (d: Division, g: number) =>
      d === '유치부' ? '유치' : d === '초등부' ? `초${g}` : d === '중등부' ? `중${g}` : `고${g}`;
    for (const st of students) {
      for (const subj in st.selectedTeachers) {
        for (const e of st.selectedTeachers[subj]) {
          const who = e.teacherId ? (TEACHERS.find(t => t.id === e.teacherId)?.name || e.teacherId) : '숙제반';
          const key = `${e.day}|${e.hour}`;
          (grid[who] = grid[who] || {});
          const c = (grid[who][key] = grid[who][key] || { subject: subj, grades: new Set(), names: [], items: [] });
          c.grades.add(divTag(st.division, st.grade)); c.names.push(st.name);
          c.items.push({ studentId: st.id, name: st.name, subject: subj, teacherId: e.teacherId || '' });
        }
      }
    }
    const tname = (who: string) => who;
    const gLabel = (gs: Set<string>) => Array.from(gs).sort().join('·');
    // 구글시트 '국영수전체시간표'와 같은 열 순서 — 요일마다 이 열들이 반복된다
    const ALL_COLS = [
      { id: '부원장', label: '영어 부T' },
      { id: '공',     label: '영어 공T' },
      { id: '박은영', label: '영어 은영T' },
      { id: 'Kris',   label: '영어 KrisT' },
      { id: '클리닉', label: '영어 클리닉' },
      { id: '문원영', label: '국어 원T' },
      { id: '문소현', label: '수학 문소현' },
      { id: '안',     label: '수학 안T' },
      { id: '숙제반', label: '숙제반' },
    ];
    const cols = ALL_COLS.filter(c => grid[c.id]);

    // ── 선생님별 표에서 바로 고치기 ──────────────────────────────
    // 이 표에서 옮기거나 지우면 학생 개인 시간표가 그대로 바뀐다.
    const teacherIdFor = (who: string, subject: string): string | null => {
      if (subject === '숙제반') return who === '숙제반' ? '' : null;
      if (who === '숙제반') return null;
      const t = TEACHERS.find(x => x.name === who && x.subject === subject);
      return t ? t.id : null;
    };
    // 이 선생님 칸에 이 학생(부)이 들어갈 수 있는 과목
    const subjectForColumn = (who: string, division: Division): string | null => {
      if (who === '숙제반') return '숙제반';
      const cands = TEACHERS.filter(t => t.name === who);
      if (!cands.length) return null;
      const pref = division === '중등부' ? '중등' : division === '고등부' ? '고등' : '초등';
      const hit = cands.find(x => x.subject.startsWith(pref)) || cands.find(x => x.subject === '국어');
      return hit ? hit.subject : null;
    };
    const addToCell = (studentId: string, who: string, day: DayOfWeek, hour: number) => {
      const st = students.find(s2 => s2.id === studentId);
      if (!st) return;
      const subject = subjectForColumn(who, st.division);
      const tid = subject ? teacherIdFor(who, subject) : null;
      if (!subject || tid === null) {
        alert(`${st.name}(${st.division})은(는) ${who} 칸에 넣을 수 없습니다.`);
        return;
      }
      pushHistory();
      setStudents(prev => prev.map(s2 => s2.id !== studentId ? s2 : {
        ...s2,
        selectedTeachers: {
          ...s2.selectedTeachers,
          [subject]: [...(s2.selectedTeachers[subject] || []), { teacherId: tid, day, hour }],
        },
      }));
      setTtAdd(null);
      setTtSearch('');
    };
    const dropOnCell = (toWho: string, toDay: DayOfWeek, toHour: number, picked?: typeof ttPick) => {
      const d = picked || ttDrag.current;
      ttDrag.current = null;
      if (!d) return;
      if (d.who === toWho && d.day === toDay && d.hour === toHour) return;
      const targetId = teacherIdFor(toWho, d.subject);
      if (targetId === null) {
        alert(`${toWho} 칸에는 ${d.subject} 수업을 넣을 수 없습니다.\n같은 과목 칸으로 옮겨주세요.`);
        return;
      }
      pushHistory();
      setStudents(prev => prev.map(st => {
        if (d.studentId && st.id !== d.studentId) return st;
        const list = st.selectedTeachers[d.subject];
        if (!list) return st;
        let touched = false;
        const next = list.map(c => {
          const sameSlot = c.day === d.day && c.hour === d.hour;
          const sameTeacher = (c.teacherId || '') === d.teacherId;
          if (sameSlot && sameTeacher) { touched = true; return { ...c, teacherId: targetId, day: toDay, hour: toHour }; }
          return c;
        });
        if (!touched) return st;
        return { ...st, selectedTeachers: { ...st.selectedTeachers, [d.subject]: next } };
      }));
    };
    const removeFromCell = (studentId: string, subject: string, day: DayOfWeek, hour: number) => {
      pushHistory();
      setStudents(prev => prev.map(st => st.id !== studentId ? st : {
        ...st,
        selectedTeachers: {
          ...st.selectedTeachers,
          [subject]: (st.selectedTeachers[subject] || []).filter(c => !(c.day === day && c.hour === hour)),
        },
      }));
    };
    // 아무도 수업이 없는 시간대는 행에서 뺀다
    const usedHours = HOURS.filter(h => cols.some(c => DAYS.some(d => grid[c.id][`${d}|${h}`])));
    const ttHead: CSSProperties = {
      border: '1px solid #b6bec7', padding: '5px 4px', fontSize: '11px',
      fontWeight: 'bold', textAlign: 'center',
    };
    return (
      <div className="app-root tt-page" style={styles.app}>
        <header className="no-print" style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{...styles.logo, width: '40px', height: '40px', fontSize: '20px', margin: 0}}>H</div>
            <h1 style={styles.headerTitle}>해피트리학원 스케줄</h1>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => setCurrentView('dashboard')} style={{...styles.tabBtn}}>📊 메인</button>
            <button onClick={() => setCurrentView('teachers')} style={{...styles.tabBtn, ...styles.tabBtnActive}}>👩‍🏫 선생님별</button>
            <button onClick={() => setCurrentView('students')} style={{...styles.tabBtn}}>📋 학생관리</button>
          </div>
        </header>
        <div className="dashboard-scroll" style={styles.dashboardContent}>
          <div className="sticky-bar" style={{position:'sticky', top:0, zIndex:30, background:'#f5f5f5', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap', margin:'0 -20px 12px', padding:'14px 20px', borderBottom:'1px solid #ddd'}}>
            <h2 style={{margin:0}}>👩‍🏫 선생님별 시간표</h2>
            <button
              className="no-print"
              onClick={() => { setEditMode(v => !v); ttDrag.current = null; }}
              style={{padding:'7px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'bold', color:'#fff', background: editMode ? '#2e7d32' : '#d32f2f'}}
            >{editMode ? '✅ 수정 완료' : '✏️ 수정하기'}</button>
            <button className="no-print" onClick={undo} disabled={history.length === 0}
              style={{padding:'7px 12px', borderRadius:'6px', border:'none', cursor: history.length ? 'pointer' : 'not-allowed', fontSize:'12px', fontWeight:'bold', color:'#fff', background: history.length ? '#1976D2' : '#ccc'}}
            >↩️ 되돌리기{history.length ? ` (${history.length})` : ''}</button>
            <button className="no-print" onClick={() => { setEditMode(false); setTimeout(() => window.print(), 100); }} style={{padding:'7px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'bold', color:'#fff', background:'#1976D2'}}>🖨️ 인쇄</button>
            {sync.status === 'saving' && <span className="no-print" style={{fontSize:'12px', color:'#1976D2', fontWeight:'bold'}}>⏳ 저장 중…</span>}
            {sync.status === 'ok' && <span className="no-print" style={{fontSize:'12px', color:'#2e7d32', fontWeight:'bold'}}>☁️ 저장됨</span>}
            {sync.status === 'offline' && <span className="no-print" style={{fontSize:'12px', color:'#fff', background:'#F57F17', borderRadius:'12px', padding:'3px 10px', fontWeight:'bold'}}>⚠️ 서버 연결 안 됨</span>}
            {editMode && (
              <span className="no-print" style={{fontSize:'12px', color:'#555'}}>
                <b>옮기기</b>: ⇄ 를 누른 뒤 옮길 칸을 누르세요 · <b>넣기</b>: 빈 칸을 누르세요 · <b>빼기</b>: ✕ · 그 밖의 클릭으로는 아무것도 바뀌지 않습니다
              </span>
            )}
          </div>
          {editMode && ttPick && (
            <div className="no-print" style={{background:'#E3F2FD', border:'2px solid #1976D2', borderRadius:'8px', padding:'8px 12px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
              <span style={{fontSize:'13px', color:'#0D47A1'}}>
                📌 <b>{ttPick.label}</b> 골랐습니다 — <b>옮길 칸을 누르세요</b>
                {ttPick.studentId ? ' (이 학생만 옮겨집니다)' : ' (반 전체가 옮겨집니다)'}
              </span>
              <button onClick={() => setTtPick(null)} style={{marginLeft:'auto', padding:'5px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#1976D2', color:'#fff'}}>취소</button>
            </div>
          )}
          {editMode && ttAdd && (() => {
            const cands = students.filter(st => {
              const subj = subjectForColumn(ttAdd.who, st.division);
              if (!subj || teacherIdFor(ttAdd.who, subj) === null) return false;
              const busy = Object.values(st.selectedTeachers || {}).flat()
                .some(c2 => c2.day === ttAdd.day && c2.hour === ttAdd.hour);
              if (busy) return false;
              return !ttSearch.trim() || st.name.includes(ttSearch.trim());
            });
            return (
              <div className="no-print" style={{background:'#F1F8E9', border:'2px solid #2e7d32', borderRadius:'8px', padding:'10px 12px', marginBottom:'8px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'8px'}}>
                  <span style={{fontSize:'13px', color:'#1B5E20'}}>
                    ➕ <b>{ttAdd.who}</b> · <b>{ttAdd.day} {ttAdd.hour - 12}시</b> 에 넣을 학생을 고르세요
                    <span style={{color:'#666'}}> (그 시간에 수업이 없는 학생만 나옵니다 · {cands.length}명)</span>
                  </span>
                  <input value={ttSearch} onChange={(ev) => setTtSearch(ev.target.value)} placeholder="이름 검색"
                    style={{padding:'5px 8px', fontSize:'12px', border:'1px solid #ccc', borderRadius:'6px', width:'120px'}} />
                  <button onClick={() => { setTtAdd(null); setTtSearch(''); }} style={{marginLeft:'auto', padding:'5px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#2e7d32', color:'#fff'}}>닫기</button>
                </div>
                <div style={{display:'flex', flexWrap:'wrap', gap:'6px', maxHeight:'150px', overflowY:'auto'}}>
                  {cands.length === 0 && <span style={{fontSize:'12px', color:'#888'}}>넣을 수 있는 학생이 없습니다 (그 시간에 다들 수업이 있거나, 이 선생님이 맡는 과목이 아닙니다)</span>}
                  {cands.map(st => (
                    <button key={st.id} onClick={() => addToCell(st.id, ttAdd.who, ttAdd.day, ttAdd.hour)}
                      style={{padding:'4px 10px', borderRadius:'12px', border:'1px solid #2e7d32', background:'#fff', color:'#1B5E20', cursor:'pointer', fontSize:'12px'}}>
                      {st.name} <span style={{color:'#888', fontSize:'10px'}}>{st.division === '유치부' ? '유치' : `${st.division[0]}${st.grade}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {editMode && scheduleWarnings.length > 0 && (
            <div className="no-print" style={{background:'#FFEBEE', border:'2px solid #d32f2f', borderRadius:'8px', padding:'8px 12px', marginBottom:'8px', maxHeight:'130px', overflowY:'auto'}}>
              <div style={{fontWeight:'bold', color:'#d32f2f', marginBottom:'4px', fontSize:'13px'}}>⚠️ 경고 {scheduleWarnings.length}건</div>
              {scheduleWarnings.slice(0, 8).map((w, i) => (
                <div key={i} style={{fontSize:'12px', color:'#b71c1c', lineHeight:1.5}}>• {w}</div>
              ))}
            </div>
          )}
          <div className="tt-wrap" style={{overflowX:'auto', background:'#fff', borderRadius:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', padding:'2px'}}>
            <table className="tt" style={{borderCollapse:'collapse', fontSize:'11px', tableLayout:'fixed'}}>
              <thead>
                <tr>
                  <th className="tt-corner" style={{...ttHead, width:'38px', minWidth:'38px', background:'#fff'}} rowSpan={2}></th>
                  {DAYS.map((d, di) => (
                    <th key={d} colSpan={cols.length}
                        style={{...ttHead, fontSize:'14px', background:'#DDEBF7', color:'#123',
                                borderRight: di < DAYS.length-1 ? '2px solid #7f8c9b' : '1px solid #b6bec7'}}>{d}</th>
                  ))}
                </tr>
                <tr>
                  {DAYS.map((d, di) => cols.map((c, ci) => {
                    const clr = TEACHER_COLORS[tname(c.id)] || TEACHER_COLORS['숙제반'];
                    return (
                      <th key={d + c.id}
                          style={{...ttHead, width:'92px', minWidth:'92px', background: clr.bg, color: clr.text,
                                  borderRight: (ci === cols.length-1 && di < DAYS.length-1) ? '2px solid #7f8c9b' : '1px solid #b6bec7'}}>
                        {c.label}
                      </th>
                    );
                  }))}
                </tr>
              </thead>
              <tbody>
                {usedHours.map(h => (
                  <tr key={h}>
                    <th style={{...ttHead, background:'#fff', fontSize:'12px'}}>{h-12}시</th>
                    {DAYS.map((d, di) => cols.map((c, ci) => {
                      const cell = grid[c.id]?.[`${d}|${h}`];
                      const clr = TEACHER_COLORS[tname(c.id)] || TEACHER_COLORS['숙제반'];
                      return (
                        <td key={d + c.id}
                            onDragOver={(ev) => { if (editMode) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } }}
                            onDrop={(ev) => { if (editMode) { ev.preventDefault(); dropOnCell(c.id, d, h); } }}
                            onClick={() => {
                              if (!editMode) return;
                              if (ttPick) { dropOnCell(c.id, d, h, ttPick); setTtPick(null); return; }
                              if (cell) return;                       // 수업이 있는 칸은 눌러도 아무 일 없음
                              setTtAdd({ who: c.id, day: d, hour: h }); setTtSearch('');
                            }}
                            style={{verticalAlign:'top', padding:'4px 5px', lineHeight:1.35,
                                    border:'1px solid #d5dae0',
                                    borderRight: (ci === cols.length-1 && di < DAYS.length-1) ? '2px solid #7f8c9b' : '1px solid #d5dae0',
                                    background: cell ? clr.bg : '#fff'}}>
                          {cell && (
                            <>
                              <div
                                draggable={editMode}
                                onDragStart={(ev) => { if (!editMode) return; ttDrag.current = { who: c.id, day: d, hour: h, subject: cell.subject, teacherId: cell.items[0]?.teacherId || '' }; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', '반'); }}
                                onDragEnd={() => { ttDrag.current = null; }}
                                title={editMode ? '끌어서 이 반 전체를 옮깁니다 (또는 ⇄ 버튼)' : undefined}
                                style={{fontWeight:'bold', color: clr.text, fontSize:'10px', marginBottom:'2px',
                                        cursor: editMode ? 'grab' : undefined}}>
                                {editMode && (
                                  <button
                                    onClick={(ev) => { ev.stopPropagation();
                                      setTtPick({ who: c.id, day: d, hour: h, subject: cell.subject,
                                                  teacherId: cell.items[0]?.teacherId || '',
                                                  label: `${gLabel(cell.grades)} ${cell.subject} ${cell.names.length}명 (${d} ${h - 12}시)` }); }}
                                    title="이 반 전체를 옮깁니다"
                                    style={{border:'none', background:'transparent', color: clr.text, cursor:'pointer',
                                            fontSize:'11px', padding:0, marginRight:'3px'}}>⇄</button>
                                )}
                                {gLabel(cell.grades)} <span style={{fontWeight:'normal', opacity:.7}}>{cell.names.length}</span>
                              </div>
                              {cell.items.map((it, ii) => (
                                <div key={it.studentId + ii}
                                  draggable={editMode}
                                  onDragStart={(ev) => { if (!editMode) return; ev.stopPropagation(); ttDrag.current = { who: c.id, day: d, hour: h, subject: it.subject, teacherId: it.teacherId, studentId: it.studentId }; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', it.name); }}
                                  onDragEnd={() => { ttDrag.current = null; }}
                                  onClick={(ev) => { if (editMode) ev.stopPropagation(); }}
                                  title={editMode ? '⇄ 를 누르면 이 학생만 옮깁니다' : undefined}
                                  style={{fontSize:'10.5px', color:'#333', whiteSpace:'nowrap',
                                          display:'flex', alignItems:'center', gap:'3px',
                                          cursor: editMode ? 'grab' : undefined}}>
                                  <span>{it.name}</span>
                                  {editMode && (
                                    <button
                                      onClick={(ev) => { ev.stopPropagation();
                                        setTtPick({ who: c.id, day: d, hour: h, subject: it.subject, teacherId: it.teacherId,
                                                    studentId: it.studentId, label: `${it.name} ${it.subject} (${d} ${h - 12}시)` }); }}
                                      title="이 학생만 옮깁니다"
                                      style={{marginLeft:'auto', border:'none', background:'transparent', color:'#1976D2',
                                              cursor:'pointer', fontSize:'10px', lineHeight:1, padding:0}}>⇄</button>
                                  )}
                                  {editMode && (
                                    <button
                                      onClick={(ev) => { ev.stopPropagation(); removeFromCell(it.studentId, it.subject, d, h); }}
                                      title="이 학생의 이 수업을 지웁니다"
                                      style={{border:'none', background:'transparent', color:'#d32f2f',
                                              cursor:'pointer', fontSize:'10px', lineHeight:1, padding:0}}>✕</button>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </td>
                      );
                    }))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div className="app-root" style={styles.app}>
        <header className="no-print" style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{...styles.logo, width: '40px', height: '40px', fontSize: '20px', margin: 0}}>H</div>
            <h1 style={styles.headerTitle}>해피트리학원 스케줄</h1>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => setCurrentView('dashboard')} style={{...styles.tabBtn, ...styles.tabBtnActive}}>
              📊 메인
            </button>
            <button onClick={() => setCurrentView('teachers')} style={{...styles.tabBtn}}>
              👩‍🏫 선생님별
            </button>
            <button onClick={() => setCurrentView('students')} style={{...styles.tabBtn}}>
              📋 학생관리
            </button>
          </div>
        </header>

        <div className="dashboard-scroll" style={styles.dashboardContent}>
          <div className="sticky-bar" style={{position:'sticky', top:0, zIndex:30, background:'#f5f5f5', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap', margin:'0 -20px 8px', padding:'14px 20px', borderBottom:'1px solid #ddd', boxShadow:'0 2px 6px rgba(0,0,0,0.08)'}}>
            <h2 style={{margin:0}}>📊 전체 시간표</h2>
            <button
              className="no-print"
              onClick={() => { setEditMode(v => !v); setCopied(null); }}
              style={{padding:'7px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'bold', color:'#fff', background: editMode ? '#2e7d32' : '#d32f2f'}}
            >{editMode ? '✅ 수정 완료' : '✏️ 수정하기'}</button>
            <button
              className="no-print"
              onClick={() => { setEditMode(false); setCopied(null); setTimeout(() => window.print(), 100); }}
              style={{padding:'7px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'bold', color:'#fff', background:'#1976D2'}}
            >🖨️ 인쇄</button>
            <button className="no-print" onClick={exportFile} title="지금 시간표를 파일로 저장합니다 (다른 선생님께 전달하거나 백업용)"
              style={{padding:'7px 12px', borderRadius:'6px', border:'1px solid #bbb', cursor:'pointer', fontSize:'12px', background:'#fff', color:'#333'}}>💾 파일로 저장</button>
            <label className="no-print" title="파일로 저장해둔 시간표를 불러옵니다"
              style={{padding:'7px 12px', borderRadius:'6px', border:'1px solid #bbb', cursor:'pointer', fontSize:'12px', background:'#fff', color:'#333'}}>
              📂 파일 열기
              <input type="file" accept="application/json,.json" style={{display:'none'}}
                onChange={(ev) => { const f = ev.target.files?.[0]; if (f) importFile(f); ev.target.value = ''; }} />
            </label>
            <button className="no-print" onClick={restoreBackup} title="직전 시간표로 되돌립니다"
              style={{padding:'7px 12px', borderRadius:'6px', border:'1px solid #bbb', cursor:'pointer', fontSize:'12px', background:'#fff', color:'#333'}}>↩️ 되돌리기</button>
            <input
              className="no-print"
              type="text"
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              placeholder="🔍 학생 이름 검색 (예: 김건우)"
              style={{...styles.input, maxWidth:'260px', margin:0}}
            />
            {scheduleSearch && (
              <button className="no-print" onClick={() => setScheduleSearch('')} style={{...styles.tabBtn, padding:'6px 12px', color:'#333', border:'1px solid #ccc'}}>✕ 전체 보기</button>
            )}
            {scheduleWarnings.length === 0
              ? <span className="no-print" style={{fontSize:'12px', color:'#2e7d32', fontWeight:'bold'}}>✅ 이상 없음</span>
              : <span className="no-print" style={{fontSize:'13px', color:'#fff', fontWeight:'bold', background:'#d32f2f', borderRadius:'12px', padding:'3px 12px'}}>⚠️ 경고 {scheduleWarnings.length}건</span>}
            <span className="no-print" style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
              <input
                type="text" value={me}
                onChange={(ev) => { setMe(ev.target.value); localStorage.setItem('happytree_me', ev.target.value); }}
                placeholder="선생님 성함"
                title="누가 저장했는지 다른 선생님께 표시됩니다"
                style={{width:'92px', padding:'5px 8px', fontSize:'12px', border:'1px solid #ccc', borderRadius:'6px'}}
              />
              {sync.status === 'ok' && (
                <span style={{fontSize:'12px', color:'#2e7d32', fontWeight:'bold'}}>
                  ☁️ 함께 보는 시간표
                  <span style={{fontWeight:'normal', color:'#666'}}> · 마지막 저장 {sync.at || '-'} {sync.by && `(${sync.by})`}</span>
                </span>
              )}
              <button onClick={() => forcePull()} title="서버에 저장된 시간표로 이 화면을 맞춥니다"
                style={{padding:'5px 10px', borderRadius:'6px', border:'1px solid #bbb', cursor:'pointer', fontSize:'12px', background:'#fff'}}>🔄 서버 것으로 받기</button>
              {sync.status === 'saving' && <span style={{fontSize:'12px', color:'#1976D2', fontWeight:'bold'}}>⏳ 저장 중…</span>}
              {sync.status === 'loading' && <span style={{fontSize:'12px', color:'#888'}}>☁️ 불러오는 중…</span>}
              {sync.status === 'offline' && (
                <span style={{fontSize:'12px', color:'#fff', background:'#F57F17', borderRadius:'12px', padding:'3px 10px', fontWeight:'bold'}}>
                  ⚠️ 서버 연결 안 됨 — 이 기기에만 저장됨
                  <button onClick={() => pullNow()} style={{marginLeft:'8px', padding:'2px 8px', fontSize:'11px', border:'none', borderRadius:'4px', cursor:'pointer'}}>다시 시도</button>
                </span>
              )}
              {sync.status === 'empty' && (
                <button onClick={() => pushNow(true)} style={{padding:'5px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#2e7d32', color:'#fff'}}>
                  ☁️ 이 시간표를 공용 저장소에 올리기
                </button>
              )}
            </span>
          </div>
          {replacedNotice && (
            <div className="no-print" style={{background:'#E8F5E9', border:'2px solid #2e7d32', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
              <span style={{fontSize:'13px', color:'#1B5E20'}}>
                이 기기에 남아 있던 <b>예전 시간표</b>를 <b>선생님들이 함께 보는 시간표</b>로 맞췄습니다. 예전 것은 백업해뒀습니다.
              </span>
              <button onClick={() => { restoreBackup(); setReplacedNotice(false); }} style={{padding:'6px 14px', borderRadius:'6px', border:'1px solid #2e7d32', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#fff', color:'#1B5E20'}}>↩️ 예전 것 보기</button>
              <button onClick={() => setReplacedNotice(false)} style={{padding:'6px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#2e7d32', color:'#fff'}}>확인</button>
            </div>
          )}
          {sync.status === 'conflict' && (
            <div className="no-print" style={{background:'#FFF3E0', border:'2px solid #F57C00', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
              <span style={{fontSize:'13px', color:'#E65100'}}>
                {serverCopy
                  ? <>서버에 저장된 시간표와 <b>이 기기에 저장해두신 시간표가 다릅니다.</b> 어느 쪽을 쓸지 골라주세요 — 고르기 전까지는 아무것도 바꾸지 않습니다.</>
                  : <><b>{sync.by || '다른 선생님'}</b> 님이 {sync.at} 에 저장했습니다. 지금 화면과 서버 내용이 다릅니다.</>}
                {sync.at && <span style={{color:'#8D6E63'}}> (서버 저장: {sync.at} {sync.by})</span>}
              </span>
              <button onClick={() => { if (serverCopy) { backupNow(); lastAppliedRef.current = JSON.stringify(serverCopy.students); setStudents(serverCopy.students); syncedRef.current = snapshotOf(serverCopy.students); pendingRef.current = false; setServerCopy(null); setSync({ status: 'ok', at: serverCopy.at, by: serverCopy.by }); } else { pullNow(); } }}
                style={{padding:'6px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#F57C00', color:'#fff'}}>서버 것으로 보기</button>
              <button onClick={() => { backupNow(); setServerCopy(null); pushNow(true); }} style={{padding:'6px 14px', borderRadius:'6px', border:'1px solid #F57C00', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#fff', color:'#E65100'}}>내 것을 서버에 올리기</button>
            </div>
          )}
          {seedNotice && (
            <div className="no-print" style={{background:'#E3F2FD', border:'2px solid #1976D2', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
              <span style={{fontSize:'13px', color:'#0D47A1'}}>
                <b>새로 만든 시간표가 올라와 있습니다.</b> 지금 화면은 <b>저장하신 시간표 그대로</b>입니다 — 바꿀지 말지 직접 고르세요.
              </span>
              <button onClick={loadSeed} style={{padding:'6px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#1976D2', color:'#fff'}}>새 시간표로 바꾸기</button>
              <button onClick={keepMine} style={{padding:'6px 14px', borderRadius:'6px', border:'1px solid #1976D2', cursor:'pointer', fontSize:'12px', fontWeight:'bold', background:'#fff', color:'#1976D2'}}>내 시간표 유지</button>
            </div>
          )}
          {scheduleWarnings.length > 0 && (
            <div className="no-print" style={{background:'#FFEBEE', border:'2px solid #d32f2f', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px', maxHeight:'170px', overflowY:'auto'}}>
              <div style={{fontWeight:'bold', color:'#d32f2f', marginBottom:'6px'}}>⚠️ 시간표 경고 {scheduleWarnings.length}건 — 확인해 주세요</div>
              {scheduleWarnings.map((w, i) => (
                <div key={i} style={{fontSize:'12px', color:'#b71c1c', lineHeight:1.6}}>• {w}</div>
              ))}
            </div>
          )}
          {editMode && (
          <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', margin:'0 0 8px'}}>
            <button
              onClick={undo}
              disabled={history.length === 0}
              style={{padding:'5px 12px', borderRadius:'4px', border:'1px solid #1976D2', cursor: history.length ? 'pointer' : 'not-allowed', fontSize:'12px', fontWeight:'bold', background: history.length ? '#1976D2' : '#ccc', color:'#fff'}}
            >↩️ 되돌리기{history.length ? ` (${history.length})` : ''}</button>
            <span style={{fontSize:'12px', color:'#888'}}>
              💡 과목을 <b>드래그</b>해서 옮기기 · 과목 <b>클릭</b>해 복사 후 원하는 칸 <b>클릭</b>해 붙여넣기 · 과목의 <b style={{color:'#d32f2f'}}>×</b> 눌러 삭제
            </span>
          </div>
          )}
          {editMode && copied && (
            <div style={{background:'#E3F2FD', border:'1px solid #1976D2', borderRadius:'6px', padding:'8px 12px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px'}}>
              📋 <b>{copied.subject}({copied.teacherName})</b> 복사됨 — 붙여넣을 칸을 클릭하세요 <span style={{color:'#888'}}>(다른 과목을 클릭하면 그걸로 바뀜)</span>
              <button onClick={() => setCopied(null)} style={{padding:'4px 12px', marginLeft:'auto', background:'#1976D2', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'12px', fontWeight:'bold'}}>취소</button>
            </div>
          )}
          {students.length > 0 ? (
            <div style={styles.scheduleContainer}>
              {students.filter(s => !scheduleSearch.trim() || s.name.includes(scheduleSearch.trim())).map(student => {
                const studentSchedule = schedule.filter(e => e.studentName === student.name);
                // 실제 수업 시간을 반드시 포함시킨다 — 부별 기본 시간대 밖의 수업(예: 중등생의 4시 국어)이
                // 선생님별 표에는 보이는데 학생 카드에서만 빠지던 문제
                const base = (student.division === '초등부' || student.division === '유치부')
                  ? [14, 18] : student.division === '중등부' ? [17, 21] : [18, 21];
                const actual = studentSchedule.map(e => e.hour);
                const startHour = Math.min(base[0], ...(actual.length ? actual : [base[0]]));
                const endHour = Math.max(base[1], ...(actual.length ? actual.map(h => h + 1) : [base[1]]));

                return (
                  <div key={student.id} className="print-student" style={styles.studentScheduleSection}>
                    <div style={styles.scheduleHeader}>
                      <h4>{student.name}</h4>
                      <span style={styles.gradeBadge}>{student.division} {student.grade}학년</span>
                      {editMode ? (
                        <input
                          type="text"
                          value={student.vocab || ''}
                          onChange={(ev) => updateVocab(student.id, ev.target.value)}
                          placeholder="📖 단어 진도 입력 (예: Day 15)"
                          style={{flex:1, minWidth:'120px', padding:'3px 8px', fontSize:'12px', border:'1px solid #F9A825', borderRadius:'4px'}}
                        />
                      ) : (
                        student.vocab ? (
                          <span style={{fontSize:'12px', fontWeight:'bold', color:'#F57F17', background:'#FFFDE7', border:'1px solid #F9A825', borderRadius:'4px', padding:'2px 8px'}}>📖 {student.vocab}</span>
                        ) : null
                      )}
                    </div>
                    <table style={{...styles.scheduleTable, fontSize: '12px', width: '100%'}}>
                      <thead>
                        <tr>
                          <th style={{...styles.th, padding: '4px', fontSize: '11px'}}>시간</th>
                          {DAYS.map(day => <th key={day} style={{...styles.th, padding: '4px', fontSize: '11px'}}>{day}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({length: endHour - startHour}, (_, i) => startHour + i).map(hour => (
                          <tr key={hour}>
                            <td style={{...styles.timeCell, padding: '4px', fontSize: '11px'}}>{hour}:00</td>
                            {DAYS.map(day => {
                              const entries = studentSchedule.filter(e => e.day === day && e.hour === hour);
                              return (
                                <td key={day}
                                  onDragOver={(ev) => { if (editMode) ev.preventDefault(); }}
                                  onDrop={() => {
                                    if (!editMode) return;
                                    const d = dragRef.current;
                                    if (d && d.studentId === student.id) {
                                      moveClass(d.studentId, d.subject, d.day, d.hour, day, hour);
                                    }
                                    dragRef.current = null;
                                  }}
                                  onClick={() => { if (editMode && copied) pasteClass(student.id, copied.subject, copied.teacherId, day, hour); }}
                                  style={{...styles.scheduleCell, padding: '4px', fontSize: '10px', cursor: (editMode && copied) ? 'copy' : undefined, minWidth: '36px', height: '24px'}}>
                                  {entries.map((e, idx) => {
                                    const color = TEACHER_COLORS[e.teacherName] || { bg: '#F5F5F5', border: '#999', text: '#333' };
                                    const isCopied = !!copied && copied.studentId === student.id && copied.subject === e.subject && copied.day === day && copied.hour === hour;
                                    return (
                                      <div key={idx}
                                        draggable={editMode}
                                        onDragStart={() => { if (editMode) dragRef.current = {studentId: student.id, subject: e.subject, day, hour}; }}
                                        onDragEnd={() => { dragRef.current = null; }}
                                        onClick={(ev) => { if (!editMode) return; ev.stopPropagation(); setCopied({studentId: student.id, subject: e.subject, teacherId: findTeacherId(student, e.subject, day, hour), teacherName: e.teacherName, day, hour}); }}
                                        title={editMode ? '드래그=이동 · 클릭=복사 · ×=삭제' : undefined}
                                        style={{
                                        backgroundColor: color.bg,
                                        borderLeft: `2px solid ${color.border}`,
                                        padding: '2px',
                                        marginBottom: '1px',
                                        borderRadius: '2px',
                                        fontSize: '10px',
                                        cursor: editMode ? 'grab' : 'default',
                                        outline: isCopied ? '2px solid #1976D2' : 'none',
                                      }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2px'}}>
                                          <span style={{fontWeight: 'bold', color: color.text}}>
                                            {e.subject.length > 6 ? e.subject.slice(0, 4) : e.subject}({e.teacherName[0]})
                                          </span>
                                          {editMode && (
                                          <span
                                            onClick={(ev) => { ev.stopPropagation(); deleteClass(student.id, e.subject, day, hour); }}
                                            title="삭제"
                                            style={{cursor: 'pointer', color: '#d32f2f', fontWeight: 'bold', fontSize: '12px', lineHeight: 1, padding: '0 2px'}}
                                          >×</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={styles.emptyMessage}>학생을 추가해주세요</p>
          )}
        </div>
      </div>
    );
  }

  // 학생관리 페이지
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{...styles.logo, width: '40px', height: '40px', fontSize: '20px', margin: 0}}>H</div>
          <h1 style={styles.headerTitle}>해피트리학원 스케줄</h1>
        </div>
        <div style={styles.headerButtons}>
          <button onClick={() => setCurrentView('dashboard')} style={{...styles.tabBtn}}>
            📊 메인
          </button>
          <button onClick={() => setCurrentView('teachers')} style={{...styles.tabBtn}}>
            👩‍🏫 선생님별
          </button>
          <button onClick={() => setCurrentView('students')} style={{...styles.tabBtn, ...styles.tabBtnActive}}>
            📋 학생관리
          </button>
        </div>
      </header>

      <div style={styles.mainContent}>
        {/* 좌측: 학생 관리 */}
        <div style={styles.leftPanel}>
          <h2 style={styles.panelTitle}>📋 학생 관리</h2>
          <div style={styles.addSection}>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="학생 이름"
              style={styles.input}
              onKeyPress={(e) => e.key === 'Enter' && addStudent()}
            />
            <select value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)} style={{...styles.input, borderColor: copyFromId ? '#1976D2' : undefined}}>
              <option value="">📋 시간표 복사 안 함 (빈 시간표)</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>📋 {s.name} ({s.division} {s.grade}학년) 시간표 복사</option>
              ))}
            </select>
            <select value={selectedDivision} disabled={!!copyFromId} onChange={(e) => {
              const division = e.target.value as Division;
              setSelectedDivision(division);
              setSelectedGrade(getGradesForDivision(division)[0]);
            }} style={{...styles.input, opacity: copyFromId ? 0.5 : 1}}>
              <option value="유치부">유치부</option>
              <option value="초등부">초등부</option>
              <option value="중등부">중등부</option>
              <option value="고등부">고등부</option>
            </select>
            <select value={selectedGrade} disabled={!!copyFromId} onChange={(e) => setSelectedGrade(Number(e.target.value))} style={{...styles.input, opacity: copyFromId ? 0.5 : 1}}>
              {getGradesForDivision(selectedDivision).map(g => (
                <option key={g} value={g}>{selectedDivision === '유치부' ? '유치부' : g + '학년'}</option>
              ))}
            </select>
            {copyFromId && <p style={{fontSize:'11px', color:'#1976D2', margin:'-4px 0 4px'}}>복사 선택 시 학년·부는 원본을 따라갑니다</p>}
            <button onClick={addStudent} style={styles.addBtn}>{copyFromId ? '📋 복사해서 추가' : '➕ 추가'}</button>
          </div>

          <div style={styles.studentListSection}>
            <h3 style={styles.sectionTitle}>전체 학생 ({students.length}명)</h3>
            <div style={styles.studentList}>
              {students.length === 0 ? (
                <p style={styles.emptyText}>등록된 학생이 없습니다</p>
              ) : (
                students.map(s => (
                  <div key={s.id} style={styles.studentListItem}>
                    <div
                      onClick={() => setEditingStudent(s)}
                      style={{
                        ...styles.studentItemName,
                        ...(editingStudent?.id === s.id ? styles.studentItemNameActive : {}),
                      }}
                    >
                      {s.name} <span style={styles.gradeBadgeSmall}>{s.division} {s.grade}학년</span>
                    </div>
                    <button
                      onClick={() => duplicateStudent(s)}
                      style={{...styles.deleteBtnSmall, marginRight:'4px'}}
                      title="이 학생 시간표 복제"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => deleteStudent(s.id)}
                      style={styles.deleteBtnSmall}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 중앙: 선생님 선택 */}
        <div style={styles.middlePanel}>
          <h2 style={styles.panelTitle}>👨‍🏫 선생님 선택</h2>
          {editingStudent ? (
            <>
              <div style={styles.studentInfo}>
                <h3>{editingStudent.name}</h3>
                <p>{editingStudent.division} {editingStudent.grade}학년</p>
              </div>

              <div style={styles.subjectsContainer}>
                {getSubjectsForDivision(editingStudent.division).map(subject => {
                  const teachers = TEACHERS.filter(t => t.subject === subject);
                  const selected = editingStudent.selectedTeachers[subject] || [];
                  const isConfiguring = selectedSubject === subject;

                  return (
                    <div key={subject} style={styles.subjectSection}>
                      <h4 style={styles.subjectTitle}>{subject}</h4>

                      {selected.length > 0 && (
                        <div style={styles.selectedTeachersList}>
                          {selected.map((sel, idx) => {
                            const displayText = subject === '숙제반'
                              ? `${sel.day} ${sel.hour}:00`
                              : `${TEACHERS.find(t => t.id === sel.teacherId)?.name} - ${sel.day} ${sel.hour}:00`;
                            return (
                              <div key={idx} style={styles.selectedTeacherItem}>
                                <span>{displayText}</span>
                                <button
                                  onClick={() => removeTeacher(subject, idx)}
                                  style={styles.removeBtn}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isConfiguring && (
                        <div style={styles.teacherButtonsGroup}>
                          {subject === '숙제반' ? (
                            <button
                              onClick={() => {
                                setSelectedSubject(subject);
                                setConfigTeacherId('homework');
                                setConfigDays([]);
                                setConfigHour(14);
                              }}
                              style={styles.teacherBtn}
                            >
                              📅 요일/시간 선택
                            </button>
                          ) : (
                            teachers.map(teacher => (
                              <button
                                key={teacher.id}
                                onClick={() => addTeacherToSubject(subject, teacher.id)}
                                style={styles.teacherBtn}
                              >
                                + {teacher.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {isConfiguring && (
                        <div style={styles.configSection}>
                          <div style={styles.configGroup}>
                            <label style={styles.configLabel}>요일 선택 (다중선택 가능):</label>
                            <div style={styles.daysGrid}>
                              {DAYS.map(day => (
                                <button
                                  key={day}
                                  onClick={() => toggleDay(day)}
                                  style={{
                                    ...styles.dayBtn,
                                    ...(configDays.includes(day) ? styles.dayBtnActive : {}),
                                  }}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={styles.configGroup}>
                            <label style={styles.configLabel}>시간 선택:</label>
                            <select
                              value={configHour}
                              onChange={(e) => setConfigHour(Number(e.target.value))}
                              style={styles.hourSelect}
                            >
                              {getHoursForDivision(editingStudent.division, subject).map(h => (
                                <option key={h} value={h}>
                                  {h}:00
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={styles.configButtons}>
                            <button onClick={saveTeacherConfig} style={styles.saveBtn}>
                              이 시간에 추가 ➕
                            </button>
                            <button onClick={() => setSelectedSubject(null)} style={styles.cancelBtn}>
                              취소
                            </button>
                          </div>
                          <p style={styles.configHint}>💡 같은 선생님을 여러 시간에 추가할 수 있습니다</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={generateAllSchedules} style={styles.generateBtn}>
                📅 전체 시간표 생성
              </button>
            </>
          ) : (
            <div style={styles.emptyState}>
              <p>좌측에서 학생을 선택해주세요</p>
            </div>
          )}
        </div>

        {/* 우측: 시간표 미리보기 */}
        <div style={styles.rightPanel}>
          <h2 style={styles.panelTitle}>📊 시간표 미리보기</h2>
          {students.length > 0 ? (
            <div style={styles.scheduleContainer}>
              {students.map(student => {
                const studentSchedule = schedule.filter(e => e.studentName === student.name);
                // 실제 수업 시간을 반드시 포함시킨다 — 부별 기본 시간대 밖의 수업(예: 중등생의 4시 국어)이
                // 선생님별 표에는 보이는데 학생 카드에서만 빠지던 문제
                const base = (student.division === '초등부' || student.division === '유치부')
                  ? [14, 18] : student.division === '중등부' ? [17, 21] : [18, 21];
                const actual = studentSchedule.map(e => e.hour);
                const startHour = Math.min(base[0], ...(actual.length ? actual : [base[0]]));
                const endHour = Math.max(base[1], ...(actual.length ? actual.map(h => h + 1) : [base[1]]));

                return (
                  <div key={student.id} style={styles.previewSection}>
                    <h4 style={styles.previewTitle}>{student.name} ({student.division} {student.grade}학년)</h4>
                    <table style={styles.previewTable}>
                      <thead>
                        <tr>
                          <th style={styles.previewTh}>시간</th>
                          {DAYS.map(day => <th key={day} style={styles.previewTh}>{day}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({length: endHour - startHour}, (_, i) => startHour + i).map(hour => (
                          <tr key={hour}>
                            <td style={styles.previewTimeCell}>{hour}:00</td>
                            {DAYS.map(day => {
                              const entries = studentSchedule.filter(e => e.day === day && e.hour === hour);
                              return (
                                <td key={day} style={styles.previewCell}>
                                  {entries.map((e, idx) => {
                                    const color = TEACHER_COLORS[e.teacherName] || { bg: '#F5F5F5', border: '#999', text: '#333' };
                                    return (
                                      <div key={idx} style={{
                                        backgroundColor: color.bg,
                                        borderLeft: `2px solid ${color.border}`,
                                        padding: '2px',
                                        fontSize: '9px',
                                      }}>
                                        <div style={{fontWeight: 'bold', color: color.text}}>{e.subject}</div>
                                      </div>
                                    );
                                  })}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={styles.emptyMessage}>학생을 추가해주세요</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '400px',
  },
  logo: {
    width: '60px',
    height: '60px',
    backgroundColor: '#001F4D',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    border: '3px solid #D4AF37',
    margin: '0 auto 10px',
  } as any,
  loginIcon: { fontSize: '48px', marginBottom: '10px' } as any,
  loginTitle: { fontSize: '24px', marginBottom: '30px', color: '#333' } as any,
  loginSubtitle: { fontSize: '14px', color: '#666', marginBottom: '20px' } as any,
  loginInput: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  loginButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    fontFamily: 'system-ui',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '15px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
  },
  headerButtons: {
    display: 'flex',
    gap: '10px',
  },
  tabBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  dashboardContent: {
    flex: 1,
    padding: '0 20px 20px',
    overflow: 'auto',
  },
  scheduleContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  studentScheduleSection: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  scheduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  gradeBadge: {
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  scheduleTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  th: {
    padding: '8px',
    border: '1px solid #ddd',
    backgroundColor: '#e8eaed',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timeCell: {
    padding: '8px',
    border: '1px solid #ddd',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    width: '50px',
  },
  scheduleCell: {
    padding: '4px',
    border: '1px solid #ddd',
    textAlign: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#999',
    fontSize: '16px',
    marginTop: '40px',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    gap: '10px',
    padding: '10px',
    overflow: 'hidden',
  },
  leftPanel: {
    width: '250px',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'auto',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '15px',
  },
  middlePanel: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'auto',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '15px',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'auto',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '15px',
  },
  panelTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addSection: {
    marginBottom: '15px',
  },
  input: {
    width: '100%',
    padding: '8px',
    marginBottom: '6px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    boxSizing: 'border-box',
  },
  addBtn: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  studentListSection: {
    marginTop: '15px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#555',
  },
  studentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  studentListItem: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
  },
  studentItemName: {
    flex: 1,
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
    fontSize: '12px',
    fontWeight: '500',
  },
  studentItemNameActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
    color: '#2e7d32',
  },
  gradeBadgeSmall: {
    fontSize: '11px',
    backgroundColor: '#e0e0e0',
    padding: '2px 5px',
    borderRadius: '3px',
    marginLeft: '5px',
  },
  deleteBtnSmall: {
    padding: '5px 8px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: '10px 0',
    margin: 0,
    fontSize: '12px',
  },
  studentInfo: {
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    marginBottom: '15px',
    borderLeft: '4px solid #2196F3',
  },
  subjectsContainer: {
    marginBottom: '15px',
  },
  subjectSection: {
    marginBottom: '12px',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  subjectTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#333',
  },
  selectedTeachersList: {
    marginBottom: '8px',
  },
  selectedTeacherItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px',
    backgroundColor: '#e8f5e9',
    borderRadius: '3px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  removeBtn: {
    padding: '3px 6px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '10px',
  },
  teacherButtonsGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  },
  teacherBtn: {
    padding: '6px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  configSection: {
    padding: '8px',
    backgroundColor: '#fff9e6',
    borderRadius: '3px',
    marginTop: '8px',
  },
  configGroup: {
    marginBottom: '8px',
  },
  configLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '4px',
  },
  dayBtn: {
    padding: '4px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '11px',
  },
  dayBtnActive: {
    backgroundColor: '#4CAF50',
    color: 'white',
    borderColor: '#4CAF50',
  },
  hourSelect: {
    width: '100%',
    padding: '6px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    fontSize: '12px',
  },
  configButtons: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
  },
  saveBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  cancelBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#999',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  configHint: {
    fontSize: '10px',
    color: '#666',
    marginTop: '6px',
    marginBottom: 0,
  },
  generateBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#999',
    fontSize: '14px',
  },
  previewSection: {
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  },
  previewTitle: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#333',
  },
  previewTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '9px',
  },
  previewTh: {
    padding: '4px',
    border: '1px solid #ddd',
    backgroundColor: '#e8eaed',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '10px',
  },
  previewTimeCell: {
    padding: '4px',
    border: '1px solid #ddd',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: '9px',
    width: '40px',
  },
  previewCell: {
    padding: '2px',
    border: '1px solid #ddd',
    fontSize: '9px',
  },
};

export default App;
