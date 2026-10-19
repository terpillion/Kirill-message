(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 801px)');
  const progress = document.querySelector('.scroll-progress');
  const gallery = document.querySelector('.gallery-section');
  const track = document.querySelector('.gallery-track');
  const parallax = [...document.querySelectorAll('[data-parallax]')].filter(element => !element.closest('.social-collage'));
  const reading = [...document.querySelectorAll('[data-reading]')];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  let viewport = innerHeight;
  let target = scrollY;
  let current = scrollY;
  let frame = 0;
  let lastTime = 0;
  let smoothing = false;

  reading.forEach(block => {
    const text = block.textContent.trim();
    block.setAttribute('aria-label', text);
    block.replaceChildren(...text.split(/\s+/).flatMap((word, index) => {
      const span = document.createElement('span');
      span.className = 'read-word';
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      return index ? [document.createTextNode(' '), span] : [span];
    }));
  });
  const wordGroups = reading.map(block => ({ block, words: [...block.children] }));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    document.querySelectorAll('.moral-grid,.technical-grid,.argument-visuals,.relatives-grid').forEach(group => {
      [...group.children].forEach((element, i) => element.style.setProperty('--delay', `${i % 3 * 90}ms`));
    });
    root.classList.add('js');
  }

  function render() {
    const y = window.scrollY;
    progress.style.transform = `scaleX(${clamp(y / Math.max(1, root.scrollHeight - viewport))})`;
    parallax.forEach(element => {
      if (reducedMotion.matches) { element.style.removeProperty('transform'); return; }
      const rect = element.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > viewport + 300) return;
      const amount = Number(element.dataset.parallax) * (desktop.matches ? 1 : .45);
      const position = clamp((viewport / 2 - (rect.top + rect.height / 2)) / viewport, -1.5, 1.5);
      element.style.transform = `translate3d(0,${(position * amount).toFixed(2)}px,0)`;
    });
    wordGroups.forEach(({ block, words }) => {
      const rect = block.getBoundingClientRect();
      const position = reducedMotion.matches ? 1 : clamp((viewport * .88 - rect.top) / (viewport * .5));
      words.forEach((word, i) => word.style.setProperty('--word-opacity', (.17 + .83 * clamp(position * (words.length + 2) - i)).toFixed(3)));
    });
    if (desktop.matches && !reducedMotion.matches) {
      const rect = gallery.getBoundingClientRect();
      const position = clamp(-rect.top / Math.max(1, rect.height - viewport));
      const overflow = Math.max(0, track.scrollWidth - innerWidth);
      track.style.transform = `translate3d(${-position * overflow}px,0,0)`;
    } else track.style.removeProperty('transform');
  }

  function tick(time) {
    const dt = lastTime ? Math.min(time - lastTime, 64) : 16.67;
    lastTime = time;
    if (smoothing && !reducedMotion.matches) {
      target = clamp(target, 0, Math.max(0, root.scrollHeight - viewport));
      current += (target - current) * (1 - Math.exp(-dt / 95));
      if (Math.abs(target - current) < .6) { current = target; smoothing = false; }
      window.scrollTo(0, current);
    }
    render();
    if (smoothing) frame = requestAnimationFrame(tick);
    else { frame = 0; lastTime = 0; }
  }
  function requestRender() { if (!frame) frame = requestAnimationFrame(tick); }

  window.addEventListener('wheel', event => {
    if (reducedMotion.matches || !desktop.matches || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (!event.cancelable) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport : 1);
    if (!smoothing) current = target = scrollY;
    target = clamp(target + delta, 0, Math.max(0, root.scrollHeight - viewport));
    smoothing = true;
    event.preventDefault();
    requestRender();
  }, { passive: false });

  const release = () => { smoothing = false; target = current = scrollY; requestRender(); };
  window.addEventListener('touchstart', release, { passive: true });
  window.addEventListener('pointerdown', release, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) release();
  });
  window.addEventListener('scroll', () => {
    if (!smoothing) current = target = scrollY;
    requestRender();
  }, { passive: true });
  window.addEventListener('resize', () => { viewport = innerHeight; release(); });
  reducedMotion.addEventListener('change', release);
  desktop.addEventListener('change', release);
  window.addEventListener('load', requestRender);
  requestAnimationFrame(() => { root.classList.add('ready'); requestRender(); });
})();
