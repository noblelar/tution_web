import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mapStudentLearningNote,
  mapStudentLearningNoteList,
  mapStudentLearningNoteRevisionList,
  mapStudentNotesContext,
  mapStudentReflectionPromptState,
  type BackendStudentLearningNote,
  type BackendStudentNotesContext,
  type BackendStudentReflectionPromptState,
} from "./server-student-notes-mapper";
import { prepareStudentNoteInput, studentNoteListQuery } from "./student-notes-rules";

function backendNote(): BackendStudentLearningNote {
  return {
    id: "note-1",
    centre_id: "centre-1",
    centre_name: "Labour Memorial Hall",
    centre_time_zone: "Europe/London",
    student_profile_id: "student-1",
    reflection_date: "2026-10-20",
    daily_sequence: 1,
    subject_area: "maths",
    understanding_level: "need_some_help",
    learned_text: "I learned how equivalent fractions work.",
    help_text: "I want to practise simplifying fractions.",
    linked_session_booking_id: "booking-1",
    linked_feedback_id: "feedback-1",
    created_at: "2026-10-20T15:40:00Z",
    updated_at: "2026-10-20T15:40:00Z",
  };
}

function backendContext(): BackendStudentNotesContext {
  return {
    student_profile_id: "student-1",
    centre_id: "centre-1",
    centre_name: "Labour Memorial Hall",
    centre_time_zone: "Europe/London",
    reflection_date: "2026-10-20",
    active_today_count: 1,
    remaining_today: 1,
    maximum_daily_reflections: 2,
    subjects: ["english", "maths", "science"],
    understanding_levels: ["understood_everything", "understood_most", "need_some_help", "did_not_understand"],
    recent_sessions: [{
      session_booking_id: "booking-1",
      session_id: "session-1",
      subject_id: "subject-1",
      subject_name: "Mathematics",
      subject_code: "MATH",
      starts_at: "2026-10-19T15:30:00Z",
      ends_at: "2026-10-19T17:30:00Z",
    }],
    published_feedback: [{
      feedback_id: "feedback-1",
      session_booking_id: "booking-1",
      subject_id: "subject-1",
      subject_name: "Mathematics",
      tutor_first_name: "Noble",
      tutor_last_name: "Ackor",
      preview: "Good progress with fractions.",
      session_starts_at: "2026-10-19T15:30:00Z",
      published_at: "2026-10-19T18:00:00Z",
    }],
  };
}

function backendPromptState(): BackendStudentReflectionPromptState {
  return {
    local_date: "2026-10-20",
    active_today_count: 1,
    maximum_daily_reflections: 2,
    due_prompt: {
      id: "prompt-1",
      slot: "evening",
      local_date: "2026-10-20",
      scheduled_at: "2026-10-20T19:30:00Z",
      expires_at: "2026-10-20T23:00:00Z",
      last_presented_at: "2026-10-20T19:31:00Z",
    },
    next_check_at: "2026-10-20T19:31:00Z",
    defer_options_minutes: [30, 60, 120],
  };
}

test("student note mapping converts the complete backend contract", () => {
  const note = mapStudentLearningNote(backendNote());
  assert.equal(note.centreTimeZone, "Europe/London");
  assert.equal(note.subjectArea, "maths");
  assert.equal(note.understandingLevel, "need_some_help");
  assert.equal(note.linkedSessionBookingId, "booking-1");

  const list = mapStudentLearningNoteList({ notes: [backendNote()] });
  assert.equal(list.notes[0].studentProfileId, "student-1");

  const context = mapStudentNotesContext(backendContext());
  assert.equal(context.remainingToday, 1);
  assert.equal(context.recentSessions[0].sessionBookingId, "booking-1");
  assert.equal(context.publishedFeedback[0].tutorFirstName, "Noble");
});

test("prompt-state mapping validates and camel-cases the reminder contract", () => {
  const state = mapStudentReflectionPromptState(backendPromptState());
  assert.equal(state.localDate, "2026-10-20");
  assert.equal(state.duePrompt?.slot, "evening");
  assert.equal(state.duePrompt?.lastPresentedAt, "2026-10-20T19:31:00Z");
  assert.deepEqual(state.deferOptionsMinutes, [30, 60, 120]);

  const malformed = backendPromptState() as unknown as Record<string, unknown>;
  malformed.defer_options_minutes = [30, 45];
  assert.throws(() => mapStudentReflectionPromptState(malformed), /unsupported value/);
});

test("revision mapping retains immutable content history", () => {
  const result = mapStudentLearningNoteRevisionList({
    revisions: [{
      id: "revision-2",
      note_id: "note-1",
      revision_number: 2,
      change_type: "update",
      reflection_date: "2026-10-20",
      daily_sequence: 1,
      subject_area: "maths",
      understanding_level: "understood_most",
      learned_text: "I can now simplify fractions.",
      created_at: "2026-10-20T17:00:00Z",
    }],
  });
  assert.equal(result.revisions[0].noteId, "note-1");
  assert.equal(result.revisions[0].revisionNumber, 2);
  assert.equal(result.revisions[0].changeType, "update");
});

test("mapper rejects malformed success payloads", () => {
  const note = backendNote() as unknown as Record<string, unknown>;
  note.daily_sequence = 3;
  assert.throws(() => mapStudentLearningNote(note), /daily_sequence must be 1 or 2/);

  const context = backendContext() as unknown as Record<string, unknown>;
  context.subjects = ["history"];
  assert.throws(() => mapStudentNotesContext(context), /unsupported value/);
  assert.throws(() => mapStudentLearningNoteList({}), /notes must be an array/);
});

test("student note input and list filters normalize only documented fields", () => {
  assert.deepEqual(prepareStudentNoteInput({
    subjectArea: "science",
    understandingLevel: "understood_most",
    learnedText: "  I learned why shadows change.  ",
    helpText: "   ",
    linkedSessionBookingId: " booking/one ",
    ignored: "not forwarded",
  }), {
    subjectArea: "science",
    understandingLevel: "understood_most",
    learnedText: "I learned why shadows change.",
    linkedSessionBookingId: "booking/one",
  });
  assert.equal(
    studentNoteListQuery({ subject: "maths", from: "2026-10-01", through: "2026-10-20", search: " fractions & ratios ", limit: 25 }),
    "subject=maths&from=2026-10-01&through=2026-10-20&search=fractions+%26+ratios&limit=25",
  );
  assert.equal(studentNoteListQuery({ limit: 101 }), null);
  assert.equal(prepareStudentNoteInput({ subjectArea: "history" }), null);
});
