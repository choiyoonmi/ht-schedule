import { Student, ScheduleEntry } from '../types';

interface ScheduleDisplayProps {
  student: Student | null;
  schedule: ScheduleEntry[];
}

const DAYS = ['월', '화', '수', '목', '금'];
const HOURS = [14, 15, 16, 17, 18, 19, 20];

export function ScheduleDisplay({ student, schedule }: ScheduleDisplayProps) {
  if (!student) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          시간표가 표시됩니다.
        </div>
      </div>
    );
  }

  const studentSchedule = schedule.filter(
    (entry) => entry.student.id === student.id
  );

  if (studentSchedule.length === 0) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>{student.name} - 시간표</h2>
        <div style={styles.emptyState}>
          선생님을 선택하고 시간표를 생성해주세요.
        </div>
      </div>
    );
  }

  const createScheduleGrid = () => {
    const grid: Record<string, Record<number, ScheduleEntry | null>> = {};

    DAYS.forEach((day) => {
      grid[day] = {};
      HOURS.forEach((hour) => {
        grid[day][hour] = null;
      });
    });

    studentSchedule.forEach((entry) => {
      const hour = parseInt(entry.timeSlot.startTime.split(':')[0]);
      grid[entry.timeSlot.day][hour] = entry;
    });

    return grid;
  };

  const grid = createScheduleGrid();

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{student.name} - 시간표</h2>
      <p style={styles.gradeInfo}>{student.grade}</p>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>시간</th>
              {DAYS.map((day) => (
                <th key={day} style={styles.th}>
                  {day}요일
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => {
              const gradeStart =
                student.grade === '초등부'
                  ? 14
                  : student.grade === '중등부'
                    ? 17
                    : 18;
              const gradeEnd =
                student.grade === '초등부'
                  ? 18
                  : student.grade === '중등부'
                    ? 21
                    : 21;

              if (hour < gradeStart || hour >= gradeEnd) {
                return null;
              }

              return (
                <tr key={hour}>
                  <td style={styles.timeCell}>
                    {String(hour).padStart(2, '0')}:00 ~{' '}
                    {String(hour + 1).padStart(2, '0')}:00
                  </td>
                  {DAYS.map((day) => {
                    const entry = grid[day][hour];
                    return (
                      <td key={`${day}-${hour}`} style={styles.scheduleCell}>
                        {entry ? (
                          <div style={styles.classBlock}>
                            <div style={styles.subject}>
                              {entry.subject}
                            </div>
                            <div style={styles.teacher}>
                              {entry.teacher.name}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={styles.summary}>
        <h3 style={styles.summaryTitle}>등록 현황</h3>
        <div style={styles.subjectList}>
          {(['국어', '영어', '수학'] as const).map((subject) => {
            if (student.grade === '고등부' && subject !== '영어') return null;

            const teacher = studentSchedule.find(
              (entry) => entry.subject === subject
            )?.teacher;

            return (
              <div key={subject} style={styles.subjectInfo}>
                <span style={styles.subjectLabel}>{subject}:</span>
                <span style={styles.teacherInfo}>
                  {teacher ? teacher.name : '미선택'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
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
  gradeInfo: {
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
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
  },
  th: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '13px',
  },
  timeCell: {
    padding: '12px',
    border: '1px solid #ddd',
    backgroundColor: '#f9f9f9',
    fontWeight: 'bold',
    fontSize: '12px',
    minWidth: '100px',
  },
  scheduleCell: {
    padding: '8px',
    border: '1px solid #ddd',
    height: '80px',
    verticalAlign: 'top',
    backgroundColor: '#fafafa',
  },
  classBlock: {
    padding: '8px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    border: '1px solid #bbdefb',
    height: '100%',
  },
  subject: {
    fontWeight: 'bold',
    fontSize: '13px',
    marginBottom: '4px',
  },
  teacher: {
    fontSize: '12px',
    color: '#1565c0',
  },
  summary: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    marginTop: '20px',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  subjectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  subjectInfo: {
    display: 'flex',
    gap: '10px',
    fontSize: '14px',
  },
  subjectLabel: {
    fontWeight: 'bold',
    minWidth: '40px',
  },
  teacherInfo: {
    color: '#666',
  },
};
