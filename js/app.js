/**
 * app.js
 *
 * General UI behaviour:
 *  - Footer year
 *  - Navbar scroll effect
 *  - Mobile nav toggle
 *  - Smooth active-link highlighting
 */

(function () {
  'use strict';

  // Footer year
  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  // Navbar scroll shadow
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 10
      ? '0 4px 24px rgba(0,0,0,0.35)'
      : '';
  }, { passive: true });

  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.querySelector('.nav-links');
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });

  // Close mobile nav when a link is clicked
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // ---------------------------------------------------------------
  // Intersection observer — highlight active nav link
  // ---------------------------------------------------------------
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navAnchors.forEach((a) => {
            a.style.color = a.getAttribute('href') === '#' + entry.target.id
              ? 'var(--text-primary)'
              : '';
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
})();
