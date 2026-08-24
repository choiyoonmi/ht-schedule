import { useState, useEffect, useRef, useMemo } from 'react';
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
  { id: 'elem_math_2', name: '조교', subject: '초등수학' },
  { id: 'mid_math_1', name: '문소현', subject: '중등수학' },
  { id: 'mid_math_2', name: '조교', subject: '중등수학' },
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
  '조교': { bg: '#F5F5F5', border: '#757575', text: '#424242' },
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
  const className = (student: Student, subject: string, grade: number) => {
    const division = student.division === '유치부' ? '유치부' : `${student.division[0]}${grade}`;
    const shortSubject = subject.replace('초등', '').replace('중등', '').replace('고등', '');
    return `${division} ${shortSubject}반`;
  };
  // 1) 교사가 같은 시간에 서로 다른 반을 맡음
  const slot: Record<string, Set<string>> = {};
  for (const st of students) {
    for (const subj in st.selectedTeachers) {
      for (const e of st.selectedTeachers[subj]) {
        const tid = e.teacherId;
        if (!tid || tid === 'elem_eng_5') continue; // 숙제·클리닉 제외
        const g = (st.name === '홍리아' && subj === '초등영어') ? 5 : st.grade; // 합반 보정
        const key = `${e.day}|${e.hour}|${tid}`;
        (slot[key] = slot[key] || new Set()).add(className(st, subj, g));
      }
    }
  }
  for (const key in slot) {
    if (slot[key].size > 1) {
      const [day, hour, tid] = key.split('|');
      const classes = Array.from(slot[key]);
      warnings.push(`👨‍🏫 교사 중복: ${teacherName(tid)} — ${day}요일 ${hour}:00 — ${classes.join(' ↔ ')}`);
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

// 기존 브라우저에 저장된 초5 수요일 2·3시 과목만 안전하게 교환한다.
// 다른 학년과 사용자가 직접 수정한 시간표는 그대로 보존한다.
function migrateScheduleCorrections(students: Student[]): Student[] {
  return students.map(student => {
    if (student.division !== '초등부') return student;

    if (student.name === '배소이' || student.name === '이준희') {
      return {
        ...student,
        selectedTeachers: {
          ...student.selectedTeachers,
          초등수학: (student.selectedTeachers['초등수학'] || []).map(selection =>
            selection.teacherId === 'elem_math_1' && selection.day === '수' && selection.hour === 15
              ? { ...selection, day: '화', hour: 16 }
              : selection
          ),
        },
      };
    }

    if (student.grade === 4) {
      return {
        ...student,
        selectedTeachers: {
          ...student.selectedTeachers,
          국어: (student.selectedTeachers['국어'] || []).map(selection =>
            selection.day === '수' && selection.hour === 14 ? { ...selection, day: '목' } : selection
          ),
        },
      };
    }

    if (student.grade !== 5) return student;
    return {
      ...student,
      selectedTeachers: {
        ...student.selectedTeachers,
        초등수학: (student.selectedTeachers['초등수학'] || []).map(selection =>
          selection.day === '수' && selection.hour === 14 ? { ...selection, hour: 15 } : selection
        ),
        국어: (student.selectedTeachers['국어'] || []).map(selection =>
          selection.day === '수' && selection.hour === 15 ? { ...selection, hour: 14 } : selection
        ),
      },
    };
  });
}

// 시드 명단 버전. 이 값을 바꿔서 배포하면 모든 브라우저가 새 명단으로 자동 갱신됨.
const SEED_VERSION = '2026-08-2학기-블록v5';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'teachers' | 'students'>('dashboard');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const savedVer = localStorage.getItem('happytree_seed_version');
      const saved = localStorage.getItem('happytree_students');
      const parsed = saved ? JSON.parse(saved) : null;
      // 시드 버전이 최신이고 저장된 학생이 있을 때만 저장본 사용, 아니면 최신 시드로 갱신
      if (savedVer === SEED_VERSION && parsed && parsed.length) return migrateScheduleCorrections(parsed);
      return SEED_STUDENTS as unknown as Student[];
    } catch {
      return SEED_STUDENTS as unknown as Student[];
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
  const [history, setHistory] = useState<Student[][]>([]); // 되돌리기용 편집 이력
  const [editMode, setEditMode] = useState<boolean>(false); // 편집 모드(수정하기 버튼으로 켜야 편집 가능)

  useEffect(() => {
    localStorage.setItem('happytree_seed_version', SEED_VERSION);
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
  const teacherWarnings = scheduleWarnings.filter(warning => warning.startsWith('👨‍🏫'));

  const teacherNames = useMemo(
    () => Array.from(new Set(TEACHERS.map(teacher => teacher.name))),
    [],
  );

  const teacherSchedule = useMemo(() => {
    const studentByName = new Map(students.map(student => [student.name, student]));
    const overview: Record<string, Record<string, Record<string, ScheduleEntry[]>>> = {};

    for (const day of DAYS) {
      overview[day] = {};
      for (let hour = 14; hour <= 20; hour++) {
        overview[day][hour] = {};
        for (const teacherName of teacherNames) overview[day][hour][teacherName] = [];
      }
    }

    for (const entry of schedule) {
      if (!overview[entry.day]?.[entry.hour]?.[entry.teacherName]) continue;
      overview[entry.day][entry.hour][entry.teacherName].push(entry);
    }

    const summarize = (entries: ScheduleEntry[]) => {
      const bySubject = new Map<string, ScheduleEntry[]>();
      for (const entry of entries) {
        const current = bySubject.get(entry.subject) || [];
        if (!current.some(item => item.studentName === entry.studentName)) current.push(entry);
        bySubject.set(entry.subject, current);
      }

      return Array.from(bySubject.entries()).map(([subject, subjectEntries]) => {
        const learners = subjectEntries.map(entry => studentByName.get(entry.studentName)).filter(Boolean) as Student[];
        const grades = Array.from(new Set(learners.map(student =>
          student.division === '유치부' ? '유치부' : `${student.division.replace('부', '')}${student.grade}`
        )));
        return {
          subject,
          grades: grades.join('·'),
          names: subjectEntries.map(entry => entry.studentName),
          notes: subject === '초등영어' && subjectEntries.some(entry => entry.studentName === '김주원(5)')
            ? [subjectEntries[0]?.day === '목' ? '김주원: 초5반 합반 가능' : '김주원: 초등4 1반']
            : [],
        };
      });
    };

    return { overview, summarize };
  }, [schedule, students, teacherNames]);

  if (currentView === 'teachers') {
    return (
      <div className="app-root" style={styles.app}>
        <header className="no-print" style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{...styles.logo, width: '40px', height: '40px', fontSize: '20px', margin: 0}}>H</div>
            <h1 style={styles.headerTitle}>해피트리학원 스케줄</h1>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => setCurrentView('dashboard')} style={{...styles.tabBtn}}>📊 메인</button>
            <button onClick={() => setCurrentView('teachers')} style={{...styles.tabBtn, ...styles.tabBtnActive}}>👩‍🏫 선생님별 시간표</button>
            <button onClick={() => setCurrentView('students')} style={{...styles.tabBtn}}>📋 학생관리</button>
          </div>
        </header>

        <div className="dashboard-scroll" style={styles.dashboardContent}>
          <div className="sticky-bar" style={{position:'sticky', top:0, zIndex:30, background:'#f5f5f5', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap', margin:'0 -20px 12px', padding:'14px 20px', borderBottom:'1px solid #ddd', boxShadow:'0 2px 6px rgba(0,0,0,0.08)'}}>
            <h2 style={{margin:0}}>👩‍🏫 학원 전체 선생님 시간표</h2>
            <span className="no-print" style={{fontSize:'12px', color:'#666'}}>학생 시간표를 기준으로 자동 집계됩니다.</span>
            {teacherWarnings.length > 0 && <span className="no-print" style={{fontSize:'13px', color:'#fff', fontWeight:'bold', background:'#d32f2f', borderRadius:'12px', padding:'3px 12px'}}>⚠️ 교사 중복 {teacherWarnings.length}건</span>}
            <button className="no-print" onClick={() => window.print()} style={{marginLeft:'auto', padding:'7px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'bold', color:'#fff', background:'#1976D2'}}>🖨️ 인쇄</button>
          </div>

          {teacherWarnings.length > 0 && (
            <div className="no-print teacher-warning-panel">
              <div className="teacher-warning-title">⚠️ 선생님 수업 중복 — 시간과 반을 확인해 주세요</div>
              {teacherWarnings.map((warning, index) => <div key={index} className="teacher-warning-item">• {warning}</div>)}
            </div>
          )}

          <div className="teacher-overview-wrap">
            <table className="teacher-overview-table">
              <thead>
                <tr>
                  <th className="teacher-overview-slot" rowSpan={2}>시간</th>
                  {DAYS.map(day => <th key={day} className="teacher-day-heading" colSpan={teacherNames.length}>{day}요일</th>)}
                </tr>
                <tr>
                  {DAYS.flatMap(day => teacherNames.map(name => {
                    const color = TEACHER_COLORS[name] || { bg: '#F5F5F5', border: '#999', text: '#333' };
                    return <th key={`${day}-${name}`} className="teacher-name-heading" style={{background: color.bg, color: color.text, borderTop: `4px solid ${color.border}`}}>{name}</th>;
                  }))}
                </tr>
              </thead>
              <tbody>
                {Array.from({length: 7}, (_, index) => 14 + index).map(hour => (
                  <tr key={hour}>
                    <th className="teacher-overview-slot">
                      <span>{hour}:00</span>
                    </th>
                    {DAYS.flatMap(day => teacherNames.map(name => {
                      const summaries = teacherSchedule.summarize(teacherSchedule.overview[day][hour][name]);
                      return (
                        <td key={`${day}-${name}`} className="teacher-sheet-cell">
                          {summaries.map(summary => {
                            const color = TEACHER_COLORS[name] || { bg: '#F5F5F5', border: '#999', text: '#333' };
                            return (
                              <div key={summary.subject} className="teacher-class-card" style={{background: color.bg, borderLeftColor: color.border}}>
                                <div className="teacher-class-title" style={{color: color.text}}>{summary.subject}</div>
                                <div className="teacher-class-meta">{summary.grades || '학년 미지정'} · {summary.names.length}명</div>
                                {summary.notes.map(note => <div key={note} className="teacher-class-note">{note}</div>)}
                                <div className="teacher-class-names">{summary.names.join(' · ')}</div>
                              </div>
                            );
                          })}
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
              👩‍🏫 선생님별 시간표
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
          </div>
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
                const startHour = (student.division === '초등부' || student.division === '유치부') ? 14 : student.division === '중등부' ? 17 : 18;
                const endHour = (student.division === '초등부' || student.division === '유치부') ? 18 : 21;

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
            👩‍🏫 선생님별 시간표
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
                const startHour = (student.division === '초등부' || student.division === '유치부') ? 14 : student.division === '중등부' ? 17 : 18;
                const endHour = (student.division === '초등부' || student.division === '유치부') ? 18 : 21;

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

