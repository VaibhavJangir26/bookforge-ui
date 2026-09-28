/**
 * BOOKFORGE — LUXURY 3D-DIMENSIONAL SPATIAL PLATFORM ENGINE
 * Volumetric Card Tilt, Rock-Solid Dropdown, Live Revenue Engine & Spatial Filters
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Full-Site 3D Perspective Card Tilt with Specular Glare
  init3DCardTilt();

  // 2. Initialize Robust Navbar Dropdown (Click + Hover, Zero Buffering)
  initNavbarDropdown();

  // 3. Initialize Interactive Discipline Filter
  initDisciplineFilter();

  // 4. Initialize 3D Scroll Reveal Observer
  init3DScrollReveal();

  // 5. Initialize Core Bookforge Features
  initNavbarScroll();
  initMobileMenu();
  initRevenueCalculator();
  initAuthCheck();
});

/**
 * 3D Perspective Card Tilt Engine with Specular Mouse Glare
 * Transforms cards into physical, reactive dimensional objects across the entire site
 */
function init3DCardTilt() {
  const tiltElements = document.querySelectorAll('.card-3d-dimensional');

  tiltElements.forEach(el => {
    // Inject specular glare element if not present
    if (!el.querySelector('.specular-glare')) {
      const glare = document.createElement('div');
      glare.className = 'specular-glare';
      el.appendChild(glare);
    }

    const glareEl = el.querySelector('.specular-glare');
    let bounds;
    const maxTilt = parseFloat(el.getAttribute('data-tilt-max') || '8');

    function updateBounds() {
      bounds = el.getBoundingClientRect();
    }

    el.addEventListener('mouseenter', () => {
      updateBounds();
      if (glareEl) glareEl.style.opacity = '1';
    });

    el.addEventListener('mousemove', (e) => {
      if (!bounds) updateBounds();

      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      const xPct = (mouseX / bounds.width - 0.5) * 2; // -1 to 1
      const yPct = (mouseY / bounds.height - 0.5) * 2; // -1 to 1

      const rotateX = -yPct * maxTilt;
      const rotateY = xPct * maxTilt;

      el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

      if (glareEl) {
        const px = (mouseX / bounds.width) * 100;
        const py = (mouseY / bounds.height) * 100;
        glareEl.style.setProperty('--mouse-x', `${px}%`);
        glareEl.style.setProperty('--mouse-y', `${py}%`);
      }
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      if (glareEl) glareEl.style.opacity = '0';
    });
  });
}

/**
 * Robust Navbar Dropdown (Click + Hover with zero buffering / clipping)
 */
function initNavbarDropdown() {
  const btn = document.getElementById('platform-dropdown-btn');
  const menu = document.getElementById('platform-dropdown-menu');
  const container = document.getElementById('platform-dropdown-container');

  if (!btn || !menu || !container) return;

  let isOpen = false;
  let closeTimeout = null;

  function openDropdown() {
    clearTimeout(closeTimeout);
    isOpen = true;
    menu.classList.remove('dropdown-closed');
    menu.classList.add('dropdown-open');
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    clearTimeout(closeTimeout);
    closeTimeout = setTimeout(() => {
      isOpen = false;
      menu.classList.remove('dropdown-open');
      menu.classList.add('dropdown-closed');
      btn.setAttribute('aria-expanded', 'false');
    }, 120);
  }

  // Click toggle
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Hover support with bridge
  container.addEventListener('mouseenter', openDropdown);
  container.addEventListener('mouseleave', closeDropdown);

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen && !container.contains(e.target)) {
      isOpen = false;
      menu.classList.remove('dropdown-open');
      menu.classList.add('dropdown-closed');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      menu.classList.remove('dropdown-open');
      menu.classList.add('dropdown-closed');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close when clicking any menu link
  menu.querySelectorAll('a').forEach(item => {
    item.addEventListener('click', () => {
      isOpen = false;
      menu.classList.remove('dropdown-open');
      menu.classList.add('dropdown-closed');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Interactive Discipline Category Filter
 */
function initDisciplineFilter() {
  const filterBtns = document.querySelectorAll('.discipline-filter-btn');
  const cards = document.querySelectorAll('.discipline-card');

  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-brand-rust', 'text-white', 'border-brand-rust', 'shadow-lg');
        b.classList.add('bg-white/10', 'text-white/70', 'border-white/15');
      });
      btn.classList.add('bg-brand-rust', 'text-white', 'border-brand-rust', 'shadow-lg');
      btn.classList.remove('bg-white/10', 'text-white/70', 'border-white/15');

      const filter = btn.getAttribute('data-filter');

      cards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.96) translateY(12px)';
          setTimeout(() => {
            card.style.transition = 'all 0.35s ease';
            card.style.opacity = '1';
            card.style.transform = 'scale(1) translateY(0)';
          }, 40);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/**
 * 3D Scroll Reveal Observer
 */
function init3DScrollReveal() {
  const items = document.querySelectorAll('.reveal-3d-item');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  items.forEach(el => observer.observe(el));
}

/**
 * Navbar Scroll State
 */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('bg-[#0b120d]/95', 'backdrop-blur-xl', 'border-b', 'border-white/10', 'shadow-2xl');
      navbar.classList.remove('bg-transparent');
    } else {
      navbar.classList.remove('bg-[#0b120d]/95', 'shadow-2xl');
      navbar.classList.add('bg-transparent');
    }
  });
}

/**
 * Mobile Hamburger Drawer
 */
function initMobileMenu() {
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileMenuCol = document.getElementById('mobile-menu-col');
  const barTop = document.getElementById('bar-top');
  const barBottom = document.getElementById('bar-bottom');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  let isMenuOpen = false;

  if (!mobileToggle || !mobileOverlay || !mobileMenuCol) return;

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    if (isMenuOpen) {
      if (barTop) barTop.classList.add('rotate-45', 'translate-y-[4px]');
      if (barBottom) barBottom.classList.add('-rotate-45', '-translate-y-[4px]');
      mobileOverlay.classList.remove('opacity-0', 'pointer-events-none');
      mobileOverlay.classList.add('opacity-100', 'pointer-events-auto');
      mobileMenuCol.classList.remove('-translate-y-8', 'opacity-0');
      mobileMenuCol.classList.add('translate-y-0', 'opacity-100');
      document.body.style.overflow = 'hidden';
    } else {
      if (barTop) barTop.classList.remove('rotate-45', 'translate-y-[4px]');
      if (barBottom) barBottom.classList.remove('-rotate-45', '-translate-y-[4px]');
      mobileOverlay.classList.remove('opacity-100', 'pointer-events-auto');
      mobileOverlay.classList.add('opacity-0', 'pointer-events-none');
      mobileMenuCol.classList.remove('translate-y-0', 'opacity-100');
      mobileMenuCol.classList.add('-translate-y-8', 'opacity-0');
      document.body.style.overflow = '';
    }
  }

  mobileToggle.addEventListener('click', toggleMenu);
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (isMenuOpen) toggleMenu();
    });
  });
}

/**
 * Host Revenue Estimator & Dynamic Slider Fill
 */
function initRevenueCalculator() {
  const calcType = document.getElementById('calc-type');
  const calcHours = document.getElementById('calc-hours');
  const calcHoursLabel = document.getElementById('calc-hours-label');
  const calcRevenueResult = document.getElementById('calc-revenue-result');

  if (!calcType || !calcHours || !calcHoursLabel || !calcRevenueResult) return;

  function updateEarnings() {
    const rate = parseFloat(calcType.value) || 85;
    const hours = parseInt(calcHours.value, 10) || 18;
    calcHoursLabel.textContent = `${hours} Hours / Week`;

    // Dynamic Slider Fill Percentage
    const pct = ((hours - 5) / (45 - 5)) * 100;
    calcHours.style.setProperty('--slider-pct', `${pct}%`);

    const weekly = rate * hours;
    const monthly = Math.round(weekly * 4);
    calcRevenueResult.textContent = `$${monthly.toLocaleString()}`;

    // Pop scale animation
    calcRevenueResult.style.transform = 'scale(1.08)';
    setTimeout(() => {
      calcRevenueResult.style.transform = 'scale(1)';
    }, 180);
  }

  calcType.addEventListener('change', updateEarnings);
  calcHours.addEventListener('input', updateEarnings);
  updateEarnings();
}

/**
 * Check Auth session
 */
function initAuthCheck() {
  if (typeof Auth !== "undefined" && Auth.isAuthenticated()) {
    const user = Auth.getUser();
    const uname = (user && user.username) ? user.username : "Host";
    const signinLink = document.getElementById('nav-signin-link');
    const ctaBtn = document.getElementById('nav-cta');
    if (signinLink) {
      signinLink.textContent = `👋 ${uname}`;
      signinLink.href = "javascript:void(0)";
      signinLink.onclick = () => Auth.redirectBasedOnRole();
    }
    if (ctaBtn) {
      ctaBtn.textContent = "My Dashboard ➔";
      ctaBtn.onclick = () => Auth.redirectBasedOnRole();
    }
  }
}
