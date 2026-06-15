export type Grade = '초등부' | '중등부' | '고등부';
export type Subject = '국어' | '영어' | '수학';
export type DayOfWeek = '월' | '화' | '수' | '목' | '금';

export interface Teacher {
  id: string;
  name: string;
  subject: Subject;
}

export interface TimeSlot {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface Student {
  id: string;
  name: string;
  grade: Grade;
  selectedTeachers: {
    국어?: string;
    영어?: string;
    수학?: string;
  };
}

export interface ScheduleEntry {
  student: Student;
  subject: Subject;
  teacher: Teacher;
  timeSlot: TimeSlot;
}

export interface AcademyConfig {
  teachers: Teacher[];
  schedule: ScheduleEntry[];
}
