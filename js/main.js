/**
 * Global UI Helper & State Management (Vintage Retro Edition)
 */

const SeedUsers = {
  admin: { username: 'admin', password: 'admin@123', role: 'ROLE_ADMIN' },
  provider: { username: 'ram123', password: 'ram@123', role: 'ROLE_PROVIDER' },
  customer: { username: 'shyam123', password: 'shyam@123', role: 'ROLE_CUSTOMER' }
};

function getCurrentUser() {
  return (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
}

function updateNavigation() {
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  const path = window.location.pathname;
  const isInSubdir = path.includes('/auth/') || path.includes('/dashboard/') || path.includes('/venues/');
  const root = isInSubdir ? '../' : '';

  if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
    const user = Auth.getUser();
    const role = Auth.getPrimaryRole();
    let roleText = 'MEMBER';
    let dashPage = 'customer.html';
    if (role === 'ROLE_ADMIN') {
      roleText = 'ADMIN';
      dashPage = 'admin.html';
    } else if (role === 'ROLE_PROVIDER') {
      roleText = 'PROVIDER';
      dashPage = 'provider.html';
    }
    const uname = (user && user.username) ? user.username : 'Member';

    navLinks.innerHTML = `
      <a href="${root}index.html" class="nav-link-item">Home</a>
      <a href="${root}index.html#how-it-works" class="nav-link-item">How It Works</a>
      <a href="${root}index.html#earnings-calculator" class="nav-link-item">Host Earnings</a>
      <span style="font-size:0.88rem; font-weight:600; color:var(--text-muted); align-self:center;">👋 ${uname}</span>
      <a href="${root}dashboard/${dashPage}" class="btn btn-sm btn-rust btn-pill" style="display:inline-flex; align-items:center; gap:0.4rem;">Console (${roleText}) ➔</a>
      <button onclick="Auth.logout()" class="btn btn-sm btn-outline btn-pill">Sign Out</button>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="${root}index.html#how-it-works" class="nav-link-item">How Hosting Works</a>
      <a href="${root}index.html#earnings-calculator" class="nav-link-item">Host Earnings</a>
      <a href="${root}index.html#categories-section" class="nav-link-item">Disciplines</a>
      <a href="${root}auth/login.html" class="nav-link-item">Sign In</a>
      <a href="${root}auth/signup.html" class="btn btn-sm btn-rust btn-pill">Get Started ➔</a>
    `;
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

async function quickLoginAs(roleKey) {
  const seed = SeedUsers[roleKey];
  if (!seed) return;

  try {
    showLoader(`AUTHENTICATING SEED ACCOUNT (${seed.username})...`);
    await AuthAPI.login({ username: seed.username, password: seed.password });
    showToast(`Authenticated as ${seed.username}! Navigating to console...`, 'success');
    setTimeout(() => {
      Auth.redirectBasedOnRole();
    }, 400);
  } catch (err) {
    showToast(`Seed login failed: ${err.message}`, 'error');
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();
});
