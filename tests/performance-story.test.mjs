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
  assert.match(stats, /See the evidence/);
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
  assert.match(stats, /Strong read/);
  assert.match(stats, /Building read/);
  assert.match(stats, /Early read/);
  assert.match(stats, /What’s driving the trend/);
  assert.match(stats, /BIGGEST OPPORTUNITY/);
  assert.match(stats, /STORY_ACTIONS/);
  assert.match(stats, /Speed reassessment due/);
  assert.match(stats, /Mobility reassessment due/);
});

test("Performance Story has responsive mobile presentation", () => {
  assert.match(css, /\.performance-story\{/);
  assert.match(css, /\.ps-grid\{/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /\.ps-grid\{ grid-template-columns:1fr;/);
});
