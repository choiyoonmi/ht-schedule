import { Student, Teacher, ScheduleEntry, TimeSlot, Grade, Subject } from '../types';

const GRADE_TIMES: Record<Grade, { start: number; end: number }> = {
  '초등부': { start: 14, end: 18 },
  '중등부': { start: 17, end: 21 },
  '고등부': { start: 18, end: 21 },
};

const SUBJECT_HOURS: Record<Subject, number> = {
  '국어': 2,
  '영어': 2,
  '수학': 2,
};

const DAYS: Array<'월' | '화' | '수' | '목' | '금'> = ['월', '화', '수', '목', '금'];

export function generateSchedule(
  students: Student[],
  teachers: Teacher[]
): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [];

  for (const student of students) {
    const gradeTime = GRADE_TIMES[student.grade];
    let currentSlot = gradeTime.start;

    for (const subject of ['국어', '영어', '수학'] as Subject[]) {
      const teacherId = student.selectedTeachers[subject];
      if (!teacherId) continue;

      const teacher = teachers.find((t) => t.id === teacherId);
      if (!teacher) continue;

      const hours = SUBJECT_HOURS[subject];

      for (let i = 0; i < hours; i++) {
        if (student.grade === '고등부' && subject !== '영어') {
          continue;
        }

        const dayIndex = (i + getStudentOffset(student.id)) % DAYS.length;
        const day = DAYS[dayIndex];

        let assignedSlot = currentSlot + i;
        if (assignedSlot >= gradeTime.end) {
          assignedSlot = gradeTime.start;
        }

        const timeSlot: TimeSlot = {
          day,
          startTime: `${String(assignedSlot).padStart(2, '0')}:00`,
          endTime: `${String(assignedSlot + 1).padStart(2, '0')}:00`,
        };

        schedule.push({
          student,
          subject,
          teacher,
          timeSlot,
        });
      }

      currentSlot += hours;
      if (currentSlot >= gradeTime.end) {
        currentSlot = gradeTime.start;
      }
    }
  }

  return schedule;
}

function getStudentOffset(studentId: string): number {
  return parseInt(studentId.replace(/\D/g, '')) % DAYS.length;
}

export function getTimeSlotsByDay(
  schedule: ScheduleEntry[],
  student: Student
): Record<string, ScheduleEntry[]> {
  const slotsByDay: Record<string, ScheduleEntry[]> = {};

  DAYS.forEach((day) => {
    slotsByDay[day] = schedule.filter(
      (entry) => entry.student.id === student.id && entry.timeSlot.day === day
    );
  });

  return slotsByDay;
}
