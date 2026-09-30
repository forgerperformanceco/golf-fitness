import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stats = readFileSync(
  new URL("../src/js/app/085-progress-stats-view.js", import.meta.url),
  "utf8"
);
const css = readFileSync(
  new URL("../src/css/styles.css", import.meta.url),
  "utf8"
);

test("Stats leads with the Performance Story before the Octane evidence", () => {
  const story = stats.indexOf("html += performanceStoryHtml()");
  const octane = stats.indexOf("html += renderScoreCard()");
  assert.ok(story > -1, "Performance Story should render");
  assert.ok(octane > story, "Octane evidence should follow the story");
  assert.match(stats, /See the details <span>↓<\/span>/);
  assert.match(stats, /data-pftoggle="pillars"/);
});

test("distance claims distinguish measured results from estimates", () => {
  assert.match(stats, /verified yards/);
  assert.match(stats, /Driver carry ·/);
  assert.match(stats, /yds potential/);
  assert.match(stats, /Estimate: ~2 yds of 7-iron carry per 1 mph/);
  assert.match(stats, /Strength and adherence are supporting signals, never/);
});

test("story supplies confidence, drivers, one opportunity, and reassessment", () => {
  // Plain words (Sep 2026 pass): confidence reads as a trend, not a "read".
  assert.match(stats, /Clear trend/);
  assert.match(stats, /Trend forming/);
  assert.match(stats, /Too early to tell/);
  assert.match(stats, /What’s working/);
  assert.match(stats, /WORK ON NEXT/);
  assert.match(stats, /STORY_ACTIONS/);
  assert.match(stats, /Speed test due/);
  assert.match(stats, /Mobility check due/);
});

test("Performance Story has responsive mobile presentation", () => {
  assert.match(css, /\.performance-story\{/);
  assert.match(css, /\.ps-grid\{/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /\.ps-grid\{ grid-template-columns:1fr;/);
});
