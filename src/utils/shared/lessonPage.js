/**
 * Three things a lesson page does in the browser (BlogPost.astro inlines this
 * file, as a classic script): opens every expander for printing and closes
 * them after; runs the share bars (LessonShare.astro), where the browser's
 * name is read only to say why a PDF needs another browser and is never sent;
 * and marks the lesson read, by its slug, under `nidhi-reading-progress` in the
 * browser's local storage. Nothing here sends anything. Tested in lessonPage.test.ts.
 */
// A printed lesson shows every expander, the glossary and FAQ answer open;
// after printing, the page goes back to how the reader left it. The light
// colours on paper come from BaseLayout.astro, for every page.
(function() {
  var closed = [];
  var saved = document.querySelector('[data-print-saved]');
  window.addEventListener('beforeprint', function() {
    if (saved) saved.textContent = 'Saved on ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '.';
    closed = Array.prototype.filter.call(
      document.querySelectorAll('#post-content details:not([open]), .post-faq details:not([open]), .post-glossary details:not([open])'),
      function(d) { d.open = true; return true; }
    );
  });
  window.addEventListener('afterprint', function() {
    closed.forEach(function(d) { d.open = false; });
    closed = [];
  });
})();

// The share bars (LessonShare.astro). The browser's name is read here only, to
// say why a PDF needs another browser, and is never sent.
(function() {
  var IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|; wv\)/;
  document.querySelectorAll('[data-lesson-share]').forEach(function(bar) {
    var native = bar.querySelector('[data-share-native]');
    var copy = bar.querySelector('[data-share-copy]');
    var save = bar.querySelector('[data-share-save]');
    var status = bar.querySelector('[data-share-status]');
    var address = bar.querySelector('[data-share-address]');
    var timer;

    function copyLink(done, failed) {
      var write = navigator.clipboard && navigator.clipboard.writeText(bar.dataset.copyUrl);
      (write || Promise.reject()).then(done, function() {
        address.hidden = false;
        address.select();
        status.textContent = failed;
      });
    }

    copy.hidden = false;
    save.hidden = false;
    if (navigator.share) {
      native.hidden = false;
      bar.querySelectorAll('[data-share-fallback]').forEach(function(link) { link.hidden = true; });
      native.addEventListener('click', function() {
        navigator.share({ title: bar.dataset.title, url: bar.dataset.nativeUrl }).catch(function(err) {
          if (err && err.name === 'AbortError') return;
          copyLink(
            function() { status.textContent = 'Sharing did not open, so the link was copied instead.'; },
            'Sharing did not open. Press and hold the link to copy it.'
          );
        });
      });
    }

    copy.addEventListener('click', function() {
      copyLink(function() {
        copy.textContent = '\u2713 Copied';
        status.textContent = 'Link copied';
        clearTimeout(timer);
        timer = setTimeout(function() {
          copy.textContent = 'Copy link';
          status.textContent = '';
        }, 4000);
      }, 'Could not copy. Press and hold the link to copy it.');
    });

    save.addEventListener('click', function() {
      if (IN_APP.test(navigator.userAgent)) {
        status.textContent = "To save a PDF, first open this page in your phone's browser from the \u2022\u2022\u2022 menu. Or copy the link and paste it there.";
        return;
      }
      status.textContent = 'In the print window, choose Save as PDF. On iPhone: Share, then Save to Files.';
      window.print();
    });
  });
})();

// Auto-mark this post as read
(function() {
  var path = window.location.pathname;
  var slug = path.split('/').filter(Boolean).pop();
  if (!slug) return;
  var key = 'nidhi-reading-progress';
  try {
    var data = JSON.parse(localStorage.getItem(key) || '[]');
    if (data.indexOf(slug) === -1) {
      data.push(slug);
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch(e) {}
})();
