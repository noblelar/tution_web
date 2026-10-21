export const studentNoteSubjects = ["english", "maths", "science"] as const;
export type StudentNoteSubject = (typeof studentNoteSubjects)[number];

export const studentNoteUnderstandingLevels = [
  "understood_everything",
  "understood_most",
  "need_some_help",
  "did_not_understand",
] as const;
export type StudentNoteUnderstandingLevel = (typeof studentNoteUnderstandingLevels)[number];

export type StudentLearningNote = {
  id: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  studentProfileId: string;
  reflectionDate: string;
  dailySequence: number;
  subjectArea: StudentNoteSubject;
  understandingLevel: StudentNoteUnderstandingLevel;
  learnedText: string;
  helpText?: string;
  linkedSessionBookingId?: string;
  linkedFeedbackId?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentLearningNoteRevision = {
  id: string;
  noteId: string;
  revisionNumber: number;
  changeType: "create" | "update" | "delete";
  reflectionDate: string;
  dailySequence: number;
  subjectArea: StudentNoteSubject;
  understandingLevel: StudentNoteUnderstandingLevel;
  learnedText: string;
  helpText?: string;
  linkedSessionBookingId?: string;
  linkedFeedbackId?: string;
  createdAt: string;
};

export type StudentNoteSessionOption = {
  sessionBookingId: string;
  sessionId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  startsAt: string;
  endsAt: string;
};

export type StudentNoteFeedbackOption = {
  feedbackId: string;
  sessionBookingId: string;
  subjectId: string;
  subjectName: string;
  tutorFirstName: string;
  tutorLastName: string;
  preview: string;
  sessionStartsAt: string;
  publishedAt: string;
};

export type StudentNotesContext = {
  studentProfileId: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  reflectionDate: string;
  activeTodayCount: number;
  remainingToday: number;
  maximumDailyReflections: number;
  subjects: StudentNoteSubject[];
  understandingLevels: StudentNoteUnderstandingLevel[];
  recentSessions: StudentNoteSessionOption[];
  publishedFeedback: StudentNoteFeedbackOption[];
};

export type StudentLearningNoteList = { notes: StudentLearningNote[] };
export type StudentLearningNoteRevisionList = { revisions: StudentLearningNoteRevision[] };

export type SaveStudentLearningNoteInput = {
  subjectArea: StudentNoteSubject;
  understandingLevel: StudentNoteUnderstandingLevel;
  learnedText: string;
  helpText?: string;
  linkedSessionBookingId?: string;
  linkedFeedbackId?: string;
};

export type StudentNoteListFilters = {
  subject?: StudentNoteSubject;
  from?: string;
  through?: string;
  search?: string;
  limit?: number;
};

export type StudentReflectionPromptSlot = "afternoon" | "evening";
export type StudentReflectionPromptDeferMinutes = 30 | 60 | 120;

export type StudentReflectionPrompt = {
  id: string;
  slot: StudentReflectionPromptSlot;
  localDate: string;
  scheduledAt: string;
  expiresAt: string;
  lastPresentedAt?: string;
  snoozedUntil?: string;
  lastDeferMinutes?: StudentReflectionPromptDeferMinutes;
};

export type StudentReflectionPromptState = {
  localDate: string;
  activeTodayCount: number;
  maximumDailyReflections: number;
  duePrompt?: StudentReflectionPrompt;
  nextCheckAt?: string;
  deferOptionsMinutes: StudentReflectionPromptDeferMinutes[];
};
