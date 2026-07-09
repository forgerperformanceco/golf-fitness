/* seeds.mjs — copy-pasteable localStorage seeds for the Yardsmith Playwright harness.
 *
 * THE ONE RULE: every seed must be SELF-CONTAINED. Playwright's
 * page.addInitScript(fn) serializes ONLY the outer function's source text —
 * a seed that calls another seed function, or references ANY variable outside
 * its own body, throws inside the page before the app loads and you silently
 * get NO seed (DESIGN-CHANGES.md §48: this burned a real hour — the "bug" in
 * the capture was just an unseeded fresh user with the onboarding wizard up).
 * The only legal injection channel for data is the second argument:
 *     await page.addInitScript(seedOnboarded, { goal: 'cut' });
 *
 * Other seed laws (each learned the hard way — see SKILL.md gotcha table):
 *  - The master profile key is the literal string "fairwayfuel" (pre-rebrand
 *    name, kept deliberately). NOT "ff_profile", NOT "yardsmith".
 *  - profile.goal must be a REAL GOALS key: leanbulk | bulk | maintain | cut
 *    ('leanbulk', not 'lean' — DESIGN-CHANGES.md §42).
 *  - All values are JSON (the app reads via JSON.parse) — always
 *    JSON.stringify, even booleans: localStorage.setItem('ff_onboarded','true').
 *  - Stats trend cards sit behind a hasAny gate (085:257): sessions logged OR
 *    a parseable ff_body speed/weight entry. seedActive provides both.
 *  - Seeding is for BEFORE load. If you write localStorage AFTER the app
 *    booted (page.evaluate), you MUST dispatch ff-external-write or the
 *    memoized lsGet cache serves the app stale data (040:28, §64).
 *
 * Usage with the harness:
 *   import { seedOnboarded, seedActive } from './seeds.mjs';
 *   import { launchApp } from './serve.mjs';
 *   const app = await launchApp({ seed: seedActive });
 */

/** Brand-new user. A fresh Playwright context already has empty storage, so
 *  this is only needed defensively (e.g. reusing a context across tests).
 *  Expect: onboarding wizard (#obRoot) pops on load. */
export function seedFresh() {
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
}

/** Onboarded user, plan NOT started. Profile shape mirrors what persist()
 *  writes (src/js/app/020-persistence…js:5-12). Overridable via the arg:
 *    page.addInitScript(seedOnboarded, { goal:'cut', freq:4 })
 *  Expect: no wizard; Home shows "Start your 20-week plan". */
export function seedOnboarded(over) {
  var p = {
    sex: 'male', goal: 'leanbulk', workout: 'morning', meals: null,
    age: '34', weight: '185', heightFt: '5', heightIn: '11',
    activity: '1.55', freq: 5,
    equip: { bodyweight: true, dumbbell: true, barbell: true, rack: true,
             bench: true, cable: true, machines: true, band: true },
    view: 'dash'
  };
  if (over) { for (var k in over) p[k] = over[k]; }
  try {
    localStorage.setItem('fairwayfuel', JSON.stringify(p));
    localStorage.setItem('ff_onboarded', 'true');
    localStorage.setItem('ff_goalyds', '15');
  } catch (e) {}
}

/** Active user: onboarded + plan started 10 days ago (week 2) + two finished
 *  logged sessions (ff_log + ff_history, tombstone-free) + body/speed history
 *  (ff_body with iso+ts identity) + one guided speed test (ff_speedtest).
 *  This clears the Stats hasAny gate AND gives every Octane pillar except
 *  mobility/fuel real data. Optional arg: { daysAgo: 10 } to move the anchor.
 *  Expect: no wizard; Home shows the week strip; Stats shows trend cards. */
export function seedActive(opt) {
  var daysAgo = (opt && opt.daysAgo) || 10;
  var DAY = 86400000;
  function locale(d) {
    try { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return d.toDateString(); }
  }
  function iso(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }
  var start = new Date(Date.now() - daysAgo * DAY); start.setHours(0, 0, 0, 0);
  var d1 = new Date(start.getTime());               // week 1 day 1
  var d2 = new Date(start.getTime() + 7 * DAY);     // week 2 day 1
  var dayName = 'Day 1 — Lower (Quads)';       // real days5 name, em dash (035:37)
  function sess(date, w1, w2) {
    return {
      date: locale(date), finishedAt: locale(date), _ts: date.getTime(),
      ex: [
        { name: 'Leg Press', orig: 'Leg Press', target: '4 × 6 (heavy · fast up)',
          sets: [{ w: String(w1), r: '6', done: true }, { w: String(w1), r: '6', done: true },
                 { w: String(w1), r: '6', done: true }, { w: String(w1), r: '6', done: true }] },
        { name: 'Romanian Deadlift', orig: 'Romanian Deadlift', target: '3 × 8',
          sets: [{ w: String(w2), r: '8', done: true }, { w: String(w2), r: '8', done: true },
                 { w: String(w2), r: '8', done: true }] }
      ]
    };
  }
  var log = {};
  log['1|' + dayName] = sess(d1, 270, 185);
  log['2|' + dayName] = sess(d2, 280, 195);
  function hist(week, s) {
    var vol = 0, n = 0;
    s.ex.forEach(function (x) { x.sets.forEach(function (st) { n++; vol += parseFloat(st.w) * parseFloat(st.r); }); });
    return { id: s.date + ' · ' + dayName, ts: s._ts, date: s.date, day: dayName,
             week: week, sets: n, volume: Math.round(vol), note: '',
             ex: s.ex.map(function (x) { return { name: x.name, target: x.target,
               sets: x.sets.map(function (st) { return { w: st.w, r: st.r }; }) }; }) };
  }
  var body = [
    { date: locale(d1), iso: iso(d1), ts: d1.getTime(), w: '185', s: '78' },
    { date: locale(d2), iso: iso(d2), ts: d2.getTime(), w: '186', s: '80' }
  ];
  var speedtest = [{ ts: d2.getTime(), date: locale(d2), week: 2, swings: [78, 80, 79], best: 80 }];
  try {
    localStorage.setItem('fairwayfuel', JSON.stringify({
      sex: 'male', goal: 'leanbulk', workout: 'morning', meals: null,
      age: '34', weight: '186', heightFt: '5', heightIn: '11',
      activity: '1.55', freq: 5,
      equip: { bodyweight: true, dumbbell: true, barbell: true, rack: true,
               bench: true, cable: true, machines: true, band: true },
      view: 'dash'
    }));
    localStorage.setItem('ff_onboarded', 'true');
    localStorage.setItem('ff_goalyds', '15');
    localStorage.setItem('ff_start', JSON.stringify(start.toISOString()));
    localStorage.setItem('ff_log', JSON.stringify(log));
    localStorage.setItem('ff_history', JSON.stringify([hist(1, log['1|' + dayName]), hist(2, log['2|' + dayName])]));
    localStorage.setItem('ff_body', JSON.stringify(body));
    localStorage.setItem('ff_speedtest', JSON.stringify(speedtest));
  } catch (e) {}
}

/** Registry for CLI use (smoke.mjs --seed <name>). */
export const SEEDS = { fresh: seedFresh, onboarded: seedOnboarded, active: seedActive };
