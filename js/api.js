/**
 * BookForge API Gateway Client
 * All requests route through API Gateway (default: http://localhost:8900)
 */

const API_BASE_URL = (function() {
  const custom = localStorage.getItem('api_gateway_url');
  if (custom && custom.includes('8904')) {
    localStorage.removeItem('api_gateway_url');
  }
  return localStorage.getItem('api_gateway_url') || 'http://localhost:8900/api/v1';
})();

// Toast and UI notification helpers
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;font-weight:700;cursor:pointer;margin-left:8px;font-size:1.1rem;line-height:1;">✕</button>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

function showLoader(text = 'EXECUTING REQUEST...') {
  let overlay = document.getElementById('global-loader');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'global-loader';
    overlay.className = 'loader-overlay';
    overlay.innerHTML = `<div class="loader-box" id="loader-text">${text}</div>`;
    document.body.appendChild(overlay);
  } else {
    const txt = document.getElementById('loader-text');
    if (txt) txt.textContent = text;
  }
  overlay.classList.add('active');
}

function hideLoader() {
  const overlay = document.getElementById('global-loader');
  if (overlay) overlay.classList.remove('active');
}

// Low-level fetch wrapper
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('bookforge_token');
  const headers = { ...options.headers };

  // If body is NOT FormData, default to JSON Content-Type
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    showLoader(options.loaderText || 'FETCHING DATA...');
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const errMsg = (data && (data.message || data.error)) || (typeof data === 'string' ? data : `Error ${res.status}: ${res.statusText}`);
      throw new Error(errMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  } finally {
    hideLoader();
  }
}

// -------------------------------------------------------------
// AUTH SERVICE (auth-service on port 8500 via gateway /api/v1/auth)
// -------------------------------------------------------------
const AuthAPI = {
  async login({ username, password }) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      loaderText: 'AUTHENTICATING USER...'
    });

    // Support accessToken / token / jwt fields from backend AuthResponseDTO
    const token = (data && (data.accessToken || data.token || data.jwt || data.jwtToken)) || '';
    if (token) {
      localStorage.setItem('bookforge_token', token);
    }
    
    const rolesArray = (data && data.roles) ? (Array.isArray(data.roles) ? data.roles : Array.from(data.roles)) : [];
    const primaryRole = rolesArray[0] || (username === 'admin' ? 'ROLE_ADMIN' : (username === 'ram123' ? 'ROLE_PROVIDER' : 'ROLE_CUSTOMER'));

    localStorage.setItem('bookforge_user', JSON.stringify({
      username: (data && data.username) || username,
      roles: rolesArray.length ? rolesArray : [primaryRole],
      role: primaryRole,
      accessToken: token
    }));

    return data;
  },

  async signup({ username, email, password }) {
    return await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
      loaderText: 'REGISTERING ACCOUNT...'
    });
  },

  async verify({ email, otp }) {
    const data = await apiRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
      loaderText: 'VERIFYING OTP...'
    });

    const token = (data && (data.accessToken || data.token || data.jwt || data.jwtToken)) || '';
    if (token) {
      localStorage.setItem('bookforge_token', token);
    }

    const rolesArray = (data && data.roles) ? (Array.isArray(data.roles) ? data.roles : Array.from(data.roles)) : [];
    const primaryRole = rolesArray[0] || 'ROLE_CUSTOMER';

    localStorage.setItem('bookforge_user', JSON.stringify({
      username: (data && data.username) || email,
      roles: rolesArray.length ? rolesArray : [primaryRole],
      role: primaryRole,
      accessToken: token
    }));

    return data;
  },

  logout() {
    localStorage.removeItem('bookforge_token');
    localStorage.removeItem('bookforge_user');
    window.location.href = 'login.html';
  }
};

// -------------------------------------------------------------
// CATEGORY MODULE (Admin & Public)
// -------------------------------------------------------------
const CategoryAPI = {
  async getAll() {
    return await apiRequest('/categories', {
      method: 'GET',
      loaderText: 'LOADING CATEGORIES...'
    });
  },

  async getById(id) {
    return await apiRequest(`/categories/${id}`, {
      method: 'GET',
      loaderText: 'FETCHING CATEGORY...'
    });
  },

  async create({ name, slug, description }) {
    return await apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, slug, description }),
      loaderText: 'CREATING CATEGORY...'
    });
  },

  async update({ id, name, slug, description }) {
    return await apiRequest(`/categories`, {
      method: 'PUT',
      body: JSON.stringify({ id, name, slug, description }),
      loaderText: 'UPDATING CATEGORY...'
    });
  },

  async delete(id) {
    return await apiRequest(`/categories/${id}`, {
      method: 'DELETE',
      loaderText: 'DELETING CATEGORY...'
    });
  }
};

// -------------------------------------------------------------
// VENUE MODULE (Provider, Admin, Customer)
// -------------------------------------------------------------
const VenueAPI = {
  async getPublished(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return await apiRequest(`/venues?${qs}`, {
      method: 'GET',
      loaderText: 'FETCHING PUBLISHED VENUES...'
    });
  },

  async getProviderVenues() {
    return await apiRequest('/venues/provider', {
      method: 'GET',
      loaderText: 'FETCHING YOUR VENUES...'
    });
  },

  async getAllForAdmin(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return await apiRequest(`/venues/admin?${qs}`, {
      method: 'GET',
      loaderText: 'FETCHING ALL VENUES (ADMIN)...'
    });
  },

  async getById(id) {
    return await apiRequest(`/venues/${id}`, {
      method: 'GET',
      loaderText: 'FETCHING VENUE DETAILS...'
    });
  },

  async create({ name, slug, description, contactEmail, contactPhone, categoryId, address }) {
    return await apiRequest('/venues', {
      method: 'POST',
      body: JSON.stringify({
        name,
        slug,
        description,
        contactEmail,
        contactPhone,
        categoryId,
        address
      }),
      loaderText: 'CREATING VENUE...'
    });
  },

  async update(id, data) {
    return await apiRequest(`/venues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      loaderText: 'UPDATING VENUE...'
    });
  },

  async updateStatus(id, venueStatus) {
    return await apiRequest(`/venues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ venueStatus }),
      loaderText: 'UPDATING VENUE STATUS...'
    });
  },

  async delete(id) {
    return await apiRequest(`/venues/${id}`, {
      method: 'DELETE',
      loaderText: 'DELETING VENUE...'
    });
  }
};

// -------------------------------------------------------------
// SPACE MODULE (Multipart: JSON request + images)
// -------------------------------------------------------------
const SpaceAPI = {
  async getByVenue(venueId) {
    return await apiRequest(`/spaces/venue/${venueId}`, {
      method: 'GET',
      loaderText: 'FETCHING SPACES FOR VENUE...'
    });
  },

  async getById(id) {
    return await apiRequest(`/spaces/${id}`, {
      method: 'GET',
      loaderText: 'FETCHING SPACE DETAILS...'
    });
  },

  async create(data, imageFiles = []) {
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('request', jsonBlob);

    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
      }
    }

    return await apiRequest('/spaces', {
      method: 'POST',
      body: formData,
      loaderText: 'CREATING SPACE WITH IMAGES...'
    });
  },

  async update(id, data, imageFiles = []) {
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('request', jsonBlob);

    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
      }
    }

    return await apiRequest(`/spaces/${id}`, {
      method: 'PUT',
      body: formData,
      loaderText: 'UPDATING SPACE...'
    });
  },

  async delete(id) {
    return await apiRequest(`/spaces/${id}`, {
      method: 'DELETE',
      loaderText: 'DELETING SPACE...'
    });
  }
};

// -------------------------------------------------------------
// RESOURCE MODULE (Multipart: JSON request + images)
// -------------------------------------------------------------
const ResourceAPI = {
  async getBySpace(spaceId) {
    return await apiRequest(`/resources/space/${spaceId}`, {
      method: 'GET',
      loaderText: 'FETCHING SPACE RESOURCES...'
    });
  },

  async getById(id) {
    return await apiRequest(`/resources/${id}`, {
      method: 'GET',
      loaderText: 'FETCHING RESOURCE...'
    });
  },

  async create(data, imageFiles = []) {
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('request', jsonBlob);

    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
      }
    }

    return await apiRequest('/resources', {
      method: 'POST',
      body: formData,
      loaderText: 'CREATING RESOURCE...'
    });
  },

  async update(id, data, imageFiles = []) {
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('request', jsonBlob);

    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
      }
    }

    return await apiRequest(`/resources/${id}`, {
      method: 'PUT',
      body: formData,
      loaderText: 'UPDATING RESOURCE...'
    });
  },

  async delete(id) {
    return await apiRequest(`/resources/${id}`, {
      method: 'DELETE',
      loaderText: 'DELETING RESOURCE...'
    });
  }
};

// -------------------------------------------------------------
// AVAILABILITY MODULE (Rules, Blackouts, Slot Queries)
// -------------------------------------------------------------
const AvailabilityAPI = {
  async getRules(spaceId) {
    return await apiRequest(`/availability/rules/space/${spaceId}`, {
      method: 'GET',
      loaderText: 'FETCHING AVAILABILITY RULES...'
    });
  },

  async createRule({ spaceId, dayOfWeek, openingTime, closingTime, open, slotDurationInMinutes }) {
    return await apiRequest('/availability/rules', {
      method: 'POST',
      body: JSON.stringify({
        spaceId,
        dayOfWeek,
        openingTime,
        closingTime,
        open: open !== false,
        slotDurationInMinutes: parseInt(slotDurationInMinutes, 10) || 60
      }),
      loaderText: 'CONFIGURING AVAILABILITY RULE...'
    });
  },

  async deleteRule(ruleId) {
    return await apiRequest(`/availability/rules/${ruleId}`, {
      method: 'DELETE',
      loaderText: 'DELETING AVAILABILITY RULE...'
    });
  },

  async getBlackouts(spaceId) {
    return await apiRequest(`/availability/blackouts/space/${spaceId}`, {
      method: 'GET',
      loaderText: 'FETCHING BLACKOUT PERIODS...'
    });
  },

  async createBlackout({ spaceId, startDateTime, endDateTime, reason }) {
    return await apiRequest('/availability/blackouts', {
      method: 'POST',
      body: JSON.stringify({ spaceId, startDateTime, endDateTime, reason }),
      loaderText: 'CONFIGURING BLACKOUT WINDOW...'
    });
  },

  async deleteBlackout(blackoutId) {
    return await apiRequest(`/availability/blackouts/${blackoutId}`, {
      method: 'DELETE',
      loaderText: 'REMOVING BLACKOUT PERIOD...'
    });
  },

  async getSlots({ spaceId, date, slotDurationInMinutes }) {
    const qs = new URLSearchParams({
      spaceId,
      date,
      ...(slotDurationInMinutes ? { slotDurationInMinutes } : {})
    }).toString();

    return await apiRequest(`/availability/slots?${qs}`, {
      method: 'GET',
      loaderText: 'CALCULATING OPEN SLOTS...'
    });
  }
};

// -------------------------------------------------------------
// PRICING MODULE (Rules, Calculations)
// -------------------------------------------------------------
const PricingAPI = {
  async getRules(spaceId) {
    return await apiRequest(`/pricing/rules/space/${spaceId}`, {
      method: 'GET',
      loaderText: 'FETCHING DYNAMIC PRICING RULES...'
    });
  },

  async createRule(ruleData) {
    return await apiRequest('/pricing/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData),
      loaderText: 'CONFIGURING PRICING RULE...'
    });
  },

  async deleteRule(ruleId) {
    return await apiRequest(`/pricing/rules/${ruleId}`, {
      method: 'DELETE',
      loaderText: 'DELETING PRICING RULE...'
    });
  },

  async calculate({ spaceId, slotStartTime, slotEndTime, resourceIds = [] }) {
    return await apiRequest('/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ spaceId, slotStartTime, slotEndTime, resourceIds }),
      loaderText: 'CALCULATING QUOTE...'
    });
  }
};

// Seed credentials matching Java DataInitializer.java
const SeedUsers = {
  customer: { username: 'shyam123', password: 'shyam@123', role: 'ROLE_CUSTOMER' },
  provider: { username: 'ram123', password: 'ram@123', role: 'ROLE_PROVIDER' },
  admin: { username: 'admin', password: 'admin@123', role: 'ROLE_ADMIN' }
};
