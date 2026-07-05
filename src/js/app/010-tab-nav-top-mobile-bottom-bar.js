  /* ===================== TAB NAV (top + mobile bottom bar) ===================== */
  var tabs = document.getElementById("tabs");
  var mobileTabs = document.getElementById("mobileTabs");

  // Snapshot whether this is a brand-new user NOW — before init's calc() writes
  // any default targets/profile to localStorage (which would mask a first run).
  var FF_FRESH = !lsGet("ff_onboarded", false)
    && !localStorage.getItem("fairwayfuel")
    && !localStorage.getItem("ff_targets")
    && Object.keys(getLog()).length === 0
    && lsGet("ff_body", []).length === 0
    && !localStorage.getItem("ff_start");
