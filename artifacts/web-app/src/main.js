import './css/style.css';
import { onAuthState } from './js/auth.js';

// Redirect logged-in users straight to dashboard
onAuthState(user => {
  if (user) window.location.href = '/dashboard.html';
});

// Smooth scroll for any anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });
});

// Animate hero elements on load
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-animate]').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 50);
  });
});
