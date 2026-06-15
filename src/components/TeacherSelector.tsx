import { Student, Teacher, Subject } from '../types';

interface TeacherSelectorProps {
  student: Student | null;
  teachers: Teacher[];
  onSelectTeacher: (subject: Subject, teacherId: string) => void;
  onGenerateSchedule: () => void;
}

export function TeacherSelector({
  student,
  teachers,
  onSelectTeacher,
  onGenerateSchedule,
}: TeacherSelectorProps) {
  if (!student) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          좌측에서 학생을 선택해주세요.
        </div>
      </div>
    );
  }

  const subjects: Subject[] = student.grade === '고등부' ? ['영어'] : ['국어', '영어', '수학'];

  const subjectTeachers = (subject: Subject) => {
    return teachers.filter((t) => t.subject === subject);
  };

  const allTeachersSelected = subjects.every(
    (subject) => student.selectedTeachers[subject]
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{student.name} - 선생님 선택</h2>
      <p style={styles.subtitle}>{student.grade}</p>

      <div style={styles.selectionsContainer}>
        {subjects.map((subject) => (
          <div key={subject} style={styles.subjectSection}>
            <h3 style={styles.subjectTitle}>{subject}</h3>
            <div style={styles.teacherList}>
              {subjectTeachers(subject).map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => onSelectTeacher(subject, teacher.id)}
                  style={{
                    ...styles.teacherButton,
                    ...(student.selectedTeachers[subject] === teacher.id
                      ? styles.teacherButtonSelected
                      : {}),
                  }}
                >
                  {teacher.name}
                  {student.selectedTeachers[subject] === teacher.id && (
                    <span style={styles.checkmark}> ✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onGenerateSchedule}
        disabled={!allTeachersSelected}
        style={{
          ...styles.generateButton,
          ...(allTeachersSelected
            ? {}
            : styles.generateButtonDisabled),
        }}
      >
        시간표 생성
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    padding: '20px',
    backgroundColor: '#fff',
    height: '100vh',
    overflowY: 'auto',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  emptyState: {
    fontSize: '16px',
    color: '#999',
    textAlign: 'center',
    marginTop: '40px',
  },
  selectionsContainer: {
    marginBottom: '30px',
  },
  subjectSection: {
    marginBottom: '25px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  subjectTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#333',
  },
  teacherList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  teacherButton: {
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  teacherButtonSelected: {
    backgroundColor: '#4CAF50',
    color: 'white',
    borderColor: '#4CAF50',
    fontWeight: 'bold',
  },
  checkmark: {
    fontWeight: 'bold',
  },
  generateButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
};
