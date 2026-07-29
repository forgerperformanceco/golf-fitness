import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(
  new URL("../src/index.template.html", import.meta.url),
  "utf8"
);
const nav = readFileSync(
  new URL("../src/js/app/015-coach-tips-teach-each-tab-on-first-visit.js", import.meta.url),
  "utf8"
);
const a11y = readFileSync(
  new URL("../src/js/app/010-accessibility-foundation.js", import.meta.url),
  "utf8"
);
const css = readFileSync(
  new URL("../src/css/styles.css", import.meta.url),
  "utf8"
);

test("primary navigation exposes location and controlled screens", () => {
  assert.match(html, /<nav class="tabs" id="tabs" aria-label="Primary">/);
  assert.match(html, /<nav class="mobile-tabbar" id="mobileTabs" aria-label="Primary">/);
  assert.match(html, /aria-current="page" aria-controls="view-dash"/);
  assert.match(nav, /setAttribute\("aria-current","page"\)/);
  assert.match(nav, /removeAttribute\("aria-current"\)/);
});

test("every primary tab starts with the same page-header hierarchy", () => {
  for (const id of ["view-dash", "view-calc", "view-plan", "view-progress", "view-account"]) {
    assert.match(html, new RegExp(`id="${id}"[\\s\\S]*?<header class="view-head">`));
  }
  assert.equal((html.match(/<header class="view-head">/g) || []).length, 5);
  assert.match(css, /\.view-head\{/);
  assert.match(css, /#view-plan\.started > \.card\{/);
  assert.match(nav, /head\?head\.nextSibling:host\.firstChild/);
});

test("screen changes stay oriented visually and audibly", () => {
  assert.match(html, /id="appbarContext"/);
  assert.match(html, /id="viewAnnouncer" aria-live="polite"/);
  assert.match(nav, /contextNames=\{/);
  assert.match(nav, /document\.title=/);
  assert.match(nav, /announcer\.textContent=/);
});

test("keyboard users can skip, navigate, and see focus", () => {
  assert.match(html, /class="skip-link" href="#appMain"/);
  assert.match(html, /<main class="wrap" id="appMain" tabindex="-1">/);
  assert.match(nav, /\["ArrowLeft","ArrowRight","Home","End"\]/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("dialogs hide, trap focus, close with Escape, and restore focus", () => {
  assert.match(html, /id="logModal" aria-hidden="true" hidden/);
  assert.match(nav, /setAttribute\("aria-hidden", selected \? "false" : "true"\)/);
  assert.match(a11y, /card\.setAttribute\("role","dialog"\)/);
  assert.match(a11y, /if\(e\.key==="Escape"\)/);
  assert.match(a11y, /if\(returnFocus && returnFocus\.isConnected\)/);
  assert.match(a11y, /MutationObserver\(syncOverlays\)/);
});
