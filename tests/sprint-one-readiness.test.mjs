import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("anonymous product health has a strict client and server allow-list", () => {
  const client = read("product-health.js");
  const server = read("supabase/functions/product-health/index.ts");
  assert.match(client, /navigator\.doNotTrack!=="1"/);
  assert.match(client, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(client, /FF\.user|access_token|email:/);
  assert.match(server, /Do not log request headers, IP, auth, URL or the raw payload/);
  assert.doesNotMatch(server, /SUPABASE_SERVICE_ROLE_KEY|\.from\(/);
});

test("store privacy and deletion assets ship in web and native builds", () => {
  const template = read("src/index.template.html");
  const sw = read("src/sw.template.js");
  const buildWeb = read("scripts/build-www.mjs");
  const codemagic = read("codemagic.yaml");
  const privacy = read("native/ios/PrivacyInfo.xcprivacy");
  assert.match(template, /product-health\.js/);
  for (const file of ["delete-account.html", "product-health.js"]) {
    assert.match(sw, new RegExp(file.replace(".", "\\.")));
    assert.match(buildWeb, new RegExp(file.replace(".", "\\.")));
  }
  assert.match(sw, /var htmlKey/);
  assert.match(sw, /delete-account\\\.html/);
  assert.match(codemagic, /install-ios-privacy-manifest\.rb/);
  assert.match(privacy, /NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(read("privacy.html"), /Long Game Labs LLC/);
  assert.match(read("delete-account.html"), /Permanently delete my account/);
});

test("Android targets the current Play requirement", () => {
  const gradle = read("android/variables.gradle");
  assert.match(gradle, /compileSdkVersion = 36/);
  assert.match(gradle, /targetSdkVersion = 36/);
});
