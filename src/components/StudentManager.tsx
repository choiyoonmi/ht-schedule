import { useState } from 'react';
import { Student, Grade } from '../types';

interface StudentManagerProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
  selectedStudent: Student | null;
}

export function StudentManager({
  students,
  onAddStudent,
  onSelectStudent,
  selectedStudent,
}: StudentManagerProps) {
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<Grade>('초등부');

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;

    const newStudent: Student = {
      id: `student_${Date.now()}`,
      name: newStudentName,
      grade: selectedGrade,
      selectedTeachers: {},
    };

    onAddStudent(newStudent);
    setNewStudentName('');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>학생 관리</h2>

      <div style={styles.addSection}>
        <div style={styles.formGroup}>
          <label style={styles.label}>학생 이름</label>
          <input
            type="text"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="이름을 입력하세요"
            style={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && handleAddStudent()}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>부반 선택</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value as Grade)}
            style={styles.select}
          >
            <option value="초등부">초등부</option>
            <option value="중등부">중등부</option>
            <option value="고등부">고등부</option>
          </select>
        </div>

        <button onClick={handleAddStudent} style={styles.addButton}>
          학생 추가
        </button>
      </div>

      <div style={styles.studentList}>
        <h3 style={styles.subtitle}>등록된 학생</h3>
        <div style={styles.list}>
          {students.map((student) => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              style={{
                ...styles.studentItem,
                ...(selectedStudent?.id === student.id
                  ? styles.studentItemSelected
                  : {}),
              }}
            >
              <div style={styles.studentName}>{student.name}</div>
              <div style={styles.studentGrade}>{student.grade}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    borderRight: '1px solid #ddd',
    height: '100vh',
    overflowY: 'auto',
    minWidth: '300px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  addSection: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  addButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  studentList: {
    marginTop: '20px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  studentItem: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#fff',
    transition: 'all 0.2s',
  },
  studentItemSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
    fontWeight: 'bold',
  },
  studentName: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  studentGrade: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
};
