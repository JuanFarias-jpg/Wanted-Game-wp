// ═══════════════════════════════════════════════
// Scroll reveal + nav highlight 
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));

  // Nav active highlight (only on index where anchors exist)
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  if (navLinks.length > 0) {
    window.addEventListener('scroll', () => {
      let current = '';
      document.querySelectorAll('[id]').forEach(section => {
        if (window.scrollY >= section.offsetTop - 200) current = section.id;
      });
      navLinks.forEach(link => {
        link.style.color = link.getAttribute('href') === `#${current}` ? 'var(--amber)' : '';
      });
    });
  }

});
