/**
 * Global UI Helper & State Management (Vintage Retro Edition)
 */

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('bookforge_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function updateNavigation() {
  const user = getCurrentUser();
  const token = localStorage.getItem('bookforge_token');
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  // On dashboard.html, keep its dedicated nav
  if (window.location.pathname.includes('dashboard.html')) {
    return;
  }

  if (token && user) {
    const roleBadge = (user.roles && user.roles.includes('ROLE_ADMIN')) || user.role === 'ROLE_ADMIN'
      ? '<span class="badge badge-rust">ADMIN</span>' 
      : (((user.roles && user.roles.includes('ROLE_PROVIDER')) || user.role === 'ROLE_PROVIDER') ? '<span class="badge badge-approved">PROVIDER</span>' : '<span class="badge">CUSTOMER</span>');

    navLinks.innerHTML = `
      <a href="index.html" class="nav-link-item">Home</a>
      <a href="dashboard.html" class="btn btn-sm btn-rust btn-pill">Console ${roleBadge}</a>
      <button onclick="AuthAPI.logout()" class="btn btn-sm btn-outline btn-pill">Sign Out</button>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="index.html#earnings-calculator" class="nav-link-item">Host Earnings</a>
      <a href="index.html#rating-engine" class="nav-link-item">Rating Boost</a>
      <a href="login.html" class="nav-link-item">Sign In</a>
      <a href="signup.html" class="btn btn-sm btn-rust btn-pill">Register Space ➔</a>
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
    showToast(`Authenticated as ${seed.username}! Redirecting...`, 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
  } catch (err) {
    showToast(`Seed login failed: ${err.message}`, 'error');
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();
});
