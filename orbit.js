(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };

  // All six photographs share one clock: one full turn, then a soft landing.
  function sampleOrbit(progress, index, count, geometry) {
    const p = clamp(progress);
    const flight = smooth((p - .07) / .65);
    const landing = smooth((p - .72) / .28);
    const angle = -Math.PI / 2 + index * TAU / count + flight * TAU;
    const x = geometry.cx + Math.cos(angle) * geometry.rx;
    const y = geometry.cy + Math.sin(angle) * geometry.ry;
    return {
      x: (x - geometry.homeX) * (1 - landing),
      y: (y - geometry.homeY) * (1 - landing),
      scale: geometry.flightScale + (1 - geometry.flightScale) * landing,
      rotate: Math.sin(angle) * 9 * (1 - landing),
      opacity: smooth(p / .07),
      angle,
      landing,
    };
  }

  function sampleTransition(distance, unit, coverScale) {
    const orbitEnd = 1.55 * unit;
    const zoomStart = 1.67 * unit;
    const zoomEnd = 2.72 * unit;
    const end = 3.10 * unit;
    const zoom = clamp((distance - zoomStart) / (zoomEnd - zoomStart));
    const approach = smooth(zoom);
    const next = smooth((distance - zoomEnd) / (end - zoomEnd));
    return {
      orbit: clamp(distance / orbitEnd),
      zoom,
      approach,
      scale: Math.exp(Math.log(Math.max(1, coverScale * 1.8)) * approach),
      shade: smooth((zoom - .42) / .52),
      next,
      active: distance > zoomStart && distance < end,
      finished: distance >= end,
    };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { sampleOrbit, sampleTransition };
    return;
  }

  const section = document.querySelector('.social');
  const collage = section?.querySelector('.social-collage');
  if (!collage || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...collage.querySelectorAll('figure')];
  const nextBlock = section.nextElementSibling;
  if (!nextBlock?.classList.contains('sanctions-intro')) return;
  const runway = document.createElement('div');
  runway.className = 'orbit-runway';
  collage.before(runway);
  runway.append(collage);
  section.classList.add('social-orbit');

  const baseAngles = cards.map(card => parseFloat(getComputedStyle(card).rotate) || 0);
  const targetIndex = cards.findIndex(card => card.classList.contains('social-b'));
  const cinema = document.createElement('div');
  cinema.className = 'orbit-cinema';
  cinema.setAttribute('aria-hidden', 'true');
  cinema.setAttribute('inert', '');
  const world = document.createElement('div');
  world.className = 'orbit-cinema-world';
  const cinemaPhotos = cards.map((card, index) => {
    const photo = document.createElement('figure');
    photo.className = 'orbit-cinema-photo';
    photo.style.zIndex = index === targetIndex ? '10' : card.classList.contains('social-c') ? '2' : '1';
    const image = card.querySelector('img').cloneNode();
    image.alt = '';
    photo.append(image);
    world.append(photo);
    return photo;
  });
  const shade = document.createElement('div');
  shade.className = 'orbit-cinema-shade';
  const nextPanel = nextBlock.cloneNode(true);
  nextPanel.classList.add('orbit-next-panel');
  nextPanel.removeAttribute('aria-labelledby');
  [nextPanel, ...nextPanel.querySelectorAll('[id]')].forEach(element => element.removeAttribute('id'));
  cinema.append(world, shade, nextPanel);
  document.body.append(cinema);
  nextBlock.classList.add('orbit-next-target');
  cards.forEach(card => {
    card.classList.remove('reveal', 'is-visible');
    card.classList.add('orbit-card');
    card.removeAttribute('data-parallax');
    card.style.removeProperty('transform');
  });

  let geometry = [];
  let stickyTop = 0;
  let travel = 1;
  let unit = 1;
  let cameraTarget = { x: 0, y: 0, cover: 1 };
  let frame = 0;
  let imagesReady = false;
  let failed = false;

  function resetCards() {
    cards.forEach(card => {
      ['translate', 'scale', 'rotate', 'opacity'].forEach(property => card.style.removeProperty(property));
      card.classList.remove('is-flying');
    });
  }

  function measure() {
    const width = collage.clientWidth;
    const height = collage.clientHeight;
    const viewportHeight = document.documentElement.clientHeight;
    const viewportWidth = document.documentElement.clientWidth;
    stickyTop = (viewportHeight - height) / 2;
    section.style.setProperty('--orbit-height', `${height}px`);
    section.style.setProperty('--orbit-top', `${stickyTop}px`);
    travel = Math.max(1, runway.offsetHeight - height);
    unit = travel / 3.10;
    nextBlock.style.setProperty('--orbit-overlap', `${height + stickyTop}px`);
    const flightWidth = width < 600 ? Math.min(112, width * .31) : Math.min(255, width * .25);
    const scales = cards.map(card => Math.min(.88, flightWidth / card.offsetWidth));
    const largestWidth = Math.max(...cards.map((card, index) => card.offsetWidth * scales[index]));
    const largestHeight = Math.max(...cards.map((card, index) => card.offsetHeight * scales[index]));
    const visibleHeight = Math.min(height, viewportHeight - 36);
    const rx = Math.max(0, (width - largestWidth * 1.22) / 2 - 16);
    const ry = Math.max(0, (visibleHeight - largestHeight * 1.22) / 2 - 16);
    geometry = cards.map((card, index) => ({
      cx: width / 2,
      cy: height / 2,
      rx,
      ry,
      homeX: card.offsetLeft + card.offsetWidth / 2,
      homeY: card.offsetTop + card.offsetHeight / 2,
      flightScale: scales[index],
    }));
    const collageLeft = collage.getBoundingClientRect().left;
    cards.forEach((card, index) => {
      const photo = cinemaPhotos[index];
      photo.style.left = `${collageLeft + card.offsetLeft}px`;
      photo.style.top = `${stickyTop + card.offsetTop}px`;
      photo.style.width = `${card.offsetWidth}px`;
      photo.style.rotate = `${baseAngles[index]}deg`;
    });
    const target = cards[targetIndex];
    cameraTarget = {
      x: collageLeft + target.offsetLeft + target.offsetWidth / 2,
      y: stickyTop + target.offsetTop + target.offsetHeight / 2,
      cover: Math.max(viewportWidth / target.offsetWidth, viewportHeight / target.offsetHeight),
      centerX: viewportWidth / 2,
      centerY: viewportHeight / 2,
    };
    world.style.transformOrigin = `${cameraTarget.x}px ${cameraTarget.y}px`;
    requestRender();
  }

  function render() {
    frame = 0;
    if (failed || reduced.matches) {
      resetCards();
      collage.style.removeProperty('visibility');
      cinema.style.visibility = 'hidden';
      collage.dataset.orbitPhase = 'reduced';
      return;
    }
    const distance = stickyTop - runway.getBoundingClientRect().top;
    const transition = sampleTransition(distance, unit, cameraTarget.cover);
    const progress = transition.orbit;
    const opacityReady = imagesReady ? 1 : 0;
    collage.dataset.orbitProgress = progress.toFixed(4);
    collage.dataset.orbitPhase = progress === 0 ? 'waiting' : progress < .07 ? 'appearing' : progress < .72 ? 'orbiting' : progress < 1 ? 'landing' : 'settled';
    collage.dataset.transitionPhase = transition.finished ? 'next' : transition.next > 0 ? 'revealing-next' : transition.shade === 1 ? 'blackout' : transition.zoom > 0 ? 'zooming' : progress === 1 ? 'holding' : 'orbit';
    collage.dataset.zoomProgress = transition.zoom.toFixed(4);
    cinema.style.visibility = transition.active ? 'visible' : 'hidden';
    collage.style.visibility = transition.zoom > 0 ? 'hidden' : '';
    const tx = (cameraTarget.centerX - cameraTarget.x) * transition.approach;
    const ty = (cameraTarget.centerY - cameraTarget.y) * transition.approach;
    world.style.transform = `translate3d(${tx.toFixed(3)}px,${ty.toFixed(3)}px,0) rotate(${-baseAngles[targetIndex] * transition.approach}deg) scale(${transition.scale.toFixed(5)})`;
    shade.style.opacity = transition.shade.toFixed(4);
    nextPanel.style.opacity = transition.next.toFixed(4);
    nextPanel.style.transform = `translate3d(0,${((1 - transition.next) * 24).toFixed(3)}px,0)`;
    cards.forEach((card, index) => {
      if (progress === 1) {
        ['translate', 'scale', 'rotate', 'opacity'].forEach(property => card.style.removeProperty(property));
        card.classList.remove('is-flying');
        return;
      }
      const pose = sampleOrbit(progress, index, cards.length, geometry[index]);
      card.classList.toggle('is-flying', progress > 0);
      card.style.translate = `${pose.x.toFixed(3)}px ${pose.y.toFixed(3)}px`;
      card.style.scale = pose.scale.toFixed(5);
      card.style.rotate = `${(baseAngles[index] + pose.rotate).toFixed(3)}deg`;
      card.style.opacity = (pose.opacity * opacityReady).toFixed(4);
    });
  }

  function requestRender() { if (!frame) frame = requestAnimationFrame(render); }

  // Decode the whole group together, before revealing any one photograph.
  const preload = () => {
    cards.forEach((card, index) => { card.querySelector('img').loading = 'eager'; cinemaPhotos[index].querySelector('img').loading = 'eager'; });
    Promise.all(cards.map(card => {
      const image = card.querySelector('img');
      return image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
    })).then(() => { imagesReady = true; measure(); });
  };
  const preloader = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    preloader.disconnect();
    preload();
  }, { rootMargin: '1400px 0px' });
  preloader.observe(section);

  function safeMeasure() {
    try { measure(); }
    catch (error) {
      failed = true;
      resetCards();
      section.classList.remove('social-orbit');
      collage.style.removeProperty('visibility');
      nextBlock.classList.remove('orbit-next-target');
      cinema.style.visibility = 'hidden';
      console.error('Could not initialize photo orbit', error);
    }
  }
  addEventListener('scroll', requestRender, { passive: true });
  addEventListener('resize', safeMeasure, { passive: true });
  addEventListener('load', safeMeasure, { once: true });
  reduced.addEventListener('change', () => { resetCards(); safeMeasure(); });
  safeMeasure();
})();
