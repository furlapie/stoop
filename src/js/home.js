(function () {
  'use strict';
  const home = document.getElementById('home');
  if (!home) return;
  const bg = document.getElementById('bg');

  const blurs = document.querySelectorAll('.sg-top-blur');
  const BLUR_FADE_AT = 150;
  
  function updateBlurOpacity() {
    if (document.body.classList.contains('is-zooming')) {
      blurs.forEach(el => { el.style.opacity = '0'; });
      return;
    }
    const p = Math.min(1, window.scrollY / BLUR_FADE_AT);
    blurs.forEach(el => { el.style.opacity = String(p); });
  }
  
  window.addEventListener('scroll', updateBlurOpacity, { passive: true });
  updateBlurOpacity();

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR_OPEN  = reduced ? 0 : 1300;
  const DUR_CLOSE = reduced ? 0 : 1100;

  const back = document.getElementById('product-back');
  const panel = document.getElementById('product-panel');
  const panelName = document.getElementById('pp-name');
  const panelPrice = document.getElementById('pp-price');
  const capsule = document.getElementById('capsule');
  const imgToggles = panel.querySelectorAll('.img-toggle');
  const payOverlay = document.getElementById('step-pay');
  const qrEl = document.getElementById('qr');
  const qrNoteEl = document.getElementById('qr-note');
  
  // Riferimenti al Pay Overlay
  const summaryName = document.getElementById('summary-name');
  const summaryPrice = document.getElementById('summary-price');
  const backToSizeBtn = document.getElementById('back');

  const cam = { tx: 0, ty: 0, s: 1 };
  let activeCard = null;
  let activeSize = null;
  let activePrice = 0;
  let activeName = '';
  let activePaypal = '';
  let activeRevolut = '';
  let activeCurrency = 'EUR';
  let activeRevolutPrefill = false;
  let isAnimating = false;
  let savedScroll = 0;
  let currentScroll = window.scrollY;
  let panelRevealTimeout;

  const easeIO = (t) => t < 0.5 ? 8*t*t*t*t : 1 - Math.pow(-2*t+2, 4)/2;

  function updateBgTransform() {
    if (!bg) return;
    const idle = cam.s === 1 && !cam.tx && !cam.ty;
    if (idle) {
      bg.style.transform = `translate3d(0, ${-currentScroll}px, 0)`;
    } else {
      bg.style.transform = `translate3d(${cam.tx.toFixed(2)}px, ${(cam.ty - currentScroll).toFixed(2)}px, 0) scale(${cam.s.toFixed(4)})`;
    }
  }

  function setCam() {
    const idle = cam.s === 1 && !cam.tx && !cam.ty;
    home.style.transform = idle ? '' : `translate3d(${cam.tx.toFixed(2)}px,${cam.ty.toFixed(2)}px,0) scale(${cam.s.toFixed(4)})`;
    updateBgTransform();
  }

  window.addEventListener('scroll', () => {
    if (document.body.classList.contains('is-zooming')) return;
    currentScroll = window.scrollY;
    updateBgTransform();
  }, { passive: true });

  function flyTo(to, ms, done) {
    const from = { ...cam };
    if (!ms) { Object.assign(cam, to); setCam(); if (done) done(); return; }
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / ms, 1);
      const k = easeIO(p);
      cam.tx = from.tx + (to.tx - from.tx) * k;
      cam.ty = from.ty + (to.ty - from.ty) * k;
      cam.s = from.s + (to.s - from.s) * k;
      setCam();
      if (p < 1) requestAnimationFrame(step);
      else { Object.assign(cam, to); setCam(); done && done(); }
    })(t0);
  }

  function lockScroll(on) {
    const b = document.body.style;
    if (on) {
      savedScroll = window.scrollY;
      b.position = 'fixed';
      b.top = `-${savedScroll}px`;
      b.left = '0';
      b.right = '0';
      b.width = '100%';
      currentScroll = savedScroll;
    } else {
      b.position = b.top = b.left = b.right = b.width = '';
      window.scrollTo(0, savedScroll);
      currentScroll = savedScroll;
    }
  }

  function computeZoomTarget(card, homeRect) {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 768;
    const headerH = isMobile ? 90 : 130;
    const panelH = isMobile ? 200 : 220;
    const availH = vh - headerH - panelH;

    const img = card.querySelector('.card-img');
    const r = img.getBoundingClientRect();
    const cx = r.left + r.width / 2 - homeRect.left;
    const cy = r.top + r.height / 2 - homeRect.top;

    const sW = (vw * (isMobile ? 0.9 : 0.55)) / r.width;
    const sH = (availH * 0.92) / r.height;
    const s = Math.min(sW, sH);

    const targetCx = vw / 2;
    const targetCy = headerH + availH / 2;

    const tx = targetCx - homeRect.left - s * cx;
    const ty = targetCy - homeRect.top - s * cy;

    return { tx, ty, s };
  }

  function openProduct(card) {
    if (isAnimating || activeCard) return;
    isAnimating = true;

    activeCard = card;
    activeSize = null;
    activePrice = parseFloat(card.dataset.price);
    activeName = card.dataset.name;
    activePaypal = card.dataset.paypal;
    activeRevolut = card.dataset.revolut;
    activeCurrency = card.dataset.currency;
    activeRevolutPrefill = card.dataset.revolutPrefill === 'true';

    card.classList.remove('is-showing-back');
    imgToggles.forEach((b) => b.classList.toggle('on', b.dataset.img === '0'));

    card.classList.add('is-active-product');
    home.classList.add('is-zooming');
    document.body.classList.add('is-zooming');
    lockScroll(true);

    const target = computeZoomTarget(card, home.getBoundingClientRect());
    flyTo(target, DUR_OPEN);

    clearTimeout(panelRevealTimeout);
    panelRevealTimeout = setTimeout(() => {
      if (!activeCard) return;
      populatePanel();
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('is-visible'));
      isAnimating = false; 
    }, 450);
  }

  function populatePanel() {
    panelName.textContent = activeName.toUpperCase();
    panelPrice.innerHTML = `<span class="euro-italic">€</span> ${activePrice}`;
    renderSizes();
  }

  function renderSizes() {
    let sizes;
    try { sizes = JSON.parse(activeCard.dataset.sizes); } catch (e) { sizes = {}; }
    const keys = Object.keys(sizes);
    const html = keys.map((size) => {
      const qty = sizes[size];
      const label = size === 'OneSize' ? 'UNICA' : size;
      const cls = size === 'OneSize' ? 'sz sz-small' : 'sz';
      return `<button class="size" data-size="${size}" ${qty === 0 ? 'disabled' : ''}>
        <span class="${cls}">${label}</span>
        <span class="qty">${qty === 0 ? '—' : qty + ' pz'}</span>
      </button>`;
    }).join('');
    capsule.innerHTML = html + `<button id="next" class="primary" disabled>AVANTI</button>`;

    capsule.querySelectorAll('.size').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        capsule.querySelectorAll('.size').forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
        activeSize = btn.dataset.size;
        document.getElementById('next').disabled = false;
      });
    });
    document.getElementById('next').addEventListener('click', onNext);
  }

  function closeProduct() {
    if (!activeCard || isAnimating) return;
    isAnimating = true;

    clearTimeout(panelRevealTimeout);
    payOverlay.hidden = true;
    panel.classList.remove('is-visible');
    home.classList.remove('is-zooming');
    document.body.classList.remove('is-zooming');

    flyTo({ tx: 0, ty: 0, s: 1 }, DUR_CLOSE, () => {
      if (activeCard) {
        activeCard.classList.remove('is-active-product');
        activeCard.classList.remove('is-showing-back');
      }
      activeCard = null;
      panel.hidden = true;
      lockScroll(false);
      isAnimating = false;
      history.replaceState(null, '', '/');
      updateBlurOpacity();
    });
  }

  back.addEventListener('click', (e) => {
    e.preventDefault();
    closeProduct();
  });

  imgToggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!activeCard) return;
      const idx = parseInt(btn.dataset.img, 10);
      activeCard.classList.toggle('is-showing-back', idx === 1);
      imgToggles.forEach((b) => b.classList.toggle('on', parseInt(b.dataset.img, 10) === idx));
    });
  });

  // --- GESTIONE PAY OVERLAY ---
  function onNext() {
    const sizeLabel = activeSize === 'OneSize' ? 'UNICA' : activeSize;
    summaryName.textContent = `${activeName.toUpperCase()} · ${sizeLabel}`;
    summaryPrice.innerHTML = `<span class="euro-italic">€</span> ${activePrice}`;
    qrEl.innerHTML = '';
    qrNoteEl.textContent = '';
    payOverlay.querySelectorAll('.method').forEach((m) => m.classList.remove('on'));
    payOverlay.hidden = false;
  }

  function closePayOverlay() {
    if (payOverlay.hidden || payOverlay.classList.contains('is-closing')) return;
    payOverlay.classList.add('is-closing');
    setTimeout(() => {
      payOverlay.hidden = true;
      payOverlay.classList.remove('is-closing');
    }, 400); // 400ms = durata dell'animazione CSS
  }
  
  backToSizeBtn.addEventListener('click', closePayOverlay);

  function linkFor(method) {
    if (method === 'paypal') {
      return `https://paypal.me/${activePaypal}/${activePrice.toFixed(2)}${activeCurrency}`;
    }
    let url = `https://revolut.me/${activeRevolut}`;
    if (activeRevolutPrefill) {
      url += `?amount=${Math.round(activePrice * 100)}&currency=${activeCurrency}`;
    }
    return url;
  }

  payOverlay.querySelectorAll('.method').forEach((btn) => {
    btn.addEventListener('click', () => {
      payOverlay.querySelectorAll('.method').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      const method = btn.dataset.method;
      const qr = qrcode(0, 'M');
      qr.addData(linkFor(method));
      qr.make();
      qrEl.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      qrNoteEl.textContent = method === 'paypal'
        ? 'Importo già inserito. Controlla la notifica prima di consegnare.'
        : `Di al cliente di inviare € ${activePrice.toFixed(2).replace('.', ',')}. Controlla la notifica.`;
    });
  });

  home.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      if (isAnimating || activeCard) return;
      openProduct(card);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!payOverlay.hidden) { closePayOverlay(); return; }
      if (activeCard) closeProduct();
    }
  });

  window.addEventListener('resize', () => {
    if (activeCard && !isAnimating) closeProduct();
  });

  const autoSlug = new URLSearchParams(location.search).get('product');
  if (autoSlug) {
    const card = home.querySelector(`.card[data-slug="${autoSlug}"]`);
    if (card) {
      requestAnimationFrame(() => requestAnimationFrame(() => openProduct(card)));
    }
  }
})();