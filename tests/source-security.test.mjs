import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Supabase browser SDK is exact-versioned with integrity", () => {
  const src = readFileSync(new URL("../cloud-sync.js", import.meta.url), "utf8");
  assert.match(src, /supabase-js@2\.110\.2/);
  assert.match(src, /sc\.integrity = "sha384-/);
  assert.doesNotMatch(src, /supabase-js@2["/]/);
});

test("Edge Function dependencies are pinned", () => {
  for (const path of ["ai-coach", "delete-account", "paddle-webhook", "push-daily"]) {
    const src = readFileSync(new URL(`../supabase/functions/${path}/index.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /supabase-js@\^?2["']/);
  }
});
