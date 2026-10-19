import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assignFeedbackQuery,
  createFeedbackQuery,
  createSessionFeedback,
  FeedbackApiError,
  getFeedbackContext,
  listFeedbackQueries,
  listSessionFeedback,
  publishSessionFeedback,
  replyToFeedbackQuery,
} from "./feedback-api";

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
  return Response.json({ csrfToken: "test-csrf-token" });
}

test("feedback and query lists use encoded same-origin centre scopes", async () => {
  const feedback = stubFetch([Response.json({ feedback: [] })]);
  assert.deepEqual(await listSessionFeedback(" centre/one? ", feedback.fetcher), { feedback: [] });
  assert.equal(feedback.calls[0].input, "/api/feedback?centreId=centre%2Fone%3F");
  assert.equal(feedback.calls[0].init?.credentials, "same-origin");
  assert.equal(feedback.calls[0].init?.cache, "no-store");
  assert.equal(new Headers(feedback.calls[0].init?.headers).has("authorization"), false);

  const queries = stubFetch([Response.json({ queries: [] })]);
  assert.deepEqual(await listFeedbackQueries("centre&two", queries.fetcher), { queries: [] });
  assert.equal(queries.calls[0].input, "/api/feedback-queries?centreId=centre%26two");
});

test("feedback creation obtains CSRF and sends only the camelCase BFF payload", async () => {
  const result = { id: "feedback-id", status: "draft" };
  const mock = stubFetch([csrfResponse(), Response.json(result)]);
  const input = {
    sessionBookingId: "booking-id",
    feedbackText: "A clear progress summary.",
    replacementForFeedbackId: "withdrawn-id",
  };

  assert.deepEqual(await createSessionFeedback(input, mock.fetcher), result);
  assert.equal(mock.calls.length, 2);
  assert.equal(mock.calls[0].input, "/api/auth/csrf");
  assert.equal(mock.calls[1].input, "/api/feedback");
  assert.equal(mock.calls[1].init?.method, "POST");
  assert.equal(mock.calls[1].init?.credentials, "same-origin");
  assert.equal(new Headers(mock.calls[1].init?.headers).get("x-csrf-token"), "test-csrf-token");
  assert.equal(new Headers(mock.calls[1].init?.headers).get("content-type"), "application/json");
  assert.deepEqual(JSON.parse(String(mock.calls[1].init?.body)), input);
});

test("feedback publication encodes the identifier and sends no invented request body", async () => {
  const result = { id: "feedback/id", status: "published" };
  const mock = stubFetch([csrfResponse(), Response.json(result)]);

  assert.deepEqual(await publishSessionFeedback("feedback/id", mock.fetcher), result);
  assert.equal(mock.calls[1].input, "/api/feedback/feedback%2Fid/publish");
  assert.equal(mock.calls[1].init?.method, "POST");
  assert.equal(mock.calls[1].init?.body, undefined);
  assert.equal(new Headers(mock.calls[1].init?.headers).has("content-type"), false);
});

test("query creation, reply, and assignment preserve documented payloads and methods", async () => {
  const created = { id: "query-id", status: "open" };
  const create = stubFetch([csrfResponse(), Response.json(created)]);
  const createInput = {
    studentProfileId: "student-id",
    category: "feedback_follow_up" as const,
    subject: "Chemistry feedback",
    messageText: "Could we discuss the recommended next step?",
    linkedFeedbackId: "feedback-id",
  };
  assert.deepEqual(await createFeedbackQuery(createInput, create.fetcher), created);
  assert.equal(create.calls[1].input, "/api/feedback-queries");
  assert.deepEqual(JSON.parse(String(create.calls[1].init?.body)), createInput);

  const reply = stubFetch([csrfResponse(), Response.json({ ...created, status: "awaiting_parent" })]);
  await replyToFeedbackQuery("query/id", { messageText: "A centre response." }, reply.fetcher);
  assert.equal(reply.calls[1].input, "/api/feedback-queries/query%2Fid/messages");
  assert.equal(reply.calls[1].init?.method, "POST");

  const assignment = stubFetch([csrfResponse(), Response.json({ ...created, status: "assigned" })]);
  await assignFeedbackQuery("query-id", { tutorProfileId: "tutor-id" }, assignment.fetcher);
  assert.equal(assignment.calls[1].input, "/api/feedback-queries/query-id/assignment");
  assert.equal(assignment.calls[1].init?.method, "PUT");
  assert.deepEqual(JSON.parse(String(assignment.calls[1].init?.body)), { tutorProfileId: "tutor-id" });
});

test("invalid local identifiers cannot issue a request", async () => {
  for (const invoke of [
    (fetcher: typeof fetch) => listSessionFeedback("   ", fetcher),
    (fetcher: typeof fetch) => publishSessionFeedback("", fetcher),
  ]) {
    const mock = stubFetch([]);
    await assert.rejects(invoke(mock.fetcher), (caught: unknown) => {
      assert.ok(caught instanceof FeedbackApiError);
      assert.equal(caught.status, 400);
      return true;
    });
    assert.equal(mock.calls.length, 0);
  }
});

test("CSRF and BFF errors retain safe status and messages without retrying mutations", async () => {
  const csrfFailure = stubFetch([
    Response.json({ error: "Your session has expired." }, { status: 401 }),
  ]);
  await assert.rejects(
    createSessionFeedback({ sessionBookingId: "booking", feedbackText: "Feedback" }, csrfFailure.fetcher),
    (caught: unknown) => {
      assert.ok(caught instanceof FeedbackApiError);
      assert.equal(caught.status, 401);
      assert.equal(caught.message, "Your session has expired.");
      return true;
    },
  );
  assert.equal(csrfFailure.calls.length, 1);

  const bffFailure = stubFetch([
    csrfResponse(),
    Response.json({ error: "Feedback is no longer editable." }, { status: 409 }),
  ]);
  await assert.rejects(
    createSessionFeedback({ sessionBookingId: "booking", feedbackText: "Feedback" }, bffFailure.fetcher),
    (caught: unknown) => {
      assert.ok(caught instanceof FeedbackApiError);
      assert.equal(caught.status, 409);
      assert.equal(caught.message, "Feedback is no longer editable.");
      return true;
    },
  );
  assert.equal(bffFailure.calls.length, 2);
});

test("context loads without borrowing booking eligibility and encodes the optional centre", async () => {
  const context = {
    actorUserId: "guardian-id", viewer: "household", centres: [], students: [],
    eligibleBookings: [], assignmentTutors: [],
  };
  const mock = stubFetch([Response.json(context), Response.json(context)]);
  assert.deepEqual(await getFeedbackContext(undefined, mock.fetcher), context);
  assert.deepEqual(await getFeedbackContext("centre/one", mock.fetcher), context);
  assert.equal(mock.calls[0].input, "/api/feedback/context");
  assert.equal(mock.calls[1].input, "/api/feedback/context?centreId=centre%2Fone");
});

test("malformed successful responses never count as completed mutations", async () => {
  for (const response of [new Response("not JSON"), Response.json({}), Response.json([])]) {
    const mock = stubFetch([csrfResponse(), response]);
    await assert.rejects(
      createSessionFeedback({ sessionBookingId: "booking-id", feedbackText: "Feedback" }, mock.fetcher),
      (caught: unknown) => {
        assert.ok(caught instanceof FeedbackApiError);
        assert.equal(caught.status, 502);
        assert.match(caught.message, /Refresh before retrying/);
        return true;
      },
    );
    assert.equal(mock.calls.length, 2);
  }
});

test("uncertain network mutation is not retried and prompts a refresh", async () => {
  const mock = stubFetch([csrfResponse(), new Error("response lost")]);
  await assert.rejects(
    publishSessionFeedback("feedback-id", mock.fetcher),
    (caught: unknown) => {
      assert.ok(caught instanceof FeedbackApiError);
      assert.equal(caught.status, 0);
      assert.match(caught.message, /Refresh before retrying/);
      return true;
    },
  );
  assert.equal(mock.calls.length, 2);
});
