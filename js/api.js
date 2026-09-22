/**
 * BookForge Unified API Client
 * Uses window.BOOKFORGE_CONFIG with full microservice endpoint synchronization.
 */

const CONFIG = window.BOOKFORGE_CONFIG || {
  API_BASE_URL: 'http://localhost:8900/api/v1',
  AUTH_SERVICE_URL: 'http://localhost:8500/api/v1',
  CATALOG_SERVICE_URL: 'http://localhost:8600/api/v1',
  ENDPOINTS: {
    AUTH: { LOGIN: '/auth/login', SIGNUP: '/auth/signup', VERIFY: '/auth/verify', REFRESH: '/auth/refresh', LOGOUT: '/auth/logout', PROFILE_ME: '/profile/me' },
    CATEGORY: { GET_ALL: '/category', CREATE: '/category', UPDATE: '/category', DELETE: (id) => `/category/${id}` },
    VENUE: { GET_ALL: '/venues', GET_MY_VENUES: '/venues/my-venues', GET_DETAILS: (id) => `/venues/${id}`, CREATE: '/venues', UPDATE_DETAILS: (id) => `/venues/${id}/details`, UPDATE_STATUS: (id) => `/venues/${id}/status`, DELETE: (id) => `/venues/${id}` },
    SPACE: { GET_ALL: '/spaces', GET_BY_VENUE: (id) => `/spaces/venue/${id}`, GET_DETAILS: (id) => `/spaces/${id}`, CREATE: '/spaces', UPDATE: (id) => `/spaces/${id}`, DELETE: (id) => `/spaces/${id}` },
    RESOURCE: { GET_ALL: '/resources', GET_BY_SPACE: (id) => `/resources/space/${id}`, GET_DETAILS: (id) => `/resources/${id}`, CREATE: '/resources', UPDATE: (id) => `/resources/${id}`, DELETE: (id) => `/resources/${id}` },
    AVAILABILITY: { RULES_BY_SPACE: (id) => `/availability/rules/space/${id}`, RULES: '/availability/rules', DELETE_RULE: (id) => `/availability/rules/${id}`, BLACKOUTS_BY_SPACE: (id) => `/availability/blackouts/space/${id}`, BLACKOUTS: '/availability/blackouts', DELETE_BLACKOUT: (id) => `/availability/blackouts/${id}`, SLOTS: (id) => `/availability/slots/space/${id}` },
    PRICING: { RULES_BY_SPACE: (id) => `/pricing/rules/space/${id}`, RULES: '/pricing/rules', DELETE_RULE: (id) => `/pricing/rules/${id}`, CALCULATE: '/pricing/calculate' }
  }
};

const API_BASE_URL = (function() {
  const custom = localStorage.getItem('api_gateway_url');
  if (custom && custom.includes('8904')) {
    localStorage.removeItem('api_gateway_url');
  }
  return localStorage.getItem('api_gateway_url') || CONFIG.API_BASE_URL;
})();

// UI Toasts and Global Loaders
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
  toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;font-weight:700;cursor:pointer;margin-left:8px;font-size:1.1rem;line-height:1;color:inherit;">✕</button>`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4500);
}

function showLoader(text = 'PROCESSING REQUEST...') {
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

// Low-level fetch wrapper with automatic CommonApiResponse unwrapping
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('bookforge_token');
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    showLoader(options.loaderText || 'EXECUTING TRANSACTION...');
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body
    });

    const contentType = res.headers.get('content-type') || '';
    let responseData;
    if (contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      responseData = await res.text();
    }

    if (!res.ok) {
      const errMsg = (responseData && (responseData.message || responseData.error)) || 
                     (typeof responseData === 'string' ? responseData : `Error ${res.status}: ${res.statusText}`);
      throw new Error(errMsg);
    }

    if (responseData && typeof responseData === 'object' && responseData.data !== undefined) {
      return responseData.data;
    }

    return responseData;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  } finally {
    hideLoader();
  }
}

// -------------------------------------------------------------
// AUTH & PROFILE SERVICE
// -------------------------------------------------------------
const AuthAPI = {
  async login({ username, password }) {
    const data = await apiRequest(CONFIG.ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      loaderText: 'AUTHENTICATING USER...'
    });

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
    // All users register as standard Customers by default
    return await apiRequest(CONFIG.ENDPOINTS.AUTH.SIGNUP, {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
      loaderText: 'REGISTERING ACCOUNT...'
    });
  },

  async verify({ email, otp }) {
    const data = await apiRequest(CONFIG.ENDPOINTS.AUTH.VERIFY, {
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

  async getProfile() {
    return await apiRequest(CONFIG.ENDPOINTS.AUTH.PROFILE_ME, {
      method: 'GET',
      loaderText: 'FETCHING PROFILE...'
    });
  },

  async updateProfile(dto) {
    return await apiRequest(CONFIG.ENDPOINTS.AUTH.PROFILE_ME, {
      method: 'PATCH',
      body: JSON.stringify(dto),
      loaderText: 'UPDATING PROFILE...'
    });
  },

  logout() {
    localStorage.removeItem('bookforge_token');
    localStorage.removeItem('bookforge_user');
    window.location.href = 'login.html';
  }
};

// -------------------------------------------------------------
// CATEGORY MODULE (Admin Only for Write)
// -------------------------------------------------------------
const CategoryAPI = {
  async getMyVenues() {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.GET_MY_VENUES || '/venues/my-venues', {
      method: 'GET',
      loaderText: 'FETCHING MY VENUES...'
    });
  },

  async getAll() {
    return await apiRequest(CONFIG.ENDPOINTS.CATEGORY.GET_ALL, {
      method: 'GET',
      loaderText: 'LOADING CATEGORIES...'
    });
  },

  async create({ name, slug, description }) {
    return await apiRequest(CONFIG.ENDPOINTS.CATEGORY.CREATE, {
      method: 'POST',
      body: JSON.stringify({ name, slug, description }),
      loaderText: 'CREATING CATEGORY...'
    });
  },

  async update({ id, name, slug, description }) {
    return await apiRequest(CONFIG.ENDPOINTS.CATEGORY.UPDATE, {
      method: 'PATCH',
      body: JSON.stringify({ id, name, slug, description }),
      loaderText: 'UPDATING CATEGORY...'
    });
  },

  async delete(id) {
    return await apiRequest(CONFIG.ENDPOINTS.CATEGORY.DELETE(id), {
      method: 'DELETE',
      loaderText: 'DELETING CATEGORY...'
    });
  }
};

// -------------------------------------------------------------
// VENUE MODULE (Provider Only for Create/Edit)
// -------------------------------------------------------------
const VenueAPI = {
  async getMyVenues() {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.GET_MY_VENUES || '/venues/my-venues', {
      method: 'GET',
      loaderText: 'FETCHING MY VENUES...'
    });
  },

  async getAll() {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.GET_ALL, {
      method: 'GET',
      loaderText: 'FETCHING VENUES...'
    });
  },

  async getById(id) {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.GET_DETAILS(id), {
      method: 'GET',
      loaderText: 'FETCHING VENUE DETAILS...'
    });
  },

  async create({ name, slug, description, contactEmail, contactPhone, categoryId, address }) {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.CREATE, {
      method: 'POST',
      body: JSON.stringify({
        name,
        slug,
        description,
        contactEmail,
        contactPhone,
        categoryId,
        address: {
          addressLine: address.addressLine,
          city: address.city,
          state: address.state,
          postalCode: parseInt(address.postalCode, 10) || 0
        }
      }),
      loaderText: 'PUBLISHING VENUE...'
    });
  },

  async updateDetails(id, data) {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.UPDATE_DETAILS(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
      loaderText: 'UPDATING VENUE DETAILS...'
    });
  },

  async updateStatus(id, venueStatus) {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.UPDATE_STATUS(id), {
      method: 'PATCH',
      body: JSON.stringify({ venueStatus }),
      loaderText: 'UPDATING VENUE STATUS...'
    });
  },

  async delete(id) {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.DELETE(id), {
      method: 'DELETE',
      loaderText: 'DELETING VENUE...'
    });
  }
};

// -------------------------------------------------------------
// SPACE MODULE (Provider Only)
// -------------------------------------------------------------
const SpaceAPI = {
  async getMyVenues() {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.GET_MY_VENUES || '/venues/my-venues', {
      method: 'GET',
      loaderText: 'FETCHING MY VENUES...'
    });
  },

  async getAll() {
    return await apiRequest(CONFIG.ENDPOINTS.SPACE.GET_ALL, {
      method: 'GET',
      loaderText: 'LOADING ALL SPACES...'
    });
  },

  async getByVenue(venueId) {
    return await apiRequest(CONFIG.ENDPOINTS.SPACE.GET_BY_VENUE(venueId), {
      method: 'GET',
      loaderText: 'LOADING VENUE SPACES...'
    });
  },

  async getById(id) {
    return await apiRequest(CONFIG.ENDPOINTS.SPACE.GET_DETAILS(id), {
      method: 'GET',
      loaderText: 'FETCHING SPACE SPECIFICATIONS...'
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

    return await apiRequest(CONFIG.ENDPOINTS.SPACE.CREATE, {
      method: 'POST',
      body: formData,
      loaderText: 'PROVISIONING SPACE...'
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

    return await apiRequest(CONFIG.ENDPOINTS.SPACE.UPDATE(id), {
      method: 'PATCH',
      body: formData,
      loaderText: 'UPDATING SPACE...'
    });
  },

  async delete(id) {
    return await apiRequest(CONFIG.ENDPOINTS.SPACE.DELETE(id), {
      method: 'DELETE',
      loaderText: 'DELETING SPACE...'
    });
  }
};

// -------------------------------------------------------------
// RESOURCE MODULE (Provider Only)
// -------------------------------------------------------------
const ResourceAPI = {
  async getMyVenues() {
    return await apiRequest(CONFIG.ENDPOINTS.VENUE.GET_MY_VENUES || '/venues/my-venues', {
      method: 'GET',
      loaderText: 'FETCHING MY VENUES...'
    });
  },

  async getAll() {
    return await apiRequest(CONFIG.ENDPOINTS.RESOURCE.GET_ALL, {
      method: 'GET',
      loaderText: 'LOADING RESOURCES...'
    });
  },

  async getBySpace(spaceId) {
    return await apiRequest(CONFIG.ENDPOINTS.RESOURCE.GET_BY_SPACE(spaceId), {
      method: 'GET',
      loaderText: 'FETCHING SPACE RESOURCES...'
    });
  },

  async getById(id) {
    return await apiRequest(CONFIG.ENDPOINTS.RESOURCE.GET_DETAILS(id), {
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

    return await apiRequest(CONFIG.ENDPOINTS.RESOURCE.CREATE, {
      method: 'POST',
      body: formData,
      loaderText: 'ATTACHING RESOURCE HARDWARE...'
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

    return await apiRequest(CONFIG.ENDPOINTS.RESOURCE.UPDATE(id), {
      method: 'PATCH',
      body: formData,
      loaderText: 'UPDATING RESOURCE...'
    });
  },

  async delete(id) {
    return await apiRequest(CONFIG.ENDPOINTS.RESOURCE.DELETE(id), {
      method: 'DELETE',
      loaderText: 'DELETING RESOURCE...'
    });
  }
};

// -------------------------------------------------------------
// AVAILABILITY MODULE
// -------------------------------------------------------------
const AvailabilityAPI = {
  async getRules(spaceId) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.RULES_BY_SPACE(spaceId), {
      method: 'GET',
      loaderText: 'FETCHING OPERATING RULES...'
    });
  },

  async createRule({ spaceId, dayOfWeek, openingTime, closingTime, open, slotDurationInMinutes }) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.RULES, {
      method: 'POST',
      body: JSON.stringify({
        spaceId,
        dayOfWeek,
        openingTime,
        closingTime,
        open: open !== false,
        slotDurationInMinutes: parseInt(slotDurationInMinutes, 10) || 60
      }),
      loaderText: 'CONFIGURING SCHEDULE RULE...'
    });
  },

  async deleteRule(ruleId) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.DELETE_RULE(ruleId), {
      method: 'DELETE',
      loaderText: 'DELETING SCHEDULE RULE...'
    });
  },

  async getBlackouts(spaceId) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.BLACKOUTS_BY_SPACE(spaceId), {
      method: 'GET',
      loaderText: 'FETCHING BLACKOUT WINDOWS...'
    });
  },

  async createBlackout({ spaceId, startDateTime, endDateTime, reason }) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.BLACKOUTS, {
      method: 'POST',
      body: JSON.stringify({ spaceId, startDateTime, endDateTime, reason }),
      loaderText: 'CONFIGURING BLACKOUT WINDOW...'
    });
  },

  async deleteBlackout(blackoutId) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.DELETE_BLACKOUT(blackoutId), {
      method: 'DELETE',
      loaderText: 'REMOVING BLACKOUT...'
    });
  },

  async getSlots({ spaceId, startDate, endDate }) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString();

    return await apiRequest(`${CONFIG.ENDPOINTS.AVAILABILITY.SLOTS(spaceId)}${qs ? '?' + qs : ''}`, {
      method: 'GET',
      loaderText: 'QUERYING OPEN SLOTS...'
    });
  }
};

// -------------------------------------------------------------
// PRICING MODULE
// -------------------------------------------------------------
const PricingAPI = {
  async getRules(spaceId) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.RULES_BY_SPACE(spaceId), {
      method: 'GET',
      loaderText: 'FETCHING DYNAMIC PRICING RULES...'
    });
  },

  async createRule(ruleData) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.RULES, {
      method: 'POST',
      body: JSON.stringify(ruleData),
      loaderText: 'SAVING PRICING RULE...'
    });
  },

  async deleteRule(ruleId) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.DELETE_RULE(ruleId), {
      method: 'DELETE',
      loaderText: 'DELETING PRICING RULE...'
    });
  },

  async calculate({ spaceId, slotStartTime, slotEndTime, resourceIds = [] }) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.CALCULATE, {
      method: 'POST',
      body: JSON.stringify({ spaceId, slotStartTime, slotEndTime, resourceIds }),
      loaderText: 'CALCULATING TOTAL QUOTE...'
    });
  }
};

// Seed credentials helper for developer testing
const SeedUsers = {
  customer: { username: 'shyam123', password: 'shyam@123', role: 'ROLE_CUSTOMER' },
  provider: { username: 'ram123', password: 'ram@123', role: 'ROLE_PROVIDER' },
  admin: { username: 'admin', password: 'admin@123', role: 'ROLE_ADMIN' }
};
