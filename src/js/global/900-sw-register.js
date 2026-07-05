/* Register the service worker so the app installs to the home screen and works offline.
   Skip it inside the Capacitor native shell (window.Capacitor): there the files are
   already bundled locally, so a SW would only add stale-cache risk after an app update. */
if ('serviceWorker' in navigator && !window.Capacitor) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      // Installed PWAs cache hard — check for a newer version on every launch.
      try { reg.update(); } catch (e) {}
    }).catch(function () {});
    // When a new service worker takes control, reload once so the app picks up the fresh
    // files automatically — but only if we were already controlled (an UPDATE, not the
    // first install) and only once, to avoid reload loops.
    var ffReloaded = false;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (ffReloaded) return; ffReloaded = true;
        window.location.reload();
      });
    }
  });
}
