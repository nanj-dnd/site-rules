// site-rules motion: scroll reveals, header fade, expanding rows, Lenis.
// Reveals start once the web fonts have loaded (or after 1.2s at most), so
// nothing animates in the fallback font and then jumps when the real one lands.
(function () {
  window.__motion = true;
  var root = document.documentElement;
  var reveal = [].slice.call(document.querySelectorAll('[data-reveal]'));
  var ready = false;

  function show(el) { el.setAttribute('data-shown', ''); }
  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.92 && r.bottom > 0;
  }

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    if (!ready) return;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      show(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;

  function start() {
    if (ready) return;
    ready = true;
    root.classList.add('ready');
    // Whatever is already on screen shows now, not on the next scroll event.
    reveal.forEach(function (el) {
      if (!io || inView(el)) { show(el); if (io) io.unobserve(el); }
    });
  }

  if (io) reveal.forEach(function (el) { io.observe(el); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 1200);
  } else {
    start();
  }

  // Expanding rows: <div data-acc> of .acc-item > button.acc-btn + .acc-panel
  document.querySelectorAll('[data-acc] .acc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      btn.parentNode.classList.toggle('open', open);
    });
  });

  // Header fade, written only when the state changes.
  var header = document.querySelector('[data-header]');
  var scrolled = null;
  function onScroll() {
    var s = window.scrollY > 8;
    if (s === scrolled || !header) return;
    scrolled = s;
    header.toggleAttribute('data-scrolled', s);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Eased, inertial scrolling for mouse wheels and trackpads. Touch screens keep
  // their native scroll, and so does anyone who prefers reduced motion.
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.Lenis && !calm) {
    var lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    // In-page links land below the sticky header.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      var target = id.length > 1 && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -(header ? header.offsetHeight : 0) - 8 });
      history.replaceState(null, '', id);
    });
  }
})();
