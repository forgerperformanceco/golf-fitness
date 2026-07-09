#!/usr/bin/env node
/* frontier-extract.mjs — turn one Yardsmith backup JSON into research-ready tables.
 *
 * Usage:  node frontier-extract.mjs <backup.json> [--asof YYYY-MM-DD]
 *
 * Input: the file produced by Account → "⬇ Export my data" (ffExportData,
 * src/js/app/080-game-day-round-day-fueling-warm-up-plan.js:276-285):
 *   { app:"Yardsmith", kind:"backup", version:1, exported:ISO, data:{ ff_*... } }
 * A raw key dump ({ ff_log:…, ff_body:… }) is also accepted, mirroring
 * ffImportData's own acceptance rule (080:308).
 *
 * Output (stdout, JSON): per-week overspeed dose prescribed vs completed,
 * speed-test series, per-lift e1RM series, daily fuel-adherence scores, rounds.
 * READ-ONLY — never writes anything.
 *
 * The dose/wave/week/fuel/e1RM math below deliberately REPLICATES the app
 * (all refs verified at HEAD f21930a, 2026-07-08):
 *   curWeek/daysSinceStart  src/js/app/040-workout-logger.js:63-74
 *   waveFor + eventInfo     src/js/app/035-training-plan.js:398-421
 *   overspeedDose           src/js/app/035-training-plan.js:445-450
 *   e1RM (Epley)            src/js/app/070-workout-player…js:596-597
 *   big-lift filter         src/js/app/085-progress-stats-view.js:93
 *   fuelScoreFor            src/js/app/030-fuel…js:32-38
 * If those functions change, re-verify this replica (see the skill's
 * Provenance section) — drift here silently corrupts every analysis.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node frontier-extract.mjs <backup.json> [--asof YYYY-MM-DD]");
  process.exit(2);
}
const asofIx = args.indexOf("--asof");
const NOW = asofIx >= 0 ? new Date(args[asofIx + 1] + "T12:00:00").getTime() : Date.now();

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const D = raw && raw.kind === "backup" ? raw.data : raw; // 080:308 rule
if (!D || typeof D !== "object" || (!D.ff_log && !D.ff_body && !D.fairwayfuel)) {
  console.error("not a Yardsmith backup / key dump");
  process.exit(2);
}

/* ---- week & wave math (replicas) ---- */
function midnight(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
const start = D.ff_start ? midnight(new Date(D.ff_start)) : null;
function weekOf(ts) { // curWeek generalized to any timestamp (040:63-74)
  if (start == null || ts == null || isNaN(ts)) return null;
  const days = Math.max(0, Math.round((midnight(ts) - start) / 864e5));
  return Math.max(1, Math.min(20, Math.floor(days / 7) + 1));
}
function eventWeek() { // eventInfo replica (035:398-409)
  const ev = D.ff_event;
  if (!ev || !ev.date) return null;
  const t = new Date(ev.date + "T12:00:00").getTime();
  if (isNaN(t) || t < NOW - 864e5 || start == null) return null; // past events don't remap
  const days = Math.floor((t - start) / 864e5);
  return days >= 0 && days < 140 ? Math.floor(days / 7) + 1 : null;
}
function waveFor(week) { // 035:410-421
  const evw = eventWeek();
  if (evw && (week === evw || week === evw - 1)) return "peak";
  if (evw && week === evw + 1) return "deload";
  if (week >= 19) return "peak";
  const pos = ((week - 1) % 6) + 1;
  return pos === 6 ? "deload" : pos >= 4 ? "intensify" : "accumulate";
}
function overspeedDose(week) { // 035:445-450
  const wv = waveFor(week);
  if (wv === "deload" || wv === "peak" || week <= 2) return "2 × 5";
  if (week <= 8) return "3 × 5";
  return "4 × 5";
}
function doseSets(t) { const m = String(t).match(/^(\d+)/); return m ? +m[1] : null; }

/* ---- 1 · overspeed adherence: prescribed vs completed, per week ---- */
const log = D.ff_log && typeof D.ff_log === "object" ? D.ff_log : {};
const weeks = {};
for (const key of Object.keys(log)) {
  const i = key.indexOf("|");
  if (i < 0) continue;
  const wk = parseInt(key.slice(0, i), 10);
  const sess = log[key];
  if (!wk || !sess || !Array.isArray(sess.ex)) continue;
  const W = (weeks[wk] = weeks[wk] || { liftSessions: 0, speedSessions: 0, overspeedSetsDone: 0, overspeedRepsDone: 0 });
  const isSpeed = /Speed\s*&\s*Power/i.test(key.slice(i + 1));
  if (isSpeed) W.speedSessions++; else W.liftSessions++;
  for (const x of sess.ex) {
    if (!/Overspeed/i.test(x.name || "")) continue;
    for (const st of x.sets || []) {
      const r = parseInt(st.r, 10);
      if (st.done || (!isNaN(r) && r > 0)) { W.overspeedSetsDone++; W.overspeedRepsDone += isNaN(r) ? 0 : r; }
    }
  }
}
const overspeed = Object.keys(weeks).map(Number).sort((a, b) => a - b).map((wk) => {
  const p = overspeedDose(wk);
  return {
    week: wk, wave: waveFor(wk), prescribed: p, prescribedSets: doseSets(p),
    completedSets: weeks[wk].overspeedSetsDone, completedReps: weeks[wk].overspeedRepsDone,
    speedDayLogged: weeks[wk].speedSessions > 0, liftSessions: weeks[wk].liftSessions,
  };
});

/* ---- 2 · speed series (guided tests + any ff_body 7-iron entry) ---- */
const speedTests = (Array.isArray(D.ff_speedtest) ? D.ff_speedtest : []).map((e) => ({
  ts: e.ts, date: e.date, week: e.week, best: e.best, swings: e.swings,
}));
const body = Array.isArray(D.ff_body) ? D.ff_body : [];
const speedBody = body
  .filter((e) => e && e.s != null && e.s !== "" && !isNaN(parseFloat(e.s)))
  .map((e) => ({ iso: e.iso || null, date: e.date, week: weekOf(e.ts || Date.parse(e.date)), mph: parseFloat(e.s) }));

/* ---- 3 · e1RM series on the big lifts ---- */
const BIG = /Squat|Deadlift|Bench|Press|Row|Romanian|Hinge|Hip Thrust|Pull-?up|Chin|Lunge|Split Squat/i; // 085:93
const e1 = (w, r) => { w = parseFloat(w); r = parseInt(r, 10); return !w || !r || r < 1 ? 0 : w * (1 + r / 30); }; // 070:596-597
const e1rm = {};
for (const key of Object.keys(log)) {
  const wk = parseInt(key.slice(0, key.indexOf("|")), 10);
  for (const x of (log[key] && log[key].ex) || []) {
    if (!BIG.test(x.name || "")) continue;
    let top = 0;
    for (const st of x.sets || []) top = Math.max(top, e1(st.w, st.r));
    if (top > 0) (e1rm[x.name] = e1rm[x.name] || []).push({ week: wk, e1rm: Math.round(top * 10) / 10 });
  }
}
for (const n of Object.keys(e1rm)) e1rm[n].sort((a, b) => a.week - b.week);

/* ---- 4 · daily fuel adherence ---- */
function fuelScoreFor(d) { // 030:32-38
  if (!d) return null;
  if (d.rating) return d.rating === "on" ? 1 : d.rating === "close" ? 0.6 : 0.15;
  const ks = Object.keys(d.m || {});
  if (!ks.length) return null;
  let sum = 0;
  for (const k of ks) sum += d.m[k] === "a" ? 1 : 0.75;
  return Math.min(1, sum / (d.n || 4));
}
const fuel = Object.keys(D.ff_fuel && typeof D.ff_fuel === "object" ? D.ff_fuel : {}).sort().map((iso) => ({
  iso, week: weekOf(Date.parse(iso + "T12:00:00")), score: fuelScoreFor(D.ff_fuel[iso]),
})).filter((r) => r.score != null);

/* ---- 5 · rounds ---- */
const rounds = (Array.isArray(D.ff_rounds) ? D.ff_rounds : []).map((r) => ({
  date: r.date, week: weekOf(r.ts || Date.parse(r.date)), score: r.score ?? null,
  drive: r.drive ?? null, driving: r.driving ?? null, energy: r.energy ?? null,
}));

/* ---- weight series (for adaptive/coupling work) ---- */
const weight = body
  .filter((e) => e && !isNaN(parseFloat(e.w)))
  .map((e) => ({ iso: e.iso || null, week: weekOf(e.ts || Date.parse(e.date)), lb: parseFloat(e.w) }));

const report = {
  meta: {
    source: raw.kind === "backup" ? { app: raw.app, version: raw.version, exported: raw.exported } : "raw-key-dump",
    planStart: D.ff_start || null, currentWeek: weekOf(NOW),
    keysPresent: Object.keys(D).sort(),
    caveats: [
      "ff_speedtest capped at 60 entries, ff_rounds at 60, ff_fuel at 95 days — old data is gone, not missing-at-random",
      "wave/dose math is a replica of src at f21930a — re-verify after any 035-training-plan.js change",
      "single-user export: this is N-of-1 data; cross-user claims need consented multi-user exports",
    ],
  },
  overspeedAdherence: overspeed,
  speedTests, speedEntries: speedBody,
  e1rmSeries: e1rm,
  fuelDaily: fuel,
  rounds, weight,
};
console.log(JSON.stringify(report, null, 2));
