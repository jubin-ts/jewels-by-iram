/* ========================================
   JEWELS BY IRAM — Website Interactivity
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* --- Navbar scroll behavior --- */
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  function handleScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    if (scrollY > 600) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* --- Mobile navigation --- */
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  /* --- Active nav link on scroll --- */
  const sections = document.querySelectorAll('section[id]');

  function updateActiveLink() {
    const scrollY = window.scrollY + 200;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector(`.nav-link[href="#${id}"]`);
      if (link) {
        if (scrollY >= top && scrollY < top + height) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });

  /* --- Hero slider --- */
  const heroSlides = document.querySelectorAll('.hero-slide');
  let currentSlide = 0;

  function nextSlide() {
    heroSlides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % heroSlides.length;
    heroSlides[currentSlide].classList.add('active');
  }

  if (heroSlides.length > 1) {
    setInterval(nextSlide, 5000);
  }

  /* --- Collection filter --- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const collectionItems = document.querySelectorAll('.collection-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      collectionItems.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
          item.classList.remove('hidden');
          item.style.animation = 'fadeInUp 0.6s ease forwards';
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  /* --- Lightbox --- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.querySelector('.lightbox-close');
  const lightboxPrev = document.querySelector('.lightbox-prev');
  const lightboxNext = document.querySelector('.lightbox-next');
  let lightboxImages = [];
  let lightboxIndex = 0;

  // Collect all collection images
  function initLightbox() {
    const viewBtns = document.querySelectorAll('.view-btn');
    lightboxImages = [];

    viewBtns.forEach((btn, i) => {
      const img = btn.closest('.collection-img-wrap').querySelector('img');
      lightboxImages.push(img.src);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        lightboxIndex = i;
        openLightbox(img.src);
      });
    });

    // Also add lookbook images
    document.querySelectorAll('.lookbook-item').forEach(item => {
      const img = item.querySelector('img');
      const idx = lightboxImages.length;
      lightboxImages.push(img.src);

      item.addEventListener('click', () => {
        lightboxIndex = idx;
        openLightbox(img.src);
      });
    });
  }

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showPrev() {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    lightboxImg.src = lightboxImages[lightboxIndex];
  }

  function showNext() {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    lightboxImg.src = lightboxImages[lightboxIndex];
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrev);
  lightboxNext.addEventListener('click', showNext);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  initLightbox();

  /* --- Scroll reveal animations --- */
  const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  /* --- Stat counter animation --- */
  const stats = document.querySelectorAll('.stat-number');

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const text = target.textContent;
        const match = text.match(/(\d+)/);
        if (match) {
          const end = parseInt(match[1], 10);
          const suffix = text.replace(match[1], '');
          let current = 0;
          const step = Math.ceil(end / 50);
          const timer = setInterval(() => {
            current += step;
            if (current >= end) {
              current = end;
              clearInterval(timer);
            }
            target.textContent = current + suffix;
          }, 30);
        }
        statObserver.unobserve(target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(stat => statObserver.observe(stat));

  /* --- Contact form (simple validation) --- */
  const contactForm = document.getElementById('contactForm');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const name = formData.get('name');
    const email = formData.get('email');

    if (name && email) {
      const btn = contactForm.querySelector('.btn');
      btn.textContent = 'Message Sent!';
      btn.style.background = '#2ecc71';
      btn.style.borderColor = '#2ecc71';

      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.style.background = '';
        btn.style.borderColor = '';
        contactForm.reset();
      }, 3000);
    }
  });

  /* --- Smooth scroll for anchor links --- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

});
