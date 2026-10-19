(() => {
  'use strict';
  const section = document.querySelector('.technical');
  const heading = section?.querySelector('.technical-heading');
  const grid = section?.querySelector('.technical-grid');
  if (!section || !heading || !grid) return;
  const cards = [...grid.children];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
  const stage = document.createElement('div');
  stage.className = 'technical-stage';
  section.append(stage);
  stage.append(heading, grid);
  section.classList.add('technical-sequence');
  let frame = 0;
  let height = 1;
  let travel = 1;
  let cardTravel = 1;

  function render() {
    frame = 0;
    if (reduced.matches) {
      heading.style.removeProperty('opacity');
      heading.style.removeProperty('transform');
      cards.forEach(card => {
        card.style.removeProperty('opacity');
        card.style.removeProperty('transform');
      });
      section.dataset.technicalPhase = 'static';
      return;
    }
    const top = section.getBoundingClientRect().top;
    const arrival = smooth((height * .85 - top) / (height * .55));
    const progress = clamp(-top / travel);
    const step = Math.min(cards.length - 1, Math.floor(progress * cards.length));
    const blend = step === cards.length - 1 ? 0 : smooth((progress * cards.length - step - .65) / .35);
    heading.style.opacity = arrival.toFixed(4);
    heading.style.transform = `translate3d(${(-38 * (1 - arrival)).toFixed(2)}px,0,0)`;
    cards.forEach((card, index) => {
      const outgoing = index === step;
      const incoming = index === step + 1;
      const visibility = outgoing ? 1 - blend : incoming ? blend : 0;
      const y = outgoing ? -blend : incoming ? 1 - blend : index < step ? -1 : 1;
      card.style.opacity = (visibility * arrival).toFixed(4);
      card.style.transform = `translate3d(0,${(y * cardTravel).toFixed(2)}px,0)`;
    });
    section.dataset.technicalProgress = progress.toFixed(4);
    section.dataset.technicalCard = String(step + 1);
    section.dataset.technicalPhase = top > 0 ? 'entering' : progress >= 1 ? 'complete' : 'playing';
  }
  function requestRender() { if (!frame) frame = requestAnimationFrame(render); }
  function measure() {
    height = stage.clientHeight;
    travel = Math.max(1, section.offsetHeight - height);
    cardTravel = Math.min(grid.clientHeight * .9, grid.clientWidth * 1.15);
    requestRender();
  }
  addEventListener('scroll', requestRender, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('load', measure, { once: true });
  reduced.addEventListener('change', measure);
  measure();
})();
