// Checkout flow - loaded after script.js
(function () {
  'use strict';
  // Wait for DOM and main script to load
  function init() {
    const checkoutModal = document.getElementById('checkout-modal');
    const successModal = document.getElementById('success-modal');
    const feedbackModal = document.getElementById('feedback-modal');
    const thankyouModal = document.getElementById('thankyou-modal');
    if (!checkoutModal) return;

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

    const closeCheckout = $('#close-checkout');
    const confirmOrderBtn = $('#confirm-order-btn');
    const checkoutItems = $('#checkout-items');
    const checkoutSubtotal = $('#checkout-subtotal');
    const checkoutDelivery = $('#checkout-delivery');
    const checkoutGrand = $('#checkout-grand');
    const upiSection = $('#upi-section');
    const upiAmount = $('#upi-amount');
    const upiConfirmCheck = $('#upi-confirm-check');
    const copyUpiBtn = $('#copy-upi-btn');
    const upiIdText = $('#upi-id-text');

    let selectedPayment = null;
    let currentRating = 0;
    let lastOrderId = null;

    function openModal(modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeModal(modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }

    // Override cart Place Order to open checkout
    const cartPlaceOrder = $('#place-order');
    if (cartPlaceOrder) {
      const newBtn = cartPlaceOrder.cloneNode(true);
      cartPlaceOrder.parentNode.replaceChild(newBtn, cartPlaceOrder);
      newBtn.addEventListener('click', () => {
        if (window.order && window.order.length === 0) return;
        openCheckout();
      });
    }

    function openCheckout() {
      renderCheckoutItems();
      const account = window.__emberAccount;
      if (account && account.getUser()) {
        const user = account.getUser();
        const nameInput = $('#checkout-name');
        if (nameInput && !nameInput.value) nameInput.value = user.name || '';
      }
      selectedPayment = null;
      $$('.payment-card').forEach((c) => c.classList.remove('selected'));
      if (upiSection) upiSection.style.display = 'none';
      if (upiConfirmCheck) upiConfirmCheck.checked = false;
      clearErrors();
      openModal(checkoutModal);
    }

    function clearErrors() {
      ['#err-name', '#err-phone', '#err-address', '#err-payment', '#err-upi-confirm'].forEach((sel) => {
        const el = $(sel);
        if (el) el.textContent = '';
      });
    }

    function renderCheckoutItems() {
      if (!checkoutItems) return;
      let subtotal = 0;
      const order = window.order || [];
      checkoutItems.innerHTML = order.map((item, i) => {
        const line = item.price * item.qty;
        subtotal += line;
        return '<div class="checkout-item">' +
          '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" width="48" height="48" loading="lazy">' +
          '<div class="checkout-item-info"><h4>' + esc(item.name) + '</h4><span>' + money(item.price) + ' each</span></div>' +
          '<div class="checkout-item-qty">' +
          '<button type="button" data-action="minus" data-index="' + i + '" aria-label="Decrease">−</button>' +
          '<span>' + item.qty + '</span>' +
          '<button type="button" data-action="plus" data-index="' + i + '" aria-label="Increase">+</button>' +
          '</div>' +
          '<span style="font-weight:600;color:var(--accent);">' + money(line) + '</span>' +
          '<button class="checkout-item-remove" data-action="remove" data-index="' + i + '" aria-label="Remove ' + esc(item.name) + '">✕</button>' +
          '</div>';
      }).join('');

      const delivery = 0;
      const grand = subtotal + delivery;
      if (checkoutSubtotal) checkoutSubtotal.textContent = money(subtotal);
      if (checkoutDelivery) checkoutDelivery.textContent = money(delivery);
      if (checkoutGrand) checkoutGrand.textContent = money(grand);
      if (upiAmount) upiAmount.textContent = money(grand);
    }

    if (checkoutItems) {
      checkoutItems.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const i = Number(btn.dataset.index);
        const order = window.order || [];
        if (btn.dataset.action === 'plus') {
          order[i].qty = Math.min(20, order[i].qty + 1);
        } else if (btn.dataset.action === 'minus') {
          order[i].qty--;
          if (order[i].qty <= 0) order.splice(i, 1);
        } else if (btn.dataset.action === 'remove') {
          order.splice(i, 1);
        }
        renderCheckoutItems();
        if (window.renderOrder) window.renderOrder();
        if (window.renderFinale) window.renderFinale();
        if (window.updateOrderBar) window.updateOrderBar();
      });
    }

    $$('.payment-card').forEach((card) => {
      card.addEventListener('click', () => {
        $$('.payment-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        selectedPayment = radio ? radio.value : null;
        const errPayment = $('#err-payment');
        if (errPayment) errPayment.textContent = '';

        if (selectedPayment === 'upi') {
          if (upiSection) upiSection.style.display = 'block';
        } else {
          if (upiSection) upiSection.style.display = 'none';
        }
      });
    });

    if (copyUpiBtn) {
      copyUpiBtn.addEventListener('click', () => {
        const text = upiIdText ? upiIdText.textContent : '';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            copyUpiBtn.textContent = 'Copied!';
            setTimeout(() => { copyUpiBtn.textContent = 'Copy UPI ID'; }, 2000);
          }).catch(() => {});
        }
      });
    }

    if (closeCheckout) {
      closeCheckout.addEventListener('click', () => closeModal(checkoutModal));
    }
    checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) closeModal(checkoutModal); });

    if (confirmOrderBtn) {
      confirmOrderBtn.addEventListener('click', () => {
        clearErrors();
        let valid = true;

        const name = ($('#checkout-name') || {}).value || '';
        const phone = ($('#checkout-phone') || {}).value || '';
        const address = ($('#checkout-address') || {}).value || '';

        if (!name.trim()) { const el = $('#err-name'); if (el) el.textContent = 'Name is required'; valid = false; }
        if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone.trim())) { const el = $('#err-phone'); if (el) el.textContent = 'Enter a valid 10-digit Indian mobile number'; valid = false; }
        if (!address.trim()) { const el = $('#err-address'); if (el) el.textContent = 'Delivery address is required'; valid = false; }
        if (!selectedPayment) { const el = $('#err-payment'); if (el) el.textContent = 'Select a payment method'; valid = false; }
        if (selectedPayment === 'upi') {
          if (!upiConfirmCheck || !upiConfirmCheck.checked) { const el = $('#err-upi-confirm'); if (el) el.textContent = 'Please confirm payment completion'; valid = false; }
        }
        const order = window.order || [];
        if (order.length === 0) valid = false;

        if (!valid) return;

        lastOrderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

        const account = window.__emberAccount;
        const items = order.map((item) => ({ name: item.name, price: item.price, qty: item.qty }));
        const total = order.reduce((sum, item) => sum + item.price * item.qty, 0);

        if (account && account.isServerOnline() && account.getUser()) {
          fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ items, total })
          }).catch(() => {});
        }

        closeModal(checkoutModal);
        showSuccess(lastOrderId, name.trim(), selectedPayment, total);
      });
    }

    function showSuccess(orderId, customerName, payment, total) {
      const orderIdEl = $('#success-order-id');
      const customerEl = $('#success-customer');
      const paymentEl = $('#success-payment');
      const totalEl = $('#success-total');
      if (orderIdEl) orderIdEl.textContent = orderId;
      if (customerEl) customerEl.textContent = customerName;
      if (paymentEl) {
        if (payment === 'cod') paymentEl.textContent = 'Cash on Delivery (Payment pending)';
        else paymentEl.textContent = 'UPI (Payment verification pending)';
      }
      if (totalEl) totalEl.textContent = money(total);
      openModal(successModal);
    }

    const successDoneBtn = $('#success-done-btn');
    if (successDoneBtn) {
      successDoneBtn.addEventListener('click', () => {
        closeModal(successModal);
        openModal(feedbackModal);
      });
    }

    const stars = $$('.star-btn');
    const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    stars.forEach((star) => {
      star.addEventListener('click', () => {
        currentRating = Number(star.dataset.rating);
        stars.forEach((s) => {
          s.classList.toggle('active', Number(s.dataset.rating) <= currentRating);
        });
        const label = $('#rating-label');
        if (label) label.textContent = currentRating + ' Star' + (currentRating > 1 ? 's' : '') + ' - ' + ratingLabels[currentRating];
      });
      star.addEventListener('mouseenter', () => {
        const r = Number(star.dataset.rating);
        stars.forEach((s) => {
          if (Number(s.dataset.rating) <= r) s.style.color = 'var(--accent)';
        });
      });
      star.addEventListener('mouseleave', () => {
        stars.forEach((s) => {
          if (!s.classList.contains('active')) s.style.color = '';
        });
      });
    });

    const submitFeedbackBtn = $('#submit-feedback-btn');
    if (submitFeedbackBtn) {
      submitFeedbackBtn.addEventListener('click', () => {
        closeModal(feedbackModal);
        openModal(thankyouModal);
      });
    }

    const skipFeedbackBtn = $('#skip-feedback-btn');
    if (skipFeedbackBtn) {
      skipFeedbackBtn.addEventListener('click', () => {
        closeModal(feedbackModal);
        openModal(thankyouModal);
      });
    }

    const backToMenuBtn = $('#back-to-menu-btn');
    if (backToMenuBtn) {
      backToMenuBtn.addEventListener('click', () => {
        closeModal(thankyouModal);
        const order = window.order || [];
        order.length = 0;
        if (window.renderOrder) window.renderOrder();
        if (window.renderFinale) window.renderFinale();
        if (window.updateOrderBar) window.updateOrderBar();
        const menu = $('#menu');
        if (menu) menu.scrollIntoView({ behavior: 'smooth' });
      });
    }

    [successModal, feedbackModal, thankyouModal].forEach((m) => {
      if (!m) return;
      m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (checkoutModal.classList.contains('open')) closeModal(checkoutModal);
      else if (successModal.classList.contains('open')) { closeModal(successModal); openModal(feedbackModal); }
      else if (feedbackModal.classList.contains('open')) { closeModal(feedbackModal); openModal(thankyouModal); }
      else if (thankyouModal.classList.contains('open')) closeModal(thankyouModal);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
