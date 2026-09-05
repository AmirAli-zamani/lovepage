(() => {
  'use strict';
  const opening = document.querySelector('.opening');
  const desk = document.querySelector('.letter-desk');
  const pages = [...document.querySelectorAll('.letter-page')];
  const toggle = document.querySelector('.motion-toggle');
  if (!opening || !desk || !pages.length || !toggle) return;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const indexLinks = [...document.querySelectorAll('.page-index a')];
  const status = document.querySelector('.reading-status');
  const animations = new Set();
  const easing = 'cubic-bezier(.22, 1, .36, 1)';
  let paused = preference.matches;
  let current = -1;
  let busy = false;
  let queued = null;

  const animate = (element, frames, options) => {
    if (paused || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, {easing, ...options});
    animations.add(animation);
    return animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  };
  const applyMotion = () => {
    document.body.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? toggle.dataset.resume : toggle.dataset.pause);
    toggle.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
    if (paused) animations.forEach(animation => animation.finish());
  };
  toggle.addEventListener('click', () => { paused = !paused; applyMotion(); });
  preference.addEventListener('change', event => { paused = event.matches; applyMotion(); });
  applyMotion();

  const targetFromHash = () => pages.findIndex(page => `#${page.id}` === location.hash);
  const reveal = page => {
    page.querySelectorAll('.reveal').forEach((element, index) => {
      void animate(element, [
        {opacity: 0, transform: 'translateY(13px)', filter: 'blur(3px)'},
        {opacity: 1, transform: 'translateY(0)', filter: 'blur(0)'}
      ], {duration: 1200, delay: Math.min(index * 115, 650), fill: 'backwards'});
    });
  };
  const show = (target, focus = true) => {
    opening.hidden = target !== -1;
    desk.hidden = target === -1;
    pages.forEach((page, index) => { page.hidden = index !== target; });
    current = target;
    document.body.dataset.atmosphere = target < 0 ? 'opening' : pages[target].className.match(/atmosphere-(\w+)/)[1];
    indexLinks.forEach((link, index) => {
      if (index === target) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (target >= 0) {
      status.textContent = pages[target].querySelector('.page-kicker').textContent;
      if (focus) pages[target].querySelector('h2').focus({preventScroll: true});
    } else if (focus) document.querySelector('.open-link').focus({preventScroll: true});
  };
  const navigate = async (target, {history = true, motion = true} = {}) => {
    if (busy) { queued = {target, history, motion}; return; }
    if (target === current) return;
    busy = true;
    desk.setAttribute('aria-busy', 'true');
    const previous = current;
    try {
      // Finish any text still entering before turning its sheet.
      animations.forEach(animation => animation.finish());
      if (motion && previous === -1) {
        await Promise.all([
          animate(document.querySelector('.envelope-flap'), [{transform: 'rotateX(0deg)'}, {transform: 'rotateX(165deg)'}], {duration: 950, fill: 'forwards'}),
          animate(document.querySelector('.wax-seal'), [{opacity: 1, transform: 'scale(1)'}, {opacity: 0, transform: 'translateY(12px) scale(.92)'}], {duration: 550, fill: 'forwards'}),
          animate(document.querySelector('.envelope-insert'), [{transform: 'translateY(0)'}, {transform: 'translateY(-38%)'}], {duration: 1100, delay: 240, fill: 'forwards'})
        ]);
      } else if (motion && previous >= 0) {
        const direction = target > previous ? 1 : -1;
        await animate(pages[previous], [
          {opacity: 1, transform: 'rotateY(0deg) translateX(0)'},
          {opacity: 0, transform: `rotateY(${direction * 13}deg) translateX(${direction * 26}px)`}
        ], {duration: 540});
      }
      show(target);
      if (history) window.history.pushState(null, '', target < 0 ? '#home' : `#${pages[target].id}`);
      window.scrollTo({top: 0, behavior: 'instant'});
      if (target >= 0 && motion) {
        reveal(pages[target]);
        await animate(pages[target], [
          {opacity: 0, transform: 'rotateY(-9deg) translateY(12px)'},
          {opacity: 1, transform: 'rotateY(0deg) translateY(0)'}
        ], {duration: 850});
      }
    } finally {
      // Reset the envelope even when revisiting it through browser history.
      document.querySelector('.envelope').getAnimations({subtree: true}).forEach(animation => animation.cancel());
      busy = false;
      desk.setAttribute('aria-busy', 'false');
      if (queued) {
        const next = queued;
        queued = null;
        void navigate(next.target, next);
      }
    }
  };

  pages.forEach((page, index) => {
    page.querySelector('.previous-page').href = index ? `#${pages[index - 1].id}` : '#home';
    page.querySelector('.next-page').href = index < pages.length - 1 ? `#${pages[index + 1].id}` : '#home';
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = pages.findIndex(page => `#${page.id}` === link.hash);
    if (target < 0 && link.hash !== '#home') return;
    event.preventDefault();
    void navigate(target);
  });
  window.addEventListener('hashchange', () => { void navigate(targetFromHash(), {history: false, motion: false}); });

  // Enhance only after handlers are installed; without JS every sheet is readable.
  document.body.classList.add('enhanced');
  toggle.hidden = false;
  document.querySelectorAll('.desk-tools, .page-index, .page-actions').forEach(el => { el.hidden = false; });
  show(targetFromHash(), false);
  const dust = document.querySelector('.dust');
  for (let i = 0; i < 12; i++) {
    const mote = document.createElement('i');
    mote.style.cssText = `--x:${(i * 37 + 11) % 100}%;--y:${(i * 23 + 7) % 100}%;--duration:${18 + i}s;--delay:-${i * 2}s`;
    dust.appendChild(mote);
  }
  document.addEventListener('visibilitychange', () => {
    document.querySelector('.night-room').getAnimations({subtree: true}).forEach(animation => {
      if (document.hidden || paused) animation.pause();
      else animation.play();
    });
  });
})();
