/* ==========================================================================
   assets/app.js : builds the page from the SITE object in index.html and
   makes it come alive. You don't need to edit this file.

   What's in here
     1. Safety net (friendly error if the EDIT section has a typo)
     2. Small helpers
     3. Build the page from your words and photos
     4. Little animations (floating hearts, scroll reveal)
     5. The reply card + the Yes / Not yet / No screens
     6. Confetti
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- 1. Safety net ------------------------------------------------ */

  function fail(message) {
    root.classList.add('is-ready');
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText =
      'position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top, 0px));z-index:1000;padding:14px 16px;border-radius:14px;' +
      'background:#fff;color:#7a1020;border:2px solid #d9345a;font:16px/1.4 system-ui,sans-serif;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.25)';
    box.textContent = message;
    document.body.appendChild(box);
  }

  if (typeof SITE === 'undefined') {
    fail('The ✏️ EDIT HERE section in index.html could not be read. This is usually a missing backtick, comma or bracket. ' +
         'Open the browser console (press F12) to see which line.');
    return;
  }

  try {
    start(SITE);
  } catch (err) {
    console.error(err);
    fail('Something in the ✏️ EDIT HERE section is not quite right: ' + err.message);
  }


  function start(S) {

    /* ---------- 2. Helpers ------------------------------------------------- */

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function $(sel, scope) { return (scope || document).querySelector(sel); }
    function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

    function str(v) { return v == null ? '' : String(v).trim(); }
    // "paragraph one\n\nparagraph two"  ->  ["paragraph one", "paragraph two"]
    function paras(v) {
      return str(v).split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
    }
    // one item per line
    function lines(v) { return str(v).split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }

    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text) n.textContent = text;
      return n;
    }

    // Puts text into a node and turns *starred words* into <mark> highlights.
    // (Built with textContent, so nothing you type can break the page.)
    function rich(node, text) {
      String(text).split(/(\*[^*\n]+\*)/).forEach(function (part) {
        if (/^\*[^*\n]+\*$/.test(part)) node.appendChild(el('mark', '', part.slice(1, -1)));
        else if (part) node.appendChild(document.createTextNode(part));
      });
      return node;
    }

    // Fills a node from the SITE text. Empty text hides the node.
    function fill(sel, text, scope) {
      var n = typeof sel === 'string' ? $(sel, scope) : sel;
      if (!n) return null;
      var t = str(text);
      n.textContent = '';
      if (!t) { n.hidden = true; return n; }
      n.hidden = false;
      rich(n, t);
      return n;
    }

    function svg(markup) {
      var t = document.createElement('template');
      t.innerHTML = markup.trim();
      return t.content.firstElementChild;
    }

    var HEART_D = 'M50 85C50 85 6 56 6 30C6 15 17 5 30 5C39 5 46 10 50 18C54 10 61 5 70 5C83 5 94 15 94 30C94 56 50 85 50 85Z';
    function heartSVG(cls, shine) {
      return svg(
        '<svg class="' + cls + '" viewBox="-4 -4 108 98" aria-hidden="true" focusable="false">' +
          '<path d="' + HEART_D + '" fill="currentColor" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>' +
          (shine ? '<path d="M21 28C21.5 20 27 14.5 35 14" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>' : '') +
        '</svg>'
      );
    }
    var CAMERA_SVG =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
        '<path d="M8 15h8l3-5h10l3 5h8a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V18a3 3 0 0 1 3-3z"/>' +
        '<circle cx="24" cy="27" r="7.5"/>' +
      '</svg>';
    var BOX_SVG =
      '<svg class="reply__box" viewBox="0 0 44 44" aria-hidden="true" focusable="false">' +
        '<path class="box" d="M9 8.5C13 7.6 26 7.2 35 8.4C36.6 11 36.4 26 35.6 35C27 36.4 15 36.4 8.6 35.4C7.6 28 7.8 14 9 8.5Z"/>' +
        '<path class="tick" pathLength="100" d="M12 23.5C15.5 26.5 17.5 29.5 19.5 33C23.5 22 30 12 41 5.5"/>' +
      '</svg>';

    // Small seeded random generator, so the floating hearts look the same on every phone.
    function seeded(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }


    /* ---------- 3. Build the page ------------------------------------------ */

    var page = $('#page');

    // --- First screen
    var hero = S.hero || {};
    fill('.hero__eyebrow', hero.eyebrow);
    fill('.hero__line', hero.line);
    fill('.cue__label', hero.scrollHint);
    buildName($('.name'), str(hero.name));

    // "Han ♥ nah": split the name in the middle and put the heart there.
    function buildName(h1, name) {
      h1.textContent = '';
      if (!name) { h1.hidden = true; return; }
      h1.setAttribute('aria-label', name);
      var chars = Array.from(name);
      h1.style.setProperty('--n', Math.max(6, chars.length));   // longer names get smaller type (see style.css)
      if (chars.length < 2) { h1.appendChild(el('span', 'name__half', name)); return; }
      var mid = Math.floor(chars.length / 2);
      var left = el('span', 'name__half name__half--l', chars.slice(0, mid).join(''));
      var right = el('span', 'name__half name__half--r', chars.slice(mid).join(''));
      left.setAttribute('aria-hidden', 'true');
      right.setAttribute('aria-hidden', 'true');
      h1.append(left, heartSVG('name__heart', true), right);
    }

    // --- Your note
    var note = S.note || {};
    var noteParas = paras(note.text);
    if (noteParas.length) {
      fill('#note-title', note.title);
      noteParas.forEach(function (p) { $('.letter__body').appendChild(rich(el('p'), p)); });
      fill('.letter__signoff', note.signoff);
      fill('.letter__sig', note.signature);
      $('#note').hidden = false;
    }

    // --- Photos
    function placeholder(n, message) {
      var ph = el('div', 'ph');
      ph.appendChild(svg(CAMERA_SVG));
      ph.appendChild(el('span', 'ph__title', n ? 'Photo ' + n : 'Photo'));
      ph.appendChild(el('span', 'ph__hint', message || 'Add yours in the EDIT HERE section'));
      return ph;
    }

    function polaroid(item, n) {
      item = item || {};
      var fig = el('figure', 'polaroid');
      var tape = el('span', 'tape');
      tape.setAttribute('aria-hidden', 'true');
      var frame = el('div', 'polaroid__frame');
      var src = str(item.src);

      if (src) {
        var img = new Image();
        img.alt = str(item.alt);
        img.decoding = 'async';
        // Fetch right away but at low priority: the photos download quietly while she reads the
        // note, so they're ready by the time she scrolls to them (even on a slow connection).
        img.fetchPriority = 'low';
        img.style.objectPosition = str(item.focus) || 'center';
        img.addEventListener('load', function () { img.classList.add('is-loaded'); });
        img.addEventListener('error', function () {
          console.warn('[page] Could not load photo: ' + src);
          frame.textContent = '';
          frame.appendChild(placeholder(n, 'Can’t find “' + src + '”. Check the file name.'));
        });
        img.src = src;
        frame.appendChild(img);
      } else {
        frame.appendChild(placeholder(n));
      }

      fig.append(tape, frame);
      var caption = str(item.caption);
      if (caption) fig.appendChild(rich(el('figcaption'), caption));
      else fig.classList.add('polaroid--bare');       // no caption: keep the classic thick polaroid edge
      return fig;
    }

    var photos = S.photos || {};
    var photoItems = Array.isArray(photos.items) ? photos.items : [];
    if (photoItems.length) {
      fill('#photos-title', photos.title);
      photoItems.forEach(function (item, i) {
        var fig = polaroid(item, i + 1);
        fig.classList.add('reveal');
        $('.shots').appendChild(fig);
      });
      $('#photos').hidden = false;
    }

    // --- Reasons
    var reasons = S.reasons || {};
    var reasonLines = lines(reasons.list);
    if (reasonLines.length) {
      fill('#reasons-title', reasons.title);
      reasonLines.forEach(function (text, i) {
        var li = el('li', 'chip reveal');
        li.style.setProperty('--i', i);
        li.append(heartSVG('chip__heart'), rich(el('span'), text));
        $('.chips').appendChild(li);
      });
      $('#reasons').hidden = false;
    }

    // --- The question
    var q = S.question || {};
    fill('.ask__lead', q.lead);
    fill('#ask-q', q.text);
    fill('.ask__hint', q.hint);
    fill('.ask__note', q.note);

    var replies = $('.replies');
    var answers = [
      ['yes',   str(q.yesLabel) || 'Yes'],
      ['maybe', str(q.maybeLabel)],            // empty = this option is left out
      ['no',    str(q.noLabel) || 'No']
    ].filter(function (a) { return a[1]; });

    answers.forEach(function (a) {
      var b = el('button', 'reply');
      b.type = 'button';
      b.dataset.answer = a[0];
      b.setAttribute('aria-pressed', 'false');
      b.append(svg(BOX_SVG), rich(el('span', 'reply__label'), a[1]));
      b.addEventListener('click', function () { choose(a[0], b); });
      replies.appendChild(b);
    });


    /* ---------- 4. Little animations -------------------------------------- */

    // Hearts drifting up behind the first screen and the question.
    function drift(container, count, seed) {
      var rand = seeded(seed);
      for (var i = 0; i < count; i++) {
        var h = heartSVG('fh t' + (1 + (i % 3)));
        h.style.cssText =
          '--x:' + (3 + rand() * 94).toFixed(1) + '%;' +
          '--s:' + (14 + rand() * 24).toFixed(0) + 'px;' +
          '--d:' + (14 + rand() * 11).toFixed(1) + 's;' +
          '--dl:-' + (rand() * 24).toFixed(1) + 's;' +
          '--sway:' + (14 + rand() * 30).toFixed(0) + 'px;' +
          '--r:' + (-26 + rand() * 52).toFixed(0) + 'deg;' +
          '--o:' + (0.4 + rand() * 0.4).toFixed(2);
        container.appendChild(h);
      }
    }
    var fields = $$('.hearts');
    if (fields[0]) drift(fields[0], 12, 7);
    if (fields[1]) drift(fields[1], 9, 21);

    if ('IntersectionObserver' in window) {
      // pause the drifting hearts when they're off screen (saves battery)
      var pauser = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); });
      });
      fields.forEach(function (f) { pauser.observe(f); });

      // fade things in as you scroll to them
      var reveal = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
      $$('.reveal').forEach(function (n) { reveal.observe(n); });
    } else {
      $$('.reveal').forEach(function (n) { n.classList.add('in'); });
    }

    // "scroll down" goes to the first section after the hero
    $('.cue').addEventListener('click', function () {
      var next = $$('#page > section').filter(function (s) { return !s.hidden; })[0];
      if (next) next.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });

    // The opening animation waits for the fonts, so the name doesn't pop in twice.
    var fontsReady = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load('700 1em DynaPuff'), document.fonts.load('600 1em Caveat')]).catch(function () {})
      : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1600); })])
      .then(function () { root.classList.add('is-ready'); });

    // Tint Safari's toolbar to match the page.
    var themeMeta = $('meta[name="theme-color"]');
    var paper = getComputedStyle(root).getPropertyValue('--paper').trim();
    if (themeMeta && paper) themeMeta.setAttribute('content', paper);


    /* ---------- 5. Reply card and answer screens --------------------------- */

    var PICK_DELAY = 950;                    // a beat to see the tick (and to change your mind)
    var pending = null, timer = 0, current = null, lastFocus = null;

    function choose(key, btn) {
      if (current) return;
      if (pending === btn) { cancelPick(); return; }          // tap the ticked box again to un-tick
      cancelPick();
      pending = btn;
      btn.setAttribute('aria-pressed', 'true');
      replies.dataset.picked = key;
      timer = window.setTimeout(function () { openScreen(key, btn); }, PICK_DELAY);
    }

    function cancelPick() {
      window.clearTimeout(timer);
      timer = 0;
      if (pending) pending.setAttribute('aria-pressed', 'false');
      pending = null;
      delete replies.dataset.picked;
    }

    var tpl = $('#screen-tpl');
    var screens = {};

    function makeScreen(key, cfg) {
      cfg = cfg || {};
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.id = 'screen-' + key;
      node.dataset.key = key;
      node.classList.add('screen--' + key);

      var title = $('.screen__title', node);
      title.id = 'screen-' + key + '-title';
      node.setAttribute('aria-labelledby', title.id);
      fill(title, cfg.title);

      var icon = $('.screen__icon', node);
      if (key === 'yes') {
        icon.appendChild(heartSVG('screen__heart', true));
      } else if (str(cfg.emoji)) {
        icon.className = 'screen__emoji';
        icon.textContent = str(cfg.emoji);
      } else {
        icon.hidden = true;
      }

      var text = $('.screen__text', node);
      paras(cfg.text).forEach(function (p) { text.appendChild(rich(el('p'), p)); });
      if (!text.children.length) text.hidden = true;

      var actions = $('.screen__actions', node);
      if (key === 'yes') {
        fill($('.screen__hint', node), cfg.hint);
        if (cfg.photo) $('.screen__photo', node).appendChild(polaroid(cfg.photo, 0));
      } else {
        var back = el('button', 'btn btn--ghost', str(cfg.backLabel) || 'Go back');
        back.type = 'button';
        back.addEventListener('click', closeScreen);
        actions.appendChild(back);
      }

      document.body.appendChild(node);
      return node;
    }

    screens.yes = makeScreen('yes', S.yes);
    if (answers.some(function (a) { return a[0] === 'maybe'; })) screens.maybe = makeScreen('maybe', S.maybe);
    screens.no = makeScreen('no', S.no);

    // tap anywhere on the Yes screen for a little shower of hearts
    screens.yes.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button')) return;
      confetti.pop(e.clientX, e.clientY);
    });

    // `trigger` is the answer that was ticked. Safari doesn't focus buttons on tap, so we
    // remember it ourselves and hand focus back to it when the screen closes.
    function openScreen(key, trigger) {
      var s = screens[key];
      if (!s || current) return;
      lastFocus = trigger || document.activeElement;
      current = s;
      page.inert = true;
      root.classList.add('screen-open');
      s.hidden = false;
      s.scrollTop = 0;
      void s.offsetWidth;                    // make sure the fade starts from the beginning
      s.classList.add('is-open');
      $('.screen__title', s).focus({ preventScroll: true });
      if (key === 'yes') confetti.celebrate(trigger ? trigger.getBoundingClientRect() : null);
    }

    function closeScreen() {
      if (!current) return;
      current.classList.remove('is-open');
      current.hidden = true;
      current = null;
      page.inert = false;
      root.classList.remove('screen-open');
      confetti.clear();
      cancelPick();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current && current.dataset.key !== 'yes') closeScreen();
    });


    /* ---------- 6. Confetti ------------------------------------------------- */

    var confetti = (function () {
      var cv = $('#confetti');
      var ctx = cv.getContext('2d');
      var heartPath = new Path2D(HEART_D);
      var W = 0, H = 0, dpr = 1;
      var parts = [], raf = 0, last = 0, rainUntil = 0, rainDebt = 0;
      var palette = [], heartColors = [];
      var GRAVITY = 1100;

      function rnd(a, b) { return a + Math.random() * (b - a); }
      function pick(list) { return list[(Math.random() * list.length) | 0]; }

      function readColors() {
        var cs = getComputedStyle(root);
        function v(n) { return cs.getPropertyValue(n).trim(); }
        heartColors = [v('--berry'), v('--berry'), v('--berry'), '#ffffff', v('--butter')];
        palette = [v('--berry'), v('--butter'), v('--sky'), v('--lilac'), '#ffffff', v('--ink')];
        heartColors = heartColors.filter(Boolean);
        palette = palette.filter(Boolean);
      }

      function fit() {
        var w = cv.clientWidth, h = cv.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
        if (w !== W || h !== H || d !== dpr) {
          W = w; H = h; dpr = d;
          cv.width = Math.round(W * dpr);
          cv.height = Math.round(H * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function add(x, y, vx, vy, kind) {
        var isHeart = kind === 'heart';
        parts.push({
          x: x, y: y, vx: vx, vy: vy, kind: kind,
          size: isHeart ? rnd(11, 21) : kind === 'dot' ? rnd(4, 7.5) : rnd(10, 15),
          color: isHeart ? pick(heartColors) : pick(palette),
          drag: isHeart ? rnd(2.9, 3.7) : rnd(2.2, 3.1),
          spin: rnd(0, 6.28), spinRate: rnd(3, 9),
          ph: rnd(0, 6.28), wf: rnd(2.5, 6), wa: rnd(14, 44)
        });
      }

      function burst(x, y, o) {
        for (var i = 0; i < o.n; i++) {
          var a = o.angle + (Math.random() - 0.5) * o.spread;
          var v = o.speed * rnd(0.5, 1.15);
          add(x, y, Math.cos(a) * v, Math.sin(a) * v, pick(o.kinds));
        }
        kick();
      }

      function draw(p, t) {
        var fadeStart = H - 140;
        ctx.globalAlpha = p.y > fadeStart ? Math.max(0, (H - p.y) / 140) : 1;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.kind === 'heart') {
          ctx.rotate(Math.sin(p.ph + t * p.wf * 0.5) * 0.55);
          var s = p.size / 90;
          ctx.scale(s, s);
          ctx.translate(-50, -45);
          ctx.fill(heartPath);
          ctx.lineWidth = 6;
          ctx.strokeStyle = p.color;
          ctx.lineJoin = 'round';
          ctx.stroke(heartPath);
        } else if (p.kind === 'dot') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, 6.2832);
          ctx.fill();
        } else {
          ctx.rotate(p.spin + t * p.spinRate * 0.35);
          ctx.scale(1, Math.cos(p.spin + t * p.spinRate));       // ribbons flip as they fall
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      function frame(now) {
        var dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        var t = now / 1000;
        fit();
        ctx.clearRect(0, 0, W, H);

        if (rainUntil > now) {                                    // gentle hearts falling from the top
          rainDebt += dt * 17;
          while (rainDebt >= 1) {
            rainDebt -= 1;
            add(rnd(0, W), -20, rnd(-30, 30), rnd(40, 140), Math.random() < 0.62 ? 'heart' : pick(['dot', 'ribbon']));
          }
        }

        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.vx -= p.vx * p.drag * dt;
          p.vy += (GRAVITY - p.vy * p.drag) * dt;
          p.x += (p.vx + Math.sin(p.ph + t * p.wf) * p.wa) * dt;
          p.y += p.vy * dt;
          if (p.y > H + 30) { parts.splice(i, 1); continue; }
          draw(p, t);
        }
        ctx.globalAlpha = 1;

        if (parts.length || rainUntil > now) {
          raf = requestAnimationFrame(frame);
        } else {
          raf = 0;
          ctx.clearRect(0, 0, W, H);
        }
      }

      function kick() {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }

      return {
        // the big moment: a pop from the button you tapped, two cannons, then a hearts shower
        celebrate: function (origin) {
          if (reduceMotion.matches) return;
          readColors();
          fit();
          var cx = origin ? origin.left + origin.width / 2 : W / 2;
          var cy = origin ? origin.top + origin.height / 2 : H * 0.6;
          var kinds = ['heart', 'heart', 'dot', 'ribbon'];
          burst(cx, cy, { n: 48, angle: -Math.PI / 2, spread: Math.PI * 1.3, speed: 950, kinds: kinds });
          burst(W * 0.03, H * 0.96, { n: 46, angle: -1.12, spread: 0.85, speed: 1650, kinds: kinds });
          burst(W * 0.97, H * 0.96, { n: 46, angle: -Math.PI + 1.12, spread: 0.85, speed: 1650, kinds: kinds });
          window.setTimeout(function () {
            burst(W * 0.03, H * 0.96, { n: 26, angle: -1.0, spread: 0.8, speed: 1450, kinds: kinds });
            burst(W * 0.97, H * 0.96, { n: 26, angle: -Math.PI + 1.0, spread: 0.8, speed: 1450, kinds: kinds });
          }, 260);
          rainUntil = performance.now() + 4200;
          kick();
        },
        // tap anywhere: a small shower of hearts
        pop: function (x, y) {
          if (reduceMotion.matches) return;
          if (!heartColors.length) readColors();
          fit();
          burst(x, y, { n: 12, angle: -Math.PI / 2, spread: Math.PI * 1.1, speed: 560, kinds: ['heart'] });
        },
        clear: function () {
          parts.length = 0;
          rainUntil = 0;
        }
      };
    })();
  }
})();
