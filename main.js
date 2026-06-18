// ============================================
//   ECOIQ — MAIN JS
//   Particle animation + nav + auth + chat toggle
// ============================================

import { initAuth, loginWithGoogle, logout } from './js/auth.js';
import { throttleRaf } from './js/utils-dom.js';

// ---- PARTICLE CANVAS ----
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const handleResize = throttleRaf(() => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  window.addEventListener('resize', handleResize);

  const SYMBOLS = ['🌿','♻️','🌱','⚡','💧','🌍','🍃','☀️'];
  const particles = [];

  class Particle {
    constructor(initial = false) { this.reset(initial); }

    reset(initial = false) {
      this.x       = Math.random() * canvas.width;
      this.y       = initial ? Math.random() * canvas.height : -30;
      this.size    = Math.random() * 14 + 8;
      this.speed   = Math.random() * 0.6 + 0.2;
      this.opacity = Math.random() * 0.4 + 0.1;
      this.rotation= Math.random() * 360;
      this.rotSpeed= (Math.random() - 0.5) * 1.2;
      this.drift   = (Math.random() - 0.5) * 0.4;
      this.symbol  = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }

    update() {
      this.y        += this.speed;
      this.x        += this.drift;
      this.rotation += this.rotSpeed;
      if (this.y > canvas.height + 40) { this.reset(); }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = this.opacity;
      ctx.font = `${this.size}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(this.symbol, 0, 0);
      ctx.restore();
    }
  }

  for (let i = 0; i < 50; i++) { particles.push(new Particle(true)); }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  };

  animate();
}

// ---- CHAT TOGGLE ----
// Defined directly here (not imported) so it targets the correct
// #chatPanel and #chatOverlay IDs used in your HTML, and is
// properly exposed on window for inline onclick="" handlers.
window.toggleChat = function () {
  const panel   = document.getElementById('chatPanel');
  const overlay = document.getElementById('chatOverlay');
  const btn     = document.getElementById('chatToggleBtn');

  if (!panel) return;

  const isOpen = panel.classList.toggle('active');

  if (overlay) {
    overlay.classList.toggle('active', isOpen);
    overlay.setAttribute('aria-hidden', String(!isOpen));
  }

  if (btn) {
    btn.setAttribute('aria-expanded', String(isOpen));
  }

  if (isOpen) {
    const input = panel.querySelector('#chatInput');
    if (input) setTimeout(() => input.focus(), 50);
  }
};

// ---- AUTH ----
const loginBtn   = document.getElementById('loginBtn');
const userInfo   = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');
const userName   = document.getElementById('userName');

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Login failed:', err);
    }
  });
}

window.handleLogout = async function () {
  try {
    await logout();
  } catch (err) {
    console.error('Logout failed:', err);
  }
};

initAuth(
  (user) => {
    if (loginBtn)   { loginBtn.classList.add('hidden'); }
    if (userInfo)   { userInfo.classList.remove('hidden'); }
    if (userAvatar) { userAvatar.src = user.photoURL; userAvatar.alt = `${user.displayName} profile picture`; }
    if (userName)   { userName.textContent = user.displayName?.split(' ')[0]; }
  },
  () => {
    if (loginBtn) { loginBtn.classList.remove('hidden'); }
    if (userInfo) { userInfo.classList.add('hidden'); }
  }
);

// ---- NAVBAR SCROLL ----
const handleScroll = throttleRaf(() => {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  if (window.scrollY > 40) {
    nav.style.padding    = '0.75rem 2.5rem';
    nav.style.background = 'rgba(10,15,10,0.98)';
  } else {
    nav.style.padding    = '1rem 2.5rem';
    nav.style.background = 'rgba(10,15,10,0.85)';
  }
});

window.addEventListener('scroll', handleScroll);

// ---- CARD ANIMATIONS ----
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.animation = `fadeInUp 0.6s ${i * 0.1}s ease both`;
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .meter-card').forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});