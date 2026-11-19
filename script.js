(function () {
  'use strict';

  // ===== Helpers =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => '₹' + (Number.isInteger(n) ? n : n.toFixed(2));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '"') return '&quot;';
    if (c === "'") return '&#39;';
    return c;
  });

  // A drawn placeholder so nothing on the page is ever a broken image
  const placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#1c1c1c"/><text x="50%" y="50%" fill="#d89b3c" font-size="24" text-anchor="middle">Image coming soon</text></svg>');

  // Load one dish image: real PNG -> stand-in photo -> placeholder.
  // Set dataset.failed so the global broken-image backstop leaves it alone.
  function loadImage(img, dish, onLoad) {
    let triedStandIn = false;
    img.dataset.failed = 'true';
    img.onload = function () {
      delete img.dataset.failed;
      if (onLoad) onLoad();
    };
    img.onerror = function () {
      if (triedStandIn) {
        img.src = placeholder;
        return;
      }
      triedStandIn = true;
      img.classList.add('standin');
      img.src = dish.standIn;
    };
    img.src = dish.image;
  }

  // Hide the loading screen. Safe to call more than once.
  let loaderDone = false;
  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    const loader = $('#loader');
    if (!loader) return;
    loader.classList.add('done');
    document.body.classList.remove('loading');
    setTimeout(function () {
      try { loader.remove(); } catch (e) {}
    }, 900);
  }

  // ===== Navbar: shrink on scroll + highlight current section =====
  // (Smooth scrolling is handled by CSS: html { scroll-behavior: smooth })
  const navbar = $('.navbar');
  let navbarTicking = false;
  function onScrollNavbar() {
    navbarTicking = false;
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }
  function scheduleNavbar() {
    if (!navbarTicking) {
      navbarTicking = true;
      requestAnimationFrame(onScrollNavbar);
    }
  }
  onScrollNavbar();
  window.addEventListener('scroll', scheduleNavbar, { passive: true });

  const links = $$('.nav-links a[href^="#"]');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  // ===== Order state (saved in the browser so a refresh keeps the order) =====
  let order = [];
  try { order = JSON.parse(localStorage.getItem('emberOakOrder')) || []; } catch (e) { order = []; }
  const save = () => { try { localStorage.setItem('emberOakOrder', JSON.stringify(order)); } catch (e) {} };

  const modal = $('#order-modal');
  const orderItems = $('#order-items');
  const orderTotal = $('#order-total');
  const orderMessage = $('#order-message');
  const cartCount = $('#cart-count');
  const toast = $('#toast');
  let lastFocus = null;
  let toastTimer;

  // Bottom order bar + finale elements
  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const orderBar = $('#order-bar');
  const orderBarPlate = $('#order-bar-plate');
  const orderBarIcon = $('#order-bar-icon');
  const orderBarCount = $('#order-bar-count');
  const orderBarTotal = $('#order-bar-total');
  const finale = $('#finale');
  const finalePlate = $('#finale-plate');
  const finaleItems = $('#finale-items');
  const finaleTotal = $('#finale-total');
  const finalePlace = $('#finale-place');
  const finaleMessage = $('#finale-message');

  function setMessage(text, type) {
    orderMessage.textContent = text;
    orderMessage.className = 'order-message' + (type ? ' ' + type : '');
  }

  function showToast(name) {
    toast.innerHTML = '<b>' + esc(name) + '</b> added to your order';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function updateBadge(bump) {
    const count = order.reduce((sum, item) => sum + item.qty, 0);
    cartCount.textContent = count;
    cartCount.classList.toggle('show', count > 0);
    if (bump) {
      cartCount.classList.remove('bump');
      void cartCount.offsetWidth; // restart animation
      cartCount.classList.add('bump');
    }
  }

  function orderRowsHtml() {
    let total = 0;
    const html = order.map((item, i) => {
      const line = item.price * item.qty;
      total += line;
      return `
      <div class="order-item">
        <img src="${esc(item.image)}" alt="${esc(item.name)}" width="60" height="60" loading="lazy">
        <div class="order-item-info">
          <h4>${esc(item.name)}</h4>
          <span>${money(item.price)} × ${item.qty} = ${money(line)}</span>
        </div>
        <div class="qty-box">
          <button class="qty-btn" data-action="minus" data-index="${i}" aria-label="Decrease ${esc(item.name)}">−</button>
          <strong>${item.qty}</strong>
          <button class="qty-btn" data-action="plus" data-index="${i}" aria-label="Increase ${esc(item.name)}">+</button>
        </div>
        <button class="remove-btn" data-action="remove" data-index="${i}" aria-label="Remove ${esc(item.name)}">Remove</button>
      </div>`;
    }).join('');
    return { html: html, total: total };
  }

  function renderOrder() {
    updateBadge(false);
    save();
    if (order.length === 0) {
      orderItems.innerHTML = '<p class="empty-text">Your order is empty. Add a dish from the menu.</p>';
      orderTotal.textContent = '$0';
      return;
    }
    const r = orderRowsHtml();
    orderItems.innerHTML = r.html;
    orderTotal.textContent = money(r.total);
  }

  // The finale plate shows the same order data as the popup
  function renderFinale() {
    if (order.length === 0) {
      finaleItems.innerHTML = '<p class="finale-empty">Your plate is empty. Scroll back and choose a dish.</p>';
      finaleTotal.textContent = '$0';
      return;
    }
    const r = orderRowsHtml();
    finaleItems.innerHTML = r.html;
    finaleTotal.textContent = money(r.total);
  }

  // Slim bottom bar: count, total, plate icon; only visible when the cart has items
  function updateOrderBar() {
    const count = order.reduce((sum, item) => sum + item.qty, 0);
    const total = order.reduce((sum, item) => sum + item.price * item.qty, 0);
    orderBarCount.textContent = count + (count === 1 ? ' item' : ' items');
    orderBarTotal.textContent = money(total);
    orderBarIcon.src = order.length ? order[order.length - 1].image : placeholder;
    const show = count > 0;
    orderBar.classList.toggle('show', show);
    orderBar.setAttribute('aria-hidden', show ? 'false' : 'true');
    document.body.classList.toggle('has-bar', show);
  }

  // Re-render every place the cart appears
  function refreshAll() {
    renderOrder();
    renderFinale();
    updateOrderBar();
  }

  function pulse(el) {
    el.classList.remove('pulse');
    void el.offsetWidth; // restart animation
    el.classList.add('pulse');
  }

  // Fly a clone of the dish image along a curved path into the bar's plate icon
  function flyToPlate(sourceImg) {
    if (REDUCE_MOTION) return;
    const start = sourceImg.getBoundingClientRect();
    if (!start.width) return;
    const barTop = window.innerHeight - orderBar.offsetHeight;
    const endX = orderBarPlate.offsetLeft + orderBarPlate.offsetWidth / 2;
    const endY = barTop + orderBarPlate.offsetTop + orderBarPlate.offsetHeight / 2;
    const clone = document.createElement('img');
    clone.src = sourceImg.src;
    clone.alt = '';
    clone.style.cssText = 'position:fixed;left:' + start.left + 'px;top:' + start.top + 'px;width:' + start.width + 'px;height:' + start.height + 'px;margin:0;z-index:700;pointer-events:none;object-fit:contain;filter:drop-shadow(0 12px 22px rgba(0,0,0,.5));';
    document.body.appendChild(clone);
    const dx = endX - (start.left + start.width / 2);
    const dy = endY - (start.top + start.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const curve = Math.min(160, dist * 0.3);
    const midX = dx * 0.5 - (dy / dist) * curve;
    const midY = dy * 0.5 + (dx / dist) * curve;
    const anim = clone.animate([
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      { transform: 'translate(' + midX + 'px, ' + midY + 'px) scale(0.6)', opacity: 0.9, offset: 0.55 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(0.12)', opacity: 0 }
    ], { duration: 750, easing: 'cubic-bezier(.4, 0, .2, 1)' });
    anim.onfinish = function () {
      clone.remove();
      pulse(orderBarPlate);
    };
    // Safety: never leave a stray clone behind
    setTimeout(function () { if (clone.parentNode) clone.remove(); }, 1200);
  }

  // ===== Popup =====
  function openModal() {
    lastFocus = document.activeElement;
    setMessage('');
    renderOrder();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#close-modal').focus();
  }
  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function addToOrder(name, price, image, qty = 1, silent = false) {
    const existing = order.find((item) => item.name === name);
    if (existing) existing.qty += qty;
    else order.push({ name, price, image, qty });
    save();
    updateBadge(true);
    if (!silent) showToast(name);
  }

  // ===== Events =====
  // "Order" / "Order Now": open the popup
  $$('.order-btn').forEach((btn) => btn.addEventListener('click', openModal));

  // Bottom bar "View Order" button
  $('#order-bar-view').addEventListener('click', openModal);

  // + / - / Remove inside the popup
  orderItems.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const i = Number(btn.dataset.index);
    if (btn.dataset.action === 'plus') order[i].qty++;
    if (btn.dataset.action === 'minus' && --order[i].qty <= 0) order.splice(i, 1);
    if (btn.dataset.action === 'remove') order.splice(i, 1);
    renderOrder();
  });

  $('#place-order').addEventListener('click', () => {
    if (order.length === 0) return setMessage('Add a dish to your order first.', 'error');
    order = [];
    renderOrder();
    renderFinale();
    updateOrderBar();
    setMessage('Order placed. Thank you!', '');
  });

  $('#close-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') return closeModal();
    if (e.key === 'Tab') { // keep keyboard focus inside the popup
      const f = $$('button', modal).filter((b) => b.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Broken image -> simple placeholder (backstop for anything not managed above)
  document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' && !e.target.dataset.failed) {
      e.target.dataset.failed = 'true';
      e.target.src = placeholder;
    }
  }, true);

  // ===== LOADER: preload every dish image, then hide the loader =====
  (function () {
    const dishes = window.DISHES;
    if (!dishes || !dishes.length) { finishLoader(); return; }
    const fill = $('#loader-fill');
    const pct = $('#loader-pct');
    let ready = 0;
    const total = dishes.length;
    function setProgress() {
      const p = Math.round((ready / total) * 100);
      if (fill) fill.style.width = p + '%';
      if (pct) pct.textContent = 'Lighting the fire… ' + p + '%';
    }
    setProgress();
    dishes.forEach(function (dish) {
      const img = new Image();
      loadImage(img, dish, function () {
        ready++;
        setProgress();
        if (ready >= total) finishLoader();
      });
    });
    // Safety timeout: the loader must never hang forever
    setTimeout(finishLoader, 6000);
  })();

  // ===== HERO: rising embers + floating dish image =====
  (function () {
    const hero = $('#home');
    if (!hero) return;

    // The hero dish is the first dish (real PNG, falling back to standIn)
    const dishImg = $('#hero-dish-img');
    if (dishImg && window.DISHES && window.DISHES.length) {
      loadImage(dishImg, window.DISHES[0]);
    }

    // Embers: skip entirely when the visitor prefers reduced motion
    const canvas = $('#hero-embers');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles = [];
    let rafId = null;
    let running = false;
    let visible = true;

    function makeParticles() {
      const count = window.innerWidth < 800 ? 15 : 40;
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.clientWidth,
          y: Math.random() * canvas.clientHeight,
          r: 1 + Math.random() * 2.2,
          vy: 0.3 + Math.random() * 0.9,
          drift: (Math.random() - 0.5) * 0.3,
          life: Math.random(),
          decay: 0.002 + Math.random() * 0.004
        });
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.vy;
        p.x += p.drift;
        p.life -= p.decay;
        if (p.life <= 0 || p.y < -6) {
          p.x = Math.random() * canvas.clientWidth;
          p.y = canvas.clientHeight + 6;
          p.life = 0.6 + Math.random() * 0.4;
        }
        const alpha = Math.max(0, Math.min(1, p.life));
        const radius = p.r * 4;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grad.addColorStop(0, 'rgba(255, 185, 95, ' + alpha + ')');
        grad.addColorStop(1, 'rgba(255, 90, 31, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      if (!running) return;
      draw();
      rafId = requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      running = true;
      loop();
    }
    function stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    resize();
    makeParticles();
    window.addEventListener('resize', function () {
      resize();
      makeParticles();
    }, { passive: true });

    // Pause while the tab is in the background
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (visible) start();
    });

    // Pause while the hero is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !document.hidden) start();
        else stop();
      }, { threshold: 0.05 }).observe(hero);
    } else {
      start();
    }
  })();

  // ===== LENIS: optional smooth scroll. If the CDN fails, the site still works. =====
  (function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !window.Lenis) return;
    try {
      const lenis = new Lenis({
        duration: 1,
        easing: function (t) { return 1 - Math.pow(1 - t, 3); },
        wheel: true,
        touch: true,
        syncWindowScroll: true
      });
      document.documentElement.classList.add('lenis');
      window.__emberLenis = lenis;
      function raf() {
        lenis.raf(performance.now());
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    } catch (e) {
      // Lenis failed: fall back to native scrolling
    }
  })();

  // ===== PROGRESS BAR: thin line at the top, driven by total page scroll =====
  (function () {
    const progress = $('#progress');
    if (!progress) return;
    let pTicking = false;
    function update() {
      pTicking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.transform = 'scaleX(' + p + ')';
    }
    window.addEventListener('scroll', function () {
      if (!pTicking) {
        pTicking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  })();

  // ===== JOURNEY: build the pinned scroll scene from dishes.js =====
  (function () {
    const html = document.documentElement;
    const dishes = window.DISHES;
    if (!dishes || !dishes.length) { html.classList.add('no-journey'); return; }

    const journey = $('#journey');
    const stage = $('#j-stage');
    const titlesEl = $('#j-titles');
    const dishesEl = $('#j-dishes');
    const infoEl = $('#j-info');
    const countEl = $('#j-count');
    const cueEl = $('#j-cue');
    const dotsEl = $('#j-dots');
    if (!journey || !stage || !titlesEl || !dishesEl || !infoEl || !countEl || !cueEl || !dotsEl) {
      html.classList.add('no-journey');
      return;
    }

    const n = dishes.length;
    html.style.setProperty('--n', n);

    const titles = [];
    const wraps = [];
    const tiltEls = [];
    const shadows = [];
    const cards = [];
    const cardParts = [];
    const dots = [];
    const qty = new Array(n);
    for (let i = 0; i < n; i++) qty[i] = 1;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    dishes.forEach(function (dish, i) {
      // Giant word behind the dish
      const title = document.createElement('div');
      title.className = 'j-title';
      title.textContent = dish.word;
      title.style.setProperty('--len', dish.word.length);
      titlesEl.appendChild(title);
      titles.push(title);

      // The dish image (with fallback chain) inside a tilt wrapper, plus a floor shadow
      const wrap = document.createElement('div');
      wrap.className = 'j-dish-wrap';
      const tiltEl = document.createElement('div');
      tiltEl.className = 'j-dish-tilt';
      const img = document.createElement('img');
      img.className = 'j-dish';
      img.alt = dish.name;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.width = 400;
      img.height = 400;
      loadImage(img, dish);
      tiltEl.appendChild(img);
      wrap.appendChild(tiltEl);
      const shadow = document.createElement('div');
      shadow.className = 'j-shadow';
      wrap.appendChild(shadow);
      dishesEl.appendChild(wrap);
      wraps.push(wrap);
      tiltEls.push(tiltEl);
      shadows.push(shadow);

      // Info panel: tag, name, description, price, quantity, add button
      const card = document.createElement('div');
      card.className = 'j-card';
      card.innerHTML =
        '<div class="j-text">' +
        '<p class="j-tag">' + esc(dish.tag) + '</p>' +
        '<h2>' + esc(dish.name) + '</h2>' +
        '<p class="j-desc">' + esc(dish.desc) + '</p>' +
        '</div>' +
        '<div class="j-buy">' +
        '<p class="j-price">' + money(dish.price) + '</p>' +
        '<div class="j-actions">' +
        '<div class="qty-box">' +
        '<button class="qty-btn" type="button" data-action="minus" aria-label="Decrease ' + esc(dish.name) + '">−</button>' +
        '<span class="j-qty"><strong>1</strong></span>' +
        '<button class="qty-btn" type="button" data-action="plus" aria-label="Increase ' + esc(dish.name) + '">+</button>' +
        '</div>' +
        '<button class="btn j-add" type="button">Add to Order</button>' +
        '</div>' +
        '</div>';
      infoEl.appendChild(card);
      cards.push(card);
      cardParts.push([
        $('.j-tag', card),
        $('h2', card),
        $('.j-desc', card),
        $('.j-buy', card)
      ]);

      // Quantity controls for this card
      const qEl = $('.j-qty strong', card);
      const minusBtn = $('.qty-btn[data-action="minus"]', card);
      const plusBtn = $('.qty-btn[data-action="plus"]', card);
      minusBtn.addEventListener('click', function () {
        qty[i] = Math.max(1, qty[i] - 1);
        qEl.textContent = qty[i];
      });
      plusBtn.addEventListener('click', function () {
        qty[i] = Math.min(20, qty[i] + 1);
        qEl.textContent = qty[i];
      });

      // Add to Order uses the quantity box value
      $('.j-add', card).addEventListener('click', function () {
        const imgEl = wraps[i].querySelector('img.j-dish');
        addToOrder(dish.name, dish.price, imgEl ? imgEl.src : dish.image, qty[i]);
        if (imgEl) flyToPlate(imgEl);
      });

      // Navigation dot
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'j-dot';
      dot.setAttribute('aria-label', 'Go to ' + esc(dish.name));
      dot.addEventListener('click', function () { jumpTo(i); });
      dotsEl.appendChild(dot);
      dots.push(dot);
    });

    // Two blurred warm light streaks in front of the dish (drift faster than it)
    const fg1 = document.createElement('div');
    fg1.className = 'j-fg j-fg-1';
    const fg2 = document.createElement('div');
    fg2.className = 'j-fg j-fg-2';
    stage.appendChild(fg1);
    stage.appendChild(fg2);

    // Floating dust specks tinted with the current glow colour
    const dust = document.createElement('canvas');
    dust.className = 'j-dust';
    dust.setAttribute('aria-hidden', 'true');
    stage.appendChild(dust);

    // Small tag label that flashes when the category changes
    const divider = document.createElement('div');
    divider.className = 'j-divider';
    divider.setAttribute('aria-hidden', 'true');
    stage.appendChild(divider);

    // Ambient state: glow tracking, tilt, dust
    let currentGlow = dishes[0].mood.glow;
    let dominantIndex = 0;
    let tiltX = 0, tiltY = 0, targetTiltX = 0, targetTiltY = 0;
    let lastScrollY = window.scrollY;
    let dustParticles = [];
    let dustW = 0, dustH = 0;
    let dustCtx = null;
    let dustRaf = null;
    let ambientRunning = false;
    let journeyVisible = true;
    let lastDominant = 0;
    let lastTag = dishes[0].tag;
    let dividerTimer = null;

    function wrapMod(v, m) { return ((v % m) + m) % m; }
    function hexToRgb(hex) {
      let h = String(hex).replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      const num = parseInt(h, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }
    // Blend two hex colours by t (0..1) into a hex string
    function lerpColor(a, b, t) {
      const ca = hexToRgb(a);
      const cb = hexToRgb(b);
      const r = Math.round(ca.r + (cb.r - ca.r) * t);
      const g = Math.round(ca.g + (cb.g - ca.g) * t);
      const bl = Math.round(ca.b + (cb.b - ca.b) * t);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
    }
    // Classify a glow colour so cool/green scenes can be styled differently
    function moodClass(glowHex) {
      const c = hexToRgb(glowHex);
      if (c.b > c.r && c.b > c.g) return 'mood-cool';
      if (c.g > c.r && c.g > c.b) return 'mood-green';
      return 'mood-warm';
    }
    // Briefly show the category tag label
    function flashDivider(text) {
      divider.textContent = text;
      divider.classList.add('show');
      clearTimeout(dividerTimer);
      dividerTimer = setTimeout(function () { divider.classList.remove('show'); }, 1300);
    }

    let journeyTop = 0;
    let journeyH = 0;

    function measure() {
      journeyTop = journey.getBoundingClientRect().top + window.scrollY;
      journeyH = journey.offsetHeight - window.innerHeight;
    }
    measure();
    window.addEventListener('resize', function () {
      measure();
      resizeDust();
      makeDust();
      window.requestAnimationFrame(update);
    }, { passive: true });

    function jumpTo(i) {
      const target = journeyTop + (i / (n - 1)) * journeyH;
      const lenis = window.__emberLenis;
      if (lenis && !reduce) lenis.scrollTo(target, { immediate: false });
      else window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    }

    // Scroll engine: map scroll position to a float dish index and cross-fade
    let ticking = false;
    function update() {
      ticking = false;
      const p = journeyH > 0 ? Math.min(1, Math.max(0, (window.scrollY - journeyTop) / journeyH)) : 0;
      const index = p * (n - 1);            // 0 = first dish, n-1 = last dish
      const dominant = Math.min(n - 1, Math.round(index));

      for (let k = 0; k < n; k++) {
        const rel = index - k;              // <0 entering, >0 leaving
        const show = Math.max(0, Math.min(1, 1 - Math.abs(rel)));
        let t, scale, ty;
        if (rel < 0) {                      // entering: rise from below, 0.85 -> 1
          t = Math.max(0, Math.min(1, rel + 1));
          scale = 0.85 + 0.15 * t;
          ty = 60 * (1 - t);
        } else {                            // leaving: grow to 1.1 and drift up
          t = Math.max(0, Math.min(1, rel));
          scale = 1 + 0.1 * t;
          ty = -20 * t;
        }
        const interactive = show > 0.5;
        const vis = show > 0 ? 'visible' : 'hidden';

        wraps[k].style.visibility = vis;
        wraps[k].style.opacity = show;
        wraps[k].style.transform = 'translateY(' + ty + 'px) scale(' + scale + ')';
        wraps[k].style.pointerEvents = interactive ? 'auto' : 'none';

        // contact shadow grows and darkens as the dish settles
        shadows[k].style.transform = 'scale(' + (0.7 + 0.3 * show) + ')';
        shadows[k].style.opacity = 0.25 + 0.55 * show;

        // giant word slides in from the side while the dish scales in
        const wordX = (rel < 0 ? 1 : -1) * (1 - show) * 320;
        titles[k].style.visibility = vis;
        titles[k].style.opacity = show;
        titles[k].style.transform = 'translate(' + wordX + 'px, ' + (ty * 0.4) + 'px)';

        // text card slides up and fades, lines staggered
        cards[k].style.visibility = vis;
        cards[k].style.opacity = show;
        cards[k].style.transform = 'translateY(' + ((1 - show) * 24) + 'px)';
        cards[k].style.pointerEvents = interactive ? 'auto' : 'none';
        const parts = cardParts[k];
        for (let j = 0; j < parts.length; j++) {
          const cp = Math.max(0, Math.min(1, (show - j * 0.1) / 0.7));
          parts[j].style.transform = 'translateY(' + ((1 - cp) * 16) + 'px)';
        }
      }

      // Blend background and glow smoothly between neighbouring dishes (eased)
      const i0 = Math.min(n - 1, Math.floor(index));
      const i1 = Math.min(n - 1, i0 + 1);
      const f = index - i0;
      const eased = f * f * (3 - 2 * f);           // smoothstep easing
      const bgCol = lerpColor(dishes[i0].mood.bg, dishes[i1].mood.bg, eased);
      const glowCol = lerpColor(dishes[i0].mood.glow, dishes[i1].mood.glow, eased);
      stage.style.setProperty('--bg', bgCol);
      stage.style.setProperty('--glow', glowCol);
      currentGlow = glowCol;

      // On dish change: mood tint class + category divider flash
      if (dominant !== lastDominant) {
        const prevTag = lastTag;
        lastDominant = dominant;
        lastTag = dishes[dominant].tag;
        const mc = moodClass(dishes[dominant].mood.glow);
        stage.classList.remove('mood-cool', 'mood-green');
        if (mc !== 'mood-warm') stage.classList.add(mc);
        if (lastTag !== prevTag) flashDivider(lastTag);
      }

      // Counter and active dot follow the dominant dish
      countEl.textContent = String(dominant + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
      dots.forEach(function (dot, k) { dot.classList.toggle('active', k === dominant); });

      // Hide the "keep scrolling" cue once the user has moved
      cueEl.style.opacity = p > 0.1 ? '0' : '1';

      // Show finale when scrolled past the last dish
      if (p > 0.95 && !finale.classList.contains('show')) {
        finale.classList.add('show');
        renderFinale();
        // Animate the plate open
        requestAnimationFrame(() => {
          finalePlate.classList.add('open');
        });
      }

      // Hide finale when scrolling back up
      if (p < 0.9 && finale.classList.contains('show')) {
        finale.classList.remove('show');
        finalePlate.classList.remove('open');
        finaleMessage.textContent = '';
      }

      // Foreground streaks drift faster than the dish
      const scrollPx = window.scrollY - journeyTop;
      const loopH = window.innerHeight;
      fg1.style.transform = 'translateY(' + (-wrapMod(scrollPx * 0.35, loopH)) + 'px)';
      fg2.style.transform = 'translateY(' + (-wrapMod(scrollPx * 0.55 + loopH * 0.5, loopH)) + 'px)';

      // Touch devices: tilt very slightly with the scroll direction
      if (isTouch && !reduce) {
        const dy = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        const dir = Math.max(-1, Math.min(1, dy * 0.08));
        targetTiltX = dir * 2.5;
      }

      dominantIndex = dominant;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });

    // Keyboard: jump between dishes while the journey is on screen
    document.addEventListener('keydown', function (e) {
      if (!journeyVisible) return;
      if (modal.classList.contains('open')) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      let delta = 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') delta = 1;
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') delta = -1;
      if (!delta) return;
      e.preventDefault();
      const target = Math.max(0, Math.min(n - 1, dominantIndex + delta));
      jumpTo(target);
    });

    // ===== Ambient: dust canvas + smoothed mouse tilt =====
    dustCtx = dust.getContext('2d');

    function resizeDust() {
      if (!dustCtx) return;
      dustW = stage.clientWidth;
      dustH = stage.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dust.width = Math.floor(dustW * dpr);
      dust.height = Math.floor(dustH * dpr);
      dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeDust() {
      const count = window.innerWidth < 800 ? 14 : 28;
      dustParticles = [];
      for (let i = 0; i < count; i++) {
        dustParticles.push({
          x: Math.random() * dustW,
          y: Math.random() * dustH,
          r: 0.6 + Math.random() * 1.6,
          vy: 0.1 + Math.random() * 0.35,
          drift: (Math.random() - 0.5) * 0.2,
          life: Math.random(),
          decay: 0.001 + Math.random() * 0.003
        });
      }
    }

    function drawDust() {
      if (!dustCtx) return;
      const w = dustW;
      const h = dustH;
      dustCtx.clearRect(0, 0, w, h);
      const rgb = hexToRgb(currentGlow);
      for (let i = 0; i < dustParticles.length; i++) {
        const d = dustParticles[i];
        d.y -= d.vy;
        d.x += d.drift;
        d.life -= d.decay;
        if (d.life <= 0 || d.y < -4) {
          d.x = Math.random() * w;
          d.y = h + 4;
          d.life = 0.5 + Math.random() * 0.5;
        }
        const alpha = Math.max(0, Math.min(1, d.life)) * 0.7;
        dustCtx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
        dustCtx.beginPath();
        dustCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        dustCtx.fill();
      }
    }

    function applyTilt() {
      for (let k = 0; k < n; k++) {
        if (k === dominantIndex) {
          tiltEls[k].style.transform = 'rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg)';
        } else {
          tiltEls[k].style.transform = '';
        }
      }
    }

    function ambientLoop() {
      if (!ambientRunning) return;
      drawDust();
      tiltX += (targetTiltX - tiltX) * 0.12;
      tiltY += (targetTiltY - tiltY) * 0.12;
      applyTilt();
      dustRaf = requestAnimationFrame(ambientLoop);
    }

    function startAmbient() {
      if (ambientRunning) return;
      ambientRunning = true;
      ambientLoop();
    }
    function stopAmbient() {
      ambientRunning = false;
      if (dustRaf) { cancelAnimationFrame(dustRaf); dustRaf = null; }
    }

    resizeDust();
    makeDust();

    // Mouse tilt (desktop only)
    stage.addEventListener('mousemove', function (e) {
      if (reduce || isTouch) return;
      const rect = stage.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width * 2 - 1;
      const ny = (e.clientY - rect.top) / rect.height * 2 - 1;
      targetTiltY = Math.max(-1, Math.min(1, nx)) * 8;
      targetTiltX = Math.max(-1, Math.min(1, -ny)) * 8;
    });
    stage.addEventListener('mouseleave', function () {
      targetTiltX = 0;
      targetTiltY = 0;
    });

    // Run the ambient loop only while the journey is visible and the tab is active
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        journeyVisible = entries[0].isIntersecting;
        if (journeyVisible && !document.hidden && !reduce) startAmbient();
        else stopAmbient();
      }, { threshold: 0.05 }).observe(journey);
    } else if (!reduce) {
      startAmbient();
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAmbient();
      else if (journeyVisible && !reduce) startAmbient();
    });

    html.classList.remove('no-journey');
    measure();
    update();
  })();

  // ===== FINALE: Place Order =====
  finalePlace.addEventListener('click', () => {
    if (order.length === 0) return;
    order = [];
    renderFinale();
    updateOrderBar();
    renderOrder();
    finaleMessage.textContent = 'Order placed. Thank you!';
    finaleMessage.style.color = '#7bd88f';
  });

  // ===== MENU: build the quick, no-animation menu from dishes.js =====
  (function () {
    const grid = $('#menu-grid');
    const dishes = window.DISHES;
    if (!grid || !dishes || !dishes.length) return;
    dishes.forEach(function (dish) {
      const card = document.createElement('article');
      card.className = 'food-card';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'food-img';
      const img = document.createElement('img');
      img.className = 'cut';
      img.alt = dish.name;
      img.decoding = 'async';
      img.loading = 'lazy';
      img.width = 400;
      img.height = 220;
      loadImage(img, dish);
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);

      const info = document.createElement('div');
      info.className = 'food-info';
      info.innerHTML = '<h3>' + esc(dish.name) + '</h3><p>' + esc(dish.desc) + '</p>';
      card.appendChild(info);

      const bottom = document.createElement('div');
      bottom.className = 'food-bottom';
      bottom.innerHTML = '<p class="price">' + money(dish.price) + '</p><button class="btn add-btn" type="button">Add to Order</button>';
      card.appendChild(bottom);

      $('.add-btn', card).addEventListener('click', function () {
        const imgEl = $('img', card);
        addToOrder(dish.name, dish.price, imgEl ? imgEl.src : dish.image, 1);
      });

      grid.appendChild(card);
    });
  })();

  $('#year').textContent = new Date().getFullYear();
  updateBadge(false);

  // Expose for checkout.js
  window.order = order;
  window.renderOrder = renderOrder;
  window.renderFinale = renderFinale;
  window.updateOrderBar = updateOrderBar;
  window.setMessage = setMessage;

  // ===== A) CURSOR FIRELIGHT (desktop only) =====
  (function () {
    try {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      if (reduce || isTouch) return;

      const hero = $('#home');
      const stage = $('#j-stage');
      if (!hero || !stage) return;

      const heroLight = document.createElement('div');
      heroLight.className = 'cursor-light';
      hero.appendChild(heroLight);

      const stageLight = document.createElement('div');
      stageLight.className = 'cursor-light';
      stage.appendChild(stageLight);

      let heroRect = hero.getBoundingClientRect();
      let stageRect = stage.getBoundingClientRect();
      let mouseX = 0, mouseY = 0;
      let targetHeroX = 0, targetHeroY = 0;
      let targetStageX = 0, targetStageY = 0;
      let rafId = null;

      function updateRects() {
        heroRect = hero.getBoundingClientRect();
        stageRect = stage.getBoundingClientRect();
      }
      window.addEventListener('resize', updateRects, { passive: true });

      function lerp(a, b, t) { return a + (b - a) * t; }

      function animate() {
        mouseX = lerp(mouseX, targetHeroX, 0.12);
        mouseY = lerp(mouseY, targetHeroY, 0.12);
        heroLight.style.setProperty('--mx', mouseX + 'px');
        heroLight.style.setProperty('--my', mouseY + 'px');

        const sx = lerp(mouseX, targetStageX, 0.12);
        const sy = lerp(mouseY, targetStageY, 0.12);
        stageLight.style.setProperty('--mx', sx + 'px');
        stageLight.style.setProperty('--my', sy + 'px');

        rafId = requestAnimationFrame(animate);
      }
      animate();

      function onMove(e) {
        const heroActive = heroRect.top < window.innerHeight && heroRect.bottom > 0;
        const stageActive = stageRect.top < window.innerHeight && stageRect.bottom > 0;

        if (heroActive) {
          targetHeroX = e.clientX - heroRect.left;
          targetHeroY = e.clientY - heroRect.top;
          heroLight.classList.add('active');
        } else {
          heroLight.classList.remove('active');
        }

        if (stageActive) {
          targetStageX = e.clientX - stageRect.left;
          targetStageY = e.clientY - stageRect.top;
          stageLight.classList.add('active');
        } else {
          stageLight.classList.remove('active');
        }
      }
      document.addEventListener('mousemove', onMove, { passive: true });

      document.addEventListener('mouseleave', function () {
        heroLight.classList.remove('active');
        stageLight.classList.remove('active');
      });

      // Update glow color when it changes
      const observer = new MutationObserver(function () {
        const glow = getComputedStyle(document.documentElement).getPropertyValue('--glow').trim();
        if (glow) {
          heroLight.style.background = 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, ' + glow + ' 35%, transparent) 0%, transparent 65%)';
          stageLight.style.background = 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, ' + glow + ' 35%, transparent) 0%, transparent 65%)';
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    } catch (e) { /* fail silently */ }
  })();

  // ===== B) SCROLL-TO-COOK (Tomahawk / dishes[0] only) =====
  (function () {
    try {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dishes = window.DISHES;
      if (!dishes || !dishes.length) return;

      const wrap = document.querySelector('.j-dish-wrap');
      if (!wrap) return;
      const img = wrap.querySelector('img.j-dish');
      if (!img) return;

      // Create label
      const label = document.createElement('div');
      label.className = 'cook-label';
      label.textContent = 'Raw';
      wrap.appendChild(label);

      // Create sparks container
      const sparksContainer = document.createElement('div');
      sparksContainer.className = 'cook-sparks';
      wrap.appendChild(sparksContainer);

      let sparksRaf = null;
      let sparkInterval = null;

      function spawnSpark() {
        const wrapRect = wrap.getBoundingClientRect();
        const spark = document.createElement('div');
        spark.className = 'cook-spark';
        const x = (Math.random() - 0.5) * wrapRect.width * 0.6;
        const dx = (Math.random() - 0.5) * 60;
        spark.style.left = (wrapRect.width / 2 + x) + 'px';
        spark.style.setProperty('--dx', dx + 'px');
        sparksContainer.appendChild(spark);
        setTimeout(() => spark.remove(), 600);
      }

      function startSparks() {
        if (sparkInterval) return;
        sparkInterval = setInterval(spawnSpark, 80);
      }
      function stopSparks() {
        if (sparkInterval) { clearInterval(sparkInterval); sparkInterval = null; }
      }

      // Hook into journey scroll progress
      const journey = $('#journey');
      if (!journey) return;

      let journeyTop = 0, journeyH = 0;
      function measure() {
        journeyTop = journey.getBoundingClientRect().top + window.scrollY;
        journeyH = journey.offsetHeight - window.innerHeight;
      }
      measure();
      window.addEventListener('resize', measure, { passive: true });

      const n = dishes.length;
      const firstDishScrollHeight = journeyH / (n - 1); // scroll range for first dish

      let cookTicking = false;
      function updateCook() {
        cookTicking = false;
        if (journeyH <= 0) return;
        const p = Math.min(1, Math.max(0, (window.scrollY - journeyTop) / journeyH));
        const index = p * (n - 1);

        // Only affect first dish (index 0)
        if (index > 1) {
          img.classList.remove('cooking');
          img.style.filter = '';
          label.classList.remove('show');
          stopSparks();
          return;
        }

        img.classList.add('cooking');
        label.classList.add('show');

        // Progress through first dish: 0 = raw, 0.5 = searing, 1 = plated
        const localP = Math.min(1, index / 0.5); // 0..1 over first half of first dish scroll

        if (localP < 0.33) {
          // Raw: desaturated, darker, slightly red
          const t = localP / 0.33;
          const sat = 1 - 0.6 * (1 - t);
          const bright = 1 - 0.3 * (1 - t);
          const hue = 15 * (1 - t); // slight red shift
          img.style.filter = 'saturate(' + sat + ') brightness(' + bright + ') hue-rotate(' + hue + 'deg) contrast(1.1)';
          label.textContent = 'Raw';
          stopSparks();
        } else if (localP < 0.66) {
          // Searing: normal, with sparks
          const t = (localP - 0.33) / 0.33;
          const sat = 0.4 + 0.6 * t;
          const bright = 0.7 + 0.3 * t;
          const hue = 15 * (1 - t);
          img.style.filter = 'saturate(' + sat + ') brightness(' + bright + ') hue-rotate(' + hue + 'deg) contrast(1.1)';
          label.textContent = 'Searing';
          startSparks();
        } else {
          // Plated: brighter, warmer, steam shimmer (handled by CSS)
          const t = (localP - 0.66) / 0.34;
          const sat = 1 + 0.15 * t;
          const bright = 1 + 0.15 * t;
          const warmth = 8 * t; // warm hue shift
          img.style.filter = 'saturate(' + sat + ') brightness(' + bright + ') hue-rotate(-' + warmth + 'deg) contrast(1.05)';
          label.textContent = 'Ready';
          stopSparks();
        }
      }

      window.addEventListener('scroll', function () {
        if (!reduce && !cookTicking) {
          cookTicking = true;
          requestAnimationFrame(updateCook);
        }
      }, { passive: true });

      // Initial
      updateCook();
    } catch (e) { /* fail silently */ }
  })();

  // ===== C) FIRE CRACKLE SOUND (off by default) =====
  (function () {
    try {
      const navLinks = $('.nav-links');
      if (!navLinks) return;

      const SOUND_KEY = 'emberOakCrackle';
      const soundUrl = 'sounds/crackle.mp3';
      let audio = null;
      let enabled = false;

      // Check if file exists (fetch HEAD)
      fetch(soundUrl, { method: 'HEAD', cache: 'no-cache' })
        .then(function (res) {
          if (!res.ok) throw new Error('not found');
          createToggle();
        })
        .catch(function () {
          // File doesn't exist: don't create toggle
        });

      function createToggle() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sound-toggle';
        btn.setAttribute('aria-label', 'Toggle fire crackle sound');
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML =
          '<svg class="icon-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
          '</svg>' +
          '<svg class="icon-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display:none">' +
            '<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>' +
          '</svg>';

        // Insert before the order button
        const orderBtn = navLinks.querySelector('.order-btn');
        if (orderBtn) navLinks.insertBefore(btn, orderBtn);
        else navLinks.appendChild(btn);

        // Restore from localStorage
        try {
          enabled = JSON.parse(localStorage.getItem(SOUND_KEY)) === true;
        } catch (e) { enabled = false; }
        updateToggle();

        btn.addEventListener('click', function () {
          if (!audio) {
            audio = new Audio(soundUrl);
            audio.loop = true;
            audio.volume = 0.15;
          }
          enabled = !enabled;
          try { localStorage.setItem(SOUND_KEY, JSON.stringify(enabled)); } catch (e) {}
          updateToggle();
          if (enabled) {
            audio.play().catch(function () { /* autoplay blocked, user will click again */ });
          } else {
            audio.pause();
            audio.currentTime = 0;
          }
        });

        function updateToggle() {
          btn.classList.toggle('on', enabled);
          btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
          const onIcon = btn.querySelector('.icon-on');
          const offIcon = btn.querySelector('.icon-off');
          if (onIcon) onIcon.style.display = enabled ? 'block' : 'none';
          if (offIcon) offIcon.style.display = enabled ? 'none' : 'block';
        }
      }
    } catch (e) { /* fail silently */ }
  })();

  // ===== Account / Login / Orders =====
  (function () {
    const API = '';
    const accountModal = $('#account-modal');
    const accountContent = $('#account-content');
    const loginBtn = $('#login-btn');
    const closeAccount = $('#close-account');
    let currentUser = null;
    let serverOnline = false;

    if (!accountModal || !accountContent || !loginBtn) return;

    // Check server status
    fetch(API + '/api/me', { credentials: 'include' })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('offline');
      })
      .then((user) => {
        serverOnline = true;
        currentUser = user;
        updateLoginBtn();
      })
      .catch(() => {
        serverOnline = false;
        updateLoginBtn();
      });

    function updateLoginBtn() {
      if (!serverOnline) {
        loginBtn.textContent = 'Demo server offline';
        loginBtn.disabled = true;
        return;
      }
      if (currentUser) {
        const firstName = (currentUser.name || '').split(' ')[0];
        loginBtn.textContent = firstName;
        loginBtn.disabled = false;
      } else {
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
      }
    }

    function openAccountModal() {
      if (!serverOnline) {
        showToast('Demo server offline');
        return;
      }
      accountModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      renderAccountContent();
    }

    function closeAccountModal() {
      accountModal.classList.remove('open');
      document.body.style.overflow = '';
    }

    function renderAccountContent() {
      if (currentUser) {
        accountContent.innerHTML =
          '<div class="account-user">' +
          '<h3>Welcome, ' + esc(currentUser.name) + '</h3>' +
          '<p>' + esc(currentUser.email) + '</p>' +
          '<button class="btn" id="logout-btn" type="button">Logout</button>' +
          '</div>' +
          '<div class="account-orders" id="account-orders"></div>';
        $('#logout-btn').addEventListener('click', doLogout);
        loadOrders();
      } else {
        accountContent.innerHTML =
          '<div class="account-tabs">' +
          '<button class="account-tab active" data-tab="login" type="button">Login</button>' +
          '<button class="account-tab" data-tab="register" type="button">Register</button>' +
          '</div>' +
          '<div id="account-form-container"></div>' +
          '<p class="account-message" id="account-message" aria-live="polite"></p>';
        $$('.account-tab').forEach((tab) => {
          tab.addEventListener('click', function () {
            $$('.account-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            renderForm(tab.dataset.tab);
          });
        });
        renderForm('login');
      }
    }

    function renderForm(type) {
      const container = $('#account-form-container');
      if (type === 'login') {
        container.innerHTML =
          '<form class="account-form" id="login-form">' +
          '<label>Email<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>Password<input type="password" name="password" required autocomplete="current-password"></label>' +
          '<button class="btn" type="submit">Login</button>' +
          '</form>';
        $('#login-form').addEventListener('submit', handleLogin);
      } else {
        container.innerHTML =
          '<form class="account-form" id="register-form">' +
          '<label>Name<input type="text" name="name" required autocomplete="name"></label>' +
          '<label>Email<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>Password<input type="password" name="password" required autocomplete="new-password" minlength="6"></label>' +
          '<button class="btn" type="submit">Register</button>' +
          '</form>';
        $('#register-form').addEventListener('submit', handleRegister);
      }
    }

    function setAccountMessage(text, type) {
      const msg = $('#account-message');
      if (!msg) return;
      msg.textContent = text;
      msg.className = 'account-message' + (type ? ' ' + type : '');
    }

    function handleLogin(e) {
      e.preventDefault();
      const form = e.target;
      const email = form.email.value.trim();
      const password = form.password.value;

      fetch(API + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || 'Login failed');
          currentUser = data;
          updateLoginBtn();
          renderAccountContent();
        })
        .catch((err) => setAccountMessage(err.message, 'error'));
    }

    function handleRegister(e) {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;

      fetch(API + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || 'Registration failed');
          currentUser = data;
          updateLoginBtn();
          renderAccountContent();
        })
        .catch((err) => setAccountMessage(err.message, 'error'));
    }

    function doLogout() {
      fetch(API + '/api/logout', { method: 'POST', credentials: 'include' })
        .then(() => {
          currentUser = null;
          updateLoginBtn();
          renderAccountContent();
        })
        .catch(() => {
          currentUser = null;
          updateLoginBtn();
          renderAccountContent();
        });
    }

    function loadOrders() {
      const container = $('#account-orders');
      if (!container) return;
      container.innerHTML = '<p class="empty-text">Loading orders...</p>';

      fetch(API + '/api/orders', { credentials: 'include' })
        .then((r) => {
          if (!r.ok) throw new Error('Failed to load orders');
          return r.json();
        })
        .then((orders) => {
          if (!orders.length) {
            container.innerHTML = '<p class="empty-text">No orders yet.</p>';
            return;
          }
          container.innerHTML = '<h3>My Orders</h3>' + orders.map((o) => {
            const items = o.items.map((i) => esc(i.name) + ' x' + i.qty).join(', ');
            const date = new Date(o.created_at).toLocaleString();
            return '<div class="order-history-item">' +
              '<div class="oh-header">' +
              '<span class="oh-date">' + esc(date) + '</span>' +
              '<span class="oh-total">' + money(o.total) + '</span>' +
              '</div>' +
              '<div class="oh-items">' + esc(items) + '</div>' +
              '</div>';
          }).join('');
        })
        .catch(() => {
          container.innerHTML = '<p class="empty-text">Could not load orders.</p>';
        });
    }

    // Event listeners
    loginBtn.addEventListener('click', openAccountModal);
    closeAccount.addEventListener('click', closeAccountModal);
    accountModal.addEventListener('click', (e) => { if (e.target === accountModal) closeAccountModal(); });

    // Expose for Place Order integration
    window.__emberAccount = {
      getUser: () => currentUser,
      isServerOnline: () => serverOnline,
      openModal: openAccountModal
    };
  })();

  // Override Place Order (popup) to send to server when logged in
  (function () {
    const placeOrderBtn = $('#place-order');
    if (!placeOrderBtn) return;
    // Remove existing listeners by cloning
    const newBtn = placeOrderBtn.cloneNode(true);
    placeOrderBtn.parentNode.replaceChild(newBtn, placeOrderBtn);

    newBtn.addEventListener('click', () => {
      if (order.length === 0) return setMessage('Add a dish to your order first.', 'error');

      const account = window.__emberAccount;
      if (account && account.isServerOnline() && !account.getUser()) {
        setMessage('Please log in to place your order.', 'error');
        if (account) account.openModal();
        return;
      }

      const items = order.map((item) => ({
        name: item.name,
        price: item.price,
        qty: item.qty
      }));
      const total = order.reduce((sum, item) => sum + item.price * item.qty, 0);

      if (account && account.isServerOnline() && account.getUser()) {
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items, total })
        })
          .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
          .then(({ ok, data }) => {
            if (!ok) throw new Error(data.error || 'Order failed');
            order = [];
            renderOrder();
            renderFinale();
            updateOrderBar();
            setMessage('Order placed. Thank you!', '');
          })
          .catch((err) => setMessage(err.message, 'error'));
      } else {
        order = [];
        renderOrder();
        renderFinale();
        updateOrderBar();
        setMessage('Order placed. Thank you!', '');
      }
    });
  })();

  // Override Place Order (finale) to send to server when logged in
  (function () {
    const finalePlaceBtn = $('#finale-place');
    if (!finalePlaceBtn) return;
    const newBtn = finalePlaceBtn.cloneNode(true);
    finalePlaceBtn.parentNode.replaceChild(newBtn, finalePlaceBtn);

    newBtn.addEventListener('click', () => {
      if (order.length === 0) return;

      const account = window.__emberAccount;
      if (account && account.isServerOnline() && !account.getUser()) {
        account.openModal();
        return;
      }

      const items = order.map((item) => ({
        name: item.name,
        price: item.price,
        qty: item.qty
      }));
      const total = order.reduce((sum, item) => sum + item.price * item.qty, 0);

      if (account && account.isServerOnline() && account.getUser()) {
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items, total })
        })
          .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
          .then(({ ok, data }) => {
            if (!ok) throw new Error(data.error || 'Order failed');
            order = [];
            renderFinale();
            updateOrderBar();
            renderOrder();
            finaleMessage.textContent = 'Order placed. Thank you!';
            finaleMessage.style.color = '#7bd88f';
          })
          .catch((err) => {
            finaleMessage.textContent = err.message;
            finaleMessage.style.color = '#e57373';
          });
      } else {
        order = [];
        renderFinale();
        updateOrderBar();
        renderOrder();
        finaleMessage.textContent = 'Order placed. Thank you!';
        finaleMessage.style.color = '#7bd88f';
      }
    });
  })();
})();