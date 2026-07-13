import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL("../src/js/app/006-icons.js", import.meta.url), "utf8"), context);

test("user markup is escaped in text and attribute contexts", () => {
  const payload = `<img src=x onerror="globalThis.pwned=1">'&`;
  const escaped = context.ffEsc(payload);
  assert.equal(escaped.includes("<img"), false);
  assert.match(escaped, /&lt;img/);
  assert.match(escaped, /&quot;/);
  assert.match(context.ffAttr(payload), /&#39;/);
});
