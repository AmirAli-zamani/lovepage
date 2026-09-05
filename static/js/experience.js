(() => {
  'use strict';
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  let paused = preference.matches;
  let revealObserver;
  const applyMotion = () => {
    document.body.classList.toggle('motion-paused', paused);
    document.documentElement.style.scrollBehavior = paused ? 'auto' : '';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume atmospheric motion' : 'Pause atmospheric motion');
    toggle.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
    if (paused && revealObserver) {
      revealObserver.disconnect();
      document.querySelectorAll('.reveal-ready').forEach(el => el.classList.add('is-visible'));
    }
  };
  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; applyMotion(); });
  preference.addEventListener('change', event => { paused = event.matches; applyMotion(); });
  applyMotion();
  if ('IntersectionObserver' in window && !paused) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {threshold: 0.12});
    document.querySelectorAll('.reveal').forEach((el, i) => {
      el.classList.add('reveal-ready');
      el.style.setProperty('--reveal-delay', `${(i % 3) * 85}ms`);
      revealObserver.observe(el);
    });
    // Keyboard and anchor navigation must never land on hidden content.
    document.addEventListener('focusin', event => {
      event.target.closest('.reveal-ready')?.classList.add('is-visible');
    });
  }
  document.querySelectorAll('.chapter').forEach(chapter => {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 14; i++) {
      const particle = document.createElement('span');
      particle.className = `particle${i === 0 ? ' heart' : ''}`;
      particle.setAttribute('aria-hidden', 'true');
      if (i === 0) particle.textContent = '♡';
      particle.style.cssText = `--x:${5 + Math.random() * 90}%;--y:${10 + Math.random() * 80}%;--duration:${8 + Math.random() * 10}s;--delay:-${Math.random() * 15}s`;
      fragment.appendChild(particle);
    }
    chapter.appendChild(fragment);
  });
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.chapter-rail a')];
  const progress = document.querySelector('.reading-progress');
  let scheduled = false;
  const updateReading = () => {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0})`;
    const active = chapters.find(chapter => {
      const rect = chapter.getBoundingClientRect();
      return rect.top <= window.innerHeight * .5 && rect.bottom > window.innerHeight * .5;
    });
    links.forEach(link => {
      if (active && link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    document.body.classList.toggle('night-reading', active?.id === 'life-happened');
    scheduled = false;
  };
  const scheduleUpdate = () => {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateReading); }
  };
  window.addEventListener('scroll', scheduleUpdate, {passive: true});
  window.addEventListener('resize', scheduleUpdate, {passive: true});
  updateReading();
})();
