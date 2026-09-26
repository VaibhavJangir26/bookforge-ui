/**
 * BookForge Authentication State & Routing Engine
 */
const Auth = {
  isAuthenticated: () => {
    return !!localStorage.getItem('bookforge_token');
  },

  getUser: () => {
    const userStr = localStorage.getItem('bookforge_user');
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        user = null;
      }
    }
    // Augment with userId from token if missing
    if (!user || !user.userId) {
      const token = Auth.getToken();
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload) {
              user = user || {};
              user.userId = payload.userId || payload.id || payload.sub;
              if (!user.username) user.username = payload.sub;
              if (!user.roles && payload.roles) user.roles = payload.roles;
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return user;
  },

  getUserId: () => {
    const user = Auth.getUser();
    if (user && user.userId) return user.userId;
    if (user && user.id) return user.id;
    const token = Auth.getToken();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          return payload.userId || payload.id || payload.sub || null;
        }
      } catch (e) {}
    }
    return (user && user.username) || null;
  },

  getToken: () => {
    return localStorage.getItem('bookforge_token');
  },


  logout: () => {
    localStorage.removeItem('bookforge_token');
    localStorage.removeItem('bookforge_user');
    localStorage.removeItem('pending_verify_email');
    localStorage.removeItem('signupIntent');
    const path = window.location.pathname;
    const isInSubdir = path.includes('/auth/') || path.includes('/dashboard/') || path.includes('/venues/');
    window.location.href = isInSubdir ? '../index.html' : 'index.html';
  },

  getPrimaryRole: () => {
    const user = Auth.getUser();
    if (!user) return 'ROLE_CUSTOMER';
    const roles = user.roles || (user.role ? [user.role] : []);
    if (roles.includes('ROLE_ADMIN') || user.username === 'admin') return 'ROLE_ADMIN';
    if (roles.includes('ROLE_PROVIDER') || user.username === 'ram123') return 'ROLE_PROVIDER';
    return 'ROLE_CUSTOMER';
  },

  isAdmin: () => {
    return Auth.getPrimaryRole() === 'ROLE_ADMIN';
  },

  isProvider: () => {
    return Auth.getPrimaryRole() === 'ROLE_PROVIDER';
  },

  isCustomer: () => {
    return Auth.getPrimaryRole() === 'ROLE_CUSTOMER';
  },

  redirectIfNotAuthenticated: (redirectUrl) => {
    if (!Auth.isAuthenticated()) {
      const path = window.location.pathname;
      const isInSubdir = path.includes('/auth/') || path.includes('/dashboard/') || path.includes('/venues/');
      const fallback = isInSubdir ? '../auth/login.html' : 'auth/login.html';
      window.location.href = redirectUrl || fallback;
    }
  },

  redirectBasedOnRole: () => {
    const role = Auth.getPrimaryRole();
    const path = window.location.pathname;
    const isInSubdir = path.includes('/auth/') || path.includes('/dashboard/') || path.includes('/venues/');
    const prefix = isInSubdir ? '../dashboard/' : 'dashboard/';

    if (role === 'ROLE_ADMIN') {
      window.location.href = prefix + 'admin.html';
    } else if (role === 'ROLE_PROVIDER') {
      window.location.href = prefix + 'provider.html';
    } else {
      window.location.href = prefix + 'customer.html';
    }
  }
};

window.Auth = Auth;
