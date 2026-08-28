import { db } from "./database";
import type {
  TeacherClass,
  ClassSchedule,
  Student,
  Assessment,
  Grade,
  Homework,
  Detention,
  TeacherNote,
  Task,
  StoredFile,
} from "@/types/database";

export async function seedDatabaseIfEmpty(): Promise<boolean> {
  const classCount = await db.classes.count();
  if (classCount > 0) {
    return false; // Database already contains data
  }

  await seedDatabase();
  return true;
}

export async function seedDatabase(): Promise<void> {
  const now = new Date();
  const isoNow = now.toISOString();

  // 1. Classes
  const class1Id = await db.classes.add({
    name: "GCSE Arabic – Year 10",
    subject: "Arabic Language",
    academicYear: "2026-2027",
    description: "GCSE Level Arabic exam preparation, vocabulary, reading, and spoken fluency.",
    createdAt: isoNow,
    updatedAt: isoNow,
  } as TeacherClass);

  const class2Id = await db.classes.add({
    name: "GCSE Arabic – Year 11",
    subject: "Arabic Language",
    academicYear: "2026-2027",
    description: "Final year intensive GCSE Arabic grammar, literature and past paper drills.",
    createdAt: isoNow,
    updatedAt: isoNow,
  } as TeacherClass);

  await db.classes.add({
    name: "KS3 Arabic – Year 8",
    subject: "Arabic",
    academicYear: "2026-2027",
    description: "Foundational grammar, script practice, conversation basics.",
    createdAt: isoNow,
    updatedAt: isoNow,
  } as TeacherClass);

  // 2. Schedules
  const schedules: Array<Omit<ClassSchedule, "id">> = [
    {
      classId: class1Id,
      dayOfWeek: "monday",
      startTime: "09:00",
      endTime: "09:45",
      room: "Room 204",
      notes: "Vocabulary and starter exercises",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      classId: class1Id,
      dayOfWeek: "wednesday",
      startTime: "11:15",
      endTime: "12:00",
      room: "Room 204",
      notes: "Listening lab & spoken practice",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      classId: class1Id,
      dayOfWeek: "thursday",
      startTime: "13:30",
      endTime: "14:15",
      room: "Room 204",
      notes: "Reading comprehension & written exercises",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      classId: class2Id,
      dayOfWeek: "tuesday",
      startTime: "10:00",
      endTime: "11:00",
      room: "Room 108",
      notes: "Literature text analysis",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      classId: class2Id,
      dayOfWeek: "friday",
      startTime: "14:00",
      endTime: "15:00",
      room: "Room 108",
      notes: "Past paper practice",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
  await db.classSchedules.bulkAdd(schedules as ClassSchedule[]);

  // 3. Students
  const student1Id = await db.students.add({
    classId: class1Id,
    firstName: "Zayd",
    lastName: "Al-Mansoor",
    preferredName: "Zayd",
    dateOfBirth: "2011-04-12",
    email: "zayd.mansoor@school.edu",
    phone: "07700 900123",
    parentName: "Tariq Al-Mansoor",
    parentEmail: "tariq.mansoor@example.com",
    parentPhone: "07700 900456",
    generalNotes: "Very strong spoken fluency, needs minor attention with complex grammar endings.",
    active: true,
    createdAt: isoNow,
    updatedAt: isoNow,
  } as Student);

  const student2Id = await db.students.add({
    classId: class1Id,
    firstName: "Fatima",
    lastName: "Hassan",
    preferredName: "Fatima",
    dateOfBirth: "2011-09-23",
    email: "fatima.hassan@school.edu",
    parentName: "Amina Hassan",
    parentEmail: "amina.hassan@example.com",
    parentPhone: "07700 900789",
    generalNotes: "Excellent work ethic and high homework consistency.",
    active: true,
    createdAt: isoNow,
    updatedAt: isoNow,
  } as Student);

  const student3Id = await db.students.add({
    classId: class1Id,
    firstName: "Adam",
    lastName: "Rahman",
    preferredName: "Adam",
    dateOfBirth: "2011-02-18",
    email: "adam.rahman@school.edu",
    parentName: "Farhan Rahman",
    parentEmail: "farhan.rahman@example.com",
    parentPhone: "07700 900321",
    generalNotes: "Visual learner, benefits from color-coded notes.",
    active: true,
    createdAt: isoNow,
    updatedAt: isoNow,
  } as Student);

  const student4Id = await db.students.add({
    classId: class1Id,
    firstName: "Maryam",
    lastName: "Kareem",
    preferredName: "Maryam",
    dateOfBirth: "2011-11-05",
    email: "maryam.kareem@school.edu",
    parentName: "Layla Kareem",
    parentEmail: "layla.kareem@example.com",
    active: true,
    createdAt: isoNow,
    updatedAt: isoNow,
  } as Student);

  // 4. Assessments
  const assess1Id = await db.assessments.add({
    classId: class1Id,
    title: "Speaking Assessment — Unit 1",
    type: "speaking",
    maxScore: 30,
    assessmentDate: "2026-09-18",
    description: "3-minute presentation about daily routine followed by spontaneous Q&A.",
    createdAt: isoNow,
    updatedAt: isoNow,
  } as Assessment);

  const assess2Id = await db.assessments.add({
    classId: class1Id,
    title: "Reading Comprehension — Autumn Midterm",
    type: "reading",
    maxScore: 50,
    assessmentDate: "2026-10-15",
    description: "Comprehension passages with short and extended written responses.",
    createdAt: isoNow,
    updatedAt: isoNow,
  } as Assessment);

  await db.assessments.add({
    classId: class1Id,
    title: "Grammar & Translation Exam",
    type: "writing",
    maxScore: 40,
    assessmentDate: "2026-11-20",
    description: "Noun-adjective agreement, verb conjugations, sentence construction.",
    createdAt: isoNow,
    updatedAt: isoNow,
  } as Assessment);

  // 5. Grades
  const grades: Array<Omit<Grade, "id">> = [
    {
      assessmentId: assess1Id,
      studentId: student1Id,
      score: 28,
      feedback: "Fluent pronunciation and natural tone. Excellent use of connective phrases.",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      assessmentId: assess1Id,
      studentId: student2Id,
      score: 29,
      feedback: "Superb vocabulary range and accurate past tense structures.",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      assessmentId: assess1Id,
      studentId: student3Id,
      score: 22,
      feedback: "Good effort; revise the vocabulary for family members and hobbies.",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      assessmentId: assess1Id,
      studentId: student4Id,
      score: 27,
      feedback: "Very confident delivery.",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      assessmentId: assess2Id,
      studentId: student1Id,
      score: 44,
      feedback: "High comprehension, just missed one inference detail in Section C.",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      assessmentId: assess2Id,
      studentId: student2Id,
      score: 48,
      feedback: "Near perfect score. Outstanding attention to subtleties.",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      assessmentId: assess2Id,
      studentId: student3Id,
      score: 36,
      feedback: "Solid performance on multiple-choice; practice written inferences.",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
  await db.grades.bulkAdd(grades as Grade[]);

  // 6. Homework
  const homeworkList: Array<Omit<Homework, "id">> = [
    {
      studentId: student1Id,
      classId: class1Id,
      type: "Grammar",
      title: "Exercise 4 — Dual & Plural Rules",
      homeworkDate: "2026-09-12",
      mark: 18,
      maxMark: 20,
      approved: true,
      notes: "Well presented",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      studentId: student1Id,
      classId: class1Id,
      type: "Writing",
      title: "Essay: My Hometown",
      homeworkDate: "2026-09-19",
      mark: 17,
      maxMark: 20,
      approved: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      studentId: student1Id,
      classId: class1Id,
      type: "Vocabulary",
      title: "Unit 3 Flashcards & Sentences",
      homeworkDate: "2026-09-26",
      mark: 14,
      maxMark: 20,
      approved: false,
      notes: "Incomplete sentences, requested resubmission",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      studentId: student2Id,
      classId: class1Id,
      type: "Grammar",
      title: "Exercise 4 — Dual & Plural Rules",
      homeworkDate: "2026-09-12",
      mark: 20,
      maxMark: 20,
      approved: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      studentId: student3Id,
      classId: class1Id,
      type: "Grammar",
      title: "Exercise 4 — Dual & Plural Rules",
      homeworkDate: "2026-09-12",
      mark: 13,
      maxMark: 20,
      approved: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
  await db.homework.bulkAdd(homeworkList as Homework[]);

  // 7. Detentions
  const detentionsList: Array<Omit<Detention, "id">> = [
    {
      studentId: student3Id,
      classId: class1Id,
      detentionDate: "2026-09-15",
      type: "lunch",
      reason: "Missing homework three times in a row",
      notes: "Completed catch-up worksheet during detention",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      studentId: student3Id,
      classId: class1Id,
      detentionDate: "2026-10-10",
      type: "break",
      reason: "No workbook or equipment brought to class",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
  await db.detentions.bulkAdd(detentionsList as Detention[]);

  // 8. Teacher Notes
  const notesList: Array<Omit<TeacherNote, "id">> = [
    {
      studentId: student1Id,
      title: "Spoken Arabic Competition Nomination",
      category: "achievement",
      content: "Nominated Zayd for the inter-school Arabic storytelling showcase. Highly motivated.",
      noteDate: "2026-09-22",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      studentId: student3Id,
      title: "Parent Phone Call — Homework Consistency",
      category: "parent-communication",
      content: "Spoke with Farhan (father). Agreed to check pupil planner every Tuesday evening.",
      noteDate: "2026-09-16",
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
  await db.notes.bulkAdd(notesList as TeacherNote[]);

  // 9. Tasks
  const tasksList: Array<Omit<Task, "id">> = [
    {
      title: "Print speaking assessment mark sheets for Year 10",
      description: "Prepare 25 copies before Wednesday morning period 2.",
      classId: class1Id,
      dueDate: "2026-09-16",
      completed: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      title: "Review Adam's resubmitted vocabulary homework",
      description: "Check sentences for proper gender agreement.",
      studentId: student3Id,
      classId: class1Id,
      dueDate: "2026-09-29",
      completed: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      title: "Create Year 11 Mock Exam Paper",
      description: "Include sections on classical poetry and modern prose.",
      classId: class2Id,
      dueDate: "2026-10-05",
      completed: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
  await db.tasks.bulkAdd(tasksList as Task[]);

  // 10. Sample Stored File (Sample syllabus document stored as Blob)
  const sampleText = "GCSE Arabic Syllabus 2026-2027\nModule 1: Identity and Culture\nModule 2: Local and Global Areas of Interest\nModule 3: Current and Future Study and Employment";
  const sampleBlob = new Blob([sampleText], { type: "text/plain" });

  await db.files.add({
    classId: class1Id,
    name: "GCSE_Arabic_Syllabus_Overview.txt",
    mimeType: "text/plain",
    size: sampleBlob.size,
    blob: sampleBlob,
    createdAt: isoNow,
  } as StoredFile);
}
