  /* ===================== DATA MIGRATIONS — the ff_schema ladder =====================
     One device-local version number (ff_schema, deliberately NOT synced — each
     device migrates its own copy) and a run-once ladder that upgrades stored
     shapes at boot. Every future change to a persisted ff_* shape gets a new
     rung here instead of defensive parsing scattered through the app — so a
     user returning after months on an old blob upgrades cleanly, in order.
     Runs before any module reads state (file 005; function decls hoist, so
     lsGet/lsSet/ffISO from later modules are already callable). */
  var FF_SCHEMA = 1;
  function ffMigrate(){
    var v = lsGet("ff_schema", 0) | 0;
    if (v >= FF_SCHEMA) return;

    if (v < 1) {
      // v1 · Locale-proof identity for bodyweight/speed entries.
      // ff_body rows were keyed by toLocaleDateString() strings ("Jul 8, 2026"),
      // which (a) differ between devices set to different languages — duplicate
      // days after a sync merge — and (b) sort alphabetically, not by time.
      // Give every parseable entry a canonical `iso` (YYYY-MM-DD) + `ts`; the
      // pretty `date` string stays for display. Unparseable entries are left
      // as-is (the sync merge falls back to the raw string for those).
      var body = lsGet("ff_body", null);
      if (Array.isArray(body)) {
        var changed = false;
        body.forEach(function(e){
          if (!e || e.iso) return;
          var t = Date.parse(e.date || "");
          if (!isNaN(t)) {
            e.iso = ffISO(new Date(t));
            if (e.ts == null) e.ts = t;
            changed = true;
          }
        });
        if (changed) lsSet("ff_body", body);
      }
    }

    lsSet("ff_schema", FF_SCHEMA);
  }
  try { ffMigrate(); } catch(e){}
