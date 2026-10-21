import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createStudentNote,
  deferStudentReflectionPrompt,
  deleteStudentNote,
  dismissStudentReflectionPrompt,
  getStudentNote,
  getStudentNoteHistory,
  getStudentNotesContext,
  getStudentReflectionPromptState,
  listStudentNotes,
  StudentNotesApiError,
  updateStudentNote,
} from "./student-notes-api";

function stubFetch(replies: Array<Response | Error>) {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    const reply = replies.shift();
    if (!reply) throw new Error("Unexpected request.");
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { calls, fetcher };
}

function csrfResponse() {
  return Response.json({ csrfToken: "student-notes-csrf" });
}

function noteResponse() {
  return { id: "note-1", subjectArea: "maths", learnedText: "Fractions" };
}

function promptStateResponse() {
  return {
    localDate: "2026-10-20",
    activeTodayCount: 0,
    maximumDailyReflections: 2,
    duePrompt: {
      id: "prompt-1",
      slot: "afternoon",
      localDate: "2026-10-20",
      scheduledAt: "2026-10-20T14:30:00Z",
      expiresAt: "2026-10-20T23:00:00Z",
    },
    deferOptionsMinutes: [30, 60, 120],
  };
}

test("student note reads use encoded same-origin URLs without bearer credentials", async () => {
  const mock = stubFetch([
    Response.json({ notes: [] }),
    Response.json({
      studentProfileId: "student-1", reflectionDate: "2026-10-20",
      subjects: [], understandingLevels: [], recentSessions: [], publishedFeedback: [],
    }),
    Response.json(promptStateResponse()),
    Response.json(noteResponse()),
    Response.json({ revisions: [] }),
  ]);

  await listStudentNotes({ subject: "maths", search: "fractions & ratios", limit: 20 }, mock.fetcher);
  await getStudentNotesContext(mock.fetcher);
  await getStudentReflectionPromptState(mock.fetcher);
  await getStudentNote("note/one", mock.fetcher);
  await getStudentNoteHistory("note/one", mock.fetcher);

  assert.equal(mock.calls[0].input, "/api/student/notes?subject=maths&search=fractions+%26+ratios&limit=20");
  assert.equal(mock.calls[1].input, "/api/student/notes/context");
  assert.equal(mock.calls[2].input, "/api/student/notes/prompts");
  assert.equal(mock.calls[3].input, "/api/student/notes/note%2Fone");
  assert.equal(mock.calls[4].input, "/api/student/notes/note%2Fone/history");
  for (const call of mock.calls) {
    assert.equal(call.init?.credentials, "same-origin");
    assert.equal(call.init?.cache, "no-store");
    assert.equal(new Headers(call.init?.headers).has("authorization"), false);
  }
});

test("prompt deferral and dismissal use CSRF-protected prompt-scoped routes", async () => {
  const defer = stubFetch([csrfResponse(), Response.json({ ...promptStateResponse(), duePrompt: undefined })]);
  await deferStudentReflectionPrompt("prompt/one", 60, defer.fetcher);
  assert.equal(defer.calls[1].input, "/api/student/notes/prompts/prompt%2Fone/defer");
  assert.equal(defer.calls[1].init?.method, "POST");
  assert.equal(new Headers(defer.calls[1].init?.headers).get("x-csrf-token"), "student-notes-csrf");
  assert.deepEqual(JSON.parse(String(defer.calls[1].init?.body)), { minutes: 60 });

  const dismiss = stubFetch([csrfResponse(), Response.json({ ...promptStateResponse(), duePrompt: undefined })]);
  await dismissStudentReflectionPrompt("prompt/one", dismiss.fetcher);
  assert.equal(dismiss.calls[1].input, "/api/student/notes/prompts/prompt%2Fone/dismiss");
  assert.equal(dismiss.calls[1].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(dismiss.calls[1].init?.body)), {});
});

test("create and update obtain CSRF and send only camelCase BFF fields", async () => {
  const input = {
    subjectArea: "maths" as const,
    understandingLevel: "need_some_help" as const,
    learnedText: "  I learned fractions.  ",
    helpText: "  I need help simplifying.  ",
    linkedSessionBookingId: "booking-1",
  };
  const create = stubFetch([csrfResponse(), Response.json(noteResponse())]);
  await createStudentNote(input, create.fetcher);
  assert.equal(create.calls[1].input, "/api/student/notes");
  assert.equal(create.calls[1].init?.method, "POST");
  assert.equal(new Headers(create.calls[1].init?.headers).get("x-csrf-token"), "student-notes-csrf");
  assert.deepEqual(JSON.parse(String(create.calls[1].init?.body)), {
    subjectArea: "maths",
    understandingLevel: "need_some_help",
    learnedText: "I learned fractions.",
    helpText: "I need help simplifying.",
    linkedSessionBookingId: "booking-1",
  });

  const update = stubFetch([csrfResponse(), Response.json(noteResponse())]);
  await updateStudentNote("note/one", input, update.fetcher);
  assert.equal(update.calls[1].input, "/api/student/notes/note%2Fone");
  assert.equal(update.calls[1].init?.method, "PUT");
});

test("soft deletion requires CSRF and accepts only a confirmed 204", async () => {
  const success = stubFetch([csrfResponse(), new Response(null, { status: 204 })]);
  await deleteStudentNote("note/one", success.fetcher);
  assert.equal(success.calls[1].input, "/api/student/notes/note%2Fone");
  assert.equal(success.calls[1].init?.method, "DELETE");
  assert.equal(success.calls[1].init?.body, undefined);

  const uncertain = stubFetch([csrfResponse(), Response.json({ ok: true })]);
  await assert.rejects(deleteStudentNote("note-1", uncertain.fetcher), (caught: unknown) => {
    assert.ok(caught instanceof StudentNotesApiError);
    assert.equal(caught.status, 502);
    assert.match(caught.message, /Refresh before retrying/);
    return true;
  });
});

test("invalid local input cannot issue a request", async () => {
  const mock = stubFetch([]);
  await assert.rejects(getStudentNote("   ", mock.fetcher), StudentNotesApiError);
  await assert.rejects(deleteStudentNote("   ", mock.fetcher), StudentNotesApiError);
  await assert.rejects(listStudentNotes({ limit: 101 }, mock.fetcher), StudentNotesApiError);
  await assert.rejects(deferStudentReflectionPrompt("prompt-1", 45 as 30, mock.fetcher), StudentNotesApiError);
  await assert.rejects(dismissStudentReflectionPrompt("   ", mock.fetcher), StudentNotesApiError);
  await assert.rejects(createStudentNote({
    subjectArea: "english",
    understandingLevel: "understood_most",
    learnedText: " ",
  }, mock.fetcher), StudentNotesApiError);
  assert.equal(mock.calls.length, 0);
});

test("malformed prompt-state responses are rejected", async () => {
  for (const response of [
    Response.json({ ...promptStateResponse(), deferOptionsMinutes: "30" }),
    Response.json({ ...promptStateResponse(), deferOptionsMinutes: [30, 45] }),
    Response.json({ ...promptStateResponse(), duePrompt: { id: "prompt-1", slot: "morning" } }),
  ]) {
    const malformed = stubFetch([response]);
    await assert.rejects(getStudentReflectionPromptState(malformed.fetcher), (caught: unknown) => {
      assert.ok(caught instanceof StudentNotesApiError);
      assert.equal(caught.status, 502);
      return true;
    });
    assert.equal(malformed.calls.length, 1);
  }
});

test("BFF errors and uncertain mutations are surfaced without retries", async () => {
  const conflict = stubFetch([
    csrfResponse(),
    Response.json({ error: "The maximum of two reflections has already been reached for today." }, { status: 409 }),
  ]);
  await assert.rejects(createStudentNote({
    subjectArea: "science",
    understandingLevel: "understood_everything",
    learnedText: "I learned about light.",
  }, conflict.fetcher), (caught: unknown) => {
    assert.ok(caught instanceof StudentNotesApiError);
    assert.equal(caught.status, 409);
    assert.match(caught.message, /maximum of two reflections/);
    return true;
  });
  assert.equal(conflict.calls.length, 2);

  const lost = stubFetch([csrfResponse(), new Error("response lost")]);
  await assert.rejects(updateStudentNote("note-1", {
    subjectArea: "science",
    understandingLevel: "understood_most",
    learnedText: "I learned about light.",
  }, lost.fetcher), (caught: unknown) => {
    assert.ok(caught instanceof StudentNotesApiError);
    assert.equal(caught.status, 0);
    assert.match(caught.message, /Refresh before retrying/);
    return true;
  });
  assert.equal(lost.calls.length, 2);
});

test("malformed successful responses are never accepted as saved notes", async () => {
  for (const response of [new Response("not json"), Response.json({}), Response.json([])]) {
    const mock = stubFetch([csrfResponse(), response]);
    await assert.rejects(createStudentNote({
      subjectArea: "english",
      understandingLevel: "understood_everything",
      learnedText: "I learned a new word.",
    }, mock.fetcher), (caught: unknown) => {
      assert.ok(caught instanceof StudentNotesApiError);
      assert.equal(caught.status, 502);
      assert.match(caught.message, /Refresh before retrying/);
      return true;
    });
    assert.equal(mock.calls.length, 2);
  }
});
