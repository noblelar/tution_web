import assert from "node:assert/strict";
import { test } from "node:test";

import { topSubjectBuckets } from "./admin-dashboard-chart-rules";

test("small subject groups remain unchanged", () => {
  const items = [{ key: "maths", label: "Maths", count: 3 }];
  assert.deepEqual(topSubjectBuckets(items), items);
});

test("subject overflow rolls up without losing confirmed bookings", () => {
  const items = Array.from({ length: 10 }, (_, index) => ({
    key: `subject-${index}`, label: `Subject ${index}`, count: index + 1,
  }));
  const result = topSubjectBuckets(items);
  assert.equal(result.length, 9);
  assert.equal(result[8].label, "Other subjects");
  assert.equal(result[8].count, 19);
  assert.equal(result.reduce((sum, item) => sum + item.count, 0), 55);
});
