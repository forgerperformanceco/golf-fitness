  /* ===================== ICONS — inline SVG chrome iconography ===================== */
  // One consistent 2px-stroke set replaces OS emoji in the app CHROME (tab bar,
  // headers, buttons, chips). Coach copy keeps its emoji — personality lives in
  // the words, not the controls. Icons draw with currentColor, so they inherit
  // text color and theme for free. 24-unit grid, round caps/joins.
  var FF_ICONS = {
    barbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11M1.5 12h2M20.5 12h2"/>',
    dumbbell: '<path d="M8 6.5v11M16 6.5v11M5 9v6M19 9v6M8 12h8"/>',
    bolt: '<path d="M13 2 4.5 13.5H11L9.5 22 18 10.5h-6.5z"/>',
    rotate: '<path d="M20.5 12a8.5 8.5 0 1 1-3-6.48"/><path d="M21 2.5V7h-4.5"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    gauge: '<path d="M12 14.5 15.5 10"/><path d="M3.8 19.2a10 10 0 1 1 16.4 0"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    share: '<path d="M12 14.5V3.5"/><path d="M8.5 6.5 12 3l3.5 3.5"/><path d="M7 10.5H5.5A1.5 1.5 0 0 0 4 12v7a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-7a1.5 1.5 0 0 0-1.5-1.5H17"/>',
    history: '<path d="M4.5 5.5V10H9"/><path d="M4.8 14a8 8 0 1 0 .7-6.5L4.5 10"/><path d="M12 8v4.5l3 2"/>',
    swap: '<path d="M4 8h13.5"/><path d="m14.5 4.5 3.5 3.5-3.5 3.5"/><path d="M20 16H6.5"/><path d="M9.5 12.5 6 16l3.5 3.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.75" r="1" fill="currentColor" stroke="none"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10.5h16"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3 1.072-2.143 2.224-3.095 4-4 0 4.5 6 5.5 6 10a6 6 0 0 1-12 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  };

  // Context-correct escaping for any user/cloud supplied value rendered into
  // generated markup. Prefer textContent when constructing nodes directly.
  function ffEsc(value){
    return String(value==null?"":value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function ffAttr(value){ return ffEsc(value); }
  function ffIcon(name, size, cls){
    var d=FF_ICONS[name]; if(!d) return "";
    var s=size||16;
    return '<svg class="ffi'+(cls?' '+cls:'')+'" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" '+
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  }
  // The purpose tag per exercise (strength / mass / power / rotation) as an icon.
  // purposeFor() still returns its emoji token — logic elsewhere compares on it —
  // this is only the render mapping.
  var FF_PURPOSE_ICON = { "🏋️":"barbell", "💪":"dumbbell", "⚡":"bolt", "🌀":"rotate" };
  function ffPurposeIc(name, size){
    return ffIcon(FF_PURPOSE_ICON[purposeFor(name)]||"dumbbell", size||15, "ffi-purpose");
  }
