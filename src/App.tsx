import { useState, useEffect } from 'react';
import './App.css';

type Division = '초등부' | '중등부' | '고등부';
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
  '숙제반': { bg: '#FFFDE7', border: '#F9A825', text: '#F57F17' },
};

const ADMIN_PASSWORD = '75356';

function getSubjectsForDivision(division: Division): string[] {
  if (division === '초등부') return ['국어', '초등수학', '초등영어', '숙제반'];
  if (division === '중등부') return ['국어', '중등수학', '중등영어', '숙제반'];
  return ['고등영어', '숙제반'];
}

function getHoursForDivision(division: Division, subject?: string): number[] {
  if (subject === '숙제반') return [14, 15, 16, 17];
  if (division === '초등부') return [14, 15, 16, 17];
  if (division === '중등부') return [17, 18, 19, 20];
  return [18, 19, 20];
}

function getGradesForDivision(division: Division): number[] {
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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('happytree_login');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [adminInput, setAdminInput] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'students'>('dashboard');

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('happytree_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [configTeacherId, setConfigTeacherId] = useState<string | null>(null);
  const [configDays, setConfigDays] = useState<DayOfWeek[]>([]);
  const [configHour, setConfigHour] = useState<number>(14);

  useEffect(() => {
    localStorage.setItem('happytree_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('happytree_schedule', JSON.stringify(schedule));
  }, [schedule]);

  const handleLogin = () => {
    if (adminInput === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem('happytree_login', JSON.stringify(true));
      setAdminInput('');
    } else {
      alert('관리자 번호가 틀렸습니다.');
      setAdminInput('');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('happytree_login', JSON.stringify(false));
    setCurrentView('dashboard');
  };

  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: `student_${Date.now()}`,
      name: newStudentName,
      division: selectedDivision,
      grade: selectedGrade,
      selectedTeachers: {},
    };
    setStudents([...students, newStudent]);
    setNewStudentName('');
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

  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <div style={styles.logo}>H</div>
          <h2 style={styles.loginTitle}>해피트리학원</h2>
          <p style={styles.loginSubtitle}>관리자 번호를 입력해주세요</p>
          <input
            type="password"
            value={adminInput}
            onChange={(e) => setAdminInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="관리자 번호"
            style={styles.loginInput}
          />
          <button onClick={handleLogin} style={styles.loginButton}>
            로그인
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'dashboard') {
    return (
      <div style={styles.app}>
        <header style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{...styles.logo, width: '40px', height: '40px', fontSize: '20px', margin: 0}}>H</div>
            <h1 style={styles.headerTitle}>해피트리학원 스케줄</h1>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => setCurrentView('dashboard')} style={{...styles.tabBtn, ...styles.tabBtnActive}}>
              📊 메인
            </button>
            <button onClick={() => setCurrentView('students')} style={{...styles.tabBtn}}>
              📋 학생관리
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              🚪 로그아웃
            </button>
          </div>
        </header>

        <div style={styles.dashboardContent}>
          <h2>📊 전체 시간표</h2>
          {students.length > 0 ? (
            <div style={styles.scheduleContainer}>
              {students.map(student => {
                const studentSchedule = schedule.filter(e => e.studentName === student.name);
                const startHour = student.division === '초등부' ? 14 : student.division === '중등부' ? 17 : 18;
                const endHour = student.division === '초등부' ? 18 : 21;

                return (
                  <div key={student.id} style={styles.studentScheduleSection}>
                    <div style={styles.scheduleHeader}>
                      <h4>{student.name}</h4>
                      <span style={styles.gradeBadge}>{student.division} {student.grade}학년</span>
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
                                <td key={day} style={{...styles.scheduleCell, padding: '4px', fontSize: '10px'}}>
                                  {entries.map((e, idx) => {
                                    const color = TEACHER_COLORS[e.teacherName] || { bg: '#F5F5F5', border: '#999', text: '#333' };
                                    return (
                                      <div key={idx} style={{
                                        backgroundColor: color.bg,
                                        borderLeft: `2px solid ${color.border}`,
                                        padding: '2px',
                                        marginBottom: '1px',
                                        borderRadius: '2px',
                                        fontSize: '10px',
                                      }}>
                                        <div style={{fontWeight: 'bold', color: color.text}}>
                                          {e.subject.length > 6 ? e.subject.slice(0, 4) : e.subject}({e.teacherName[0]})
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
          <button onClick={() => setCurrentView('students')} style={{...styles.tabBtn, ...styles.tabBtnActive}}>
            📋 학생관리
          </button>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪 로그아웃
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
            <select value={selectedDivision} onChange={(e) => {
              const division = e.target.value as Division;
              setSelectedDivision(division);
              setSelectedGrade(getGradesForDivision(division)[0]);
            }} style={styles.input}>
              <option value="초등부">초등부</option>
              <option value="중등부">중등부</option>
              <option value="고등부">고등부</option>
            </select>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(Number(e.target.value))} style={styles.input}>
              {getGradesForDivision(selectedDivision).map(g => (
                <option key={g} value={g}>{g}학년</option>
              ))}
            </select>
            <button onClick={addStudent} style={styles.addBtn}>➕ 추가</button>
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
                const startHour = student.division === '초등부' ? 14 : student.division === '중등부' ? 17 : 18;
                const endHour = student.division === '초등부' ? 18 : 21;

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
    padding: '20px',
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
