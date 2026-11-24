/**
 * The theme switch (ThemeToggle.astro inlines this file, as a classic script):
 * the three buttons, the saved choice under `nidhi-theme-mode` in the
 * browser's local storage, and the system theme when the choice is "system". Nothing is
 * sent anywhere. Where site data is blocked the choice lasts for the page.
 * Tested in themeToggle.test.ts.
 */
(function() {
  var STORAGE_KEY = 'nidhi-theme-mode';
  var toggle = document.getElementById('theme-toggle');
  // Where site data is blocked, reading or writing the saved choice throws
  // (#346). Each read and the write below is guarded, and the last button
  // pressed is also kept here, for this page only, so the three buttons
  // still work when nothing can be saved.
  var unsaved = null;

  /**
   * The reader's choice. A choice that could not be saved comes first: where
   * writing fails but reading still works, storage holds an older answer
   * than the button just pressed.
   */
  function chosenMode() {
    if (unsaved) return unsaved;
    try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch (e) { return 'system'; }
  }

  function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(mode) {
    if (mode === 'system') {
      document.documentElement.setAttribute('data-theme', getSystemPreference());
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }

  function updateButtons(mode) {
    if (!toggle) return;
    var buttons = toggle.querySelectorAll('.theme-btn');
    buttons.forEach(function(btn) {
      btn.setAttribute('data-active', btn.getAttribute('data-mode') === mode ? 'true' : 'false');
      btn.setAttribute('aria-pressed', btn.getAttribute('data-mode') === mode ? 'true' : 'false');
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    var current = chosenMode();
    if (current === 'system') {
      applyTheme('system');
    }
  });

  // A page brought back by the back or forward button is shown as it was
  // left, so it takes the theme chosen since then (#520).
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) applyTheme(showChosen());
  });

  /** Marks the chosen theme's button and returns the choice. */
  function showChosen() {
    var chosen = chosenMode();
    if (toggle) updateButtons(chosen);
    return chosen;
  }

  if (toggle) {
    showChosen();

    toggle.querySelectorAll('.theme-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.getAttribute('data-mode');
        try {
          localStorage.setItem(STORAGE_KEY, mode);
          unsaved = null;
        } catch (e) {
          // Blocked: the choice lasts for this page.
          unsaved = mode;
        }
        applyTheme(mode);
        updateButtons(mode);
      });
    });
  }
})();
