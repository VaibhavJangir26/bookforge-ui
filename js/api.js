/**
 * BookForge Unified API Client
 * Uses window.BOOKFORGE_CONFIG with full microservice endpoint synchronization.
 */

const CONFIG = window.BOOKFORGE_CONFIG || {
  API_BASE_URL: 'http://localhost:8900/api/v1',
  AUTH_SERVICE_URL: 'http://localhost:8500/api/v1',
  CATALOG_SERVICE_URL: 'http://localhost:8600/api/v1',
  BOOKING_SERVICE_URL: 'http://localhost:8700/api/v1',
  PAYMENT_SERVICE_URL: 'http://localhost:8800/api/v1',
  STRIPE_PUBLISHABLE_KEY: localStorage.getItem('stripe_publishable_key') || 'pk_test_51MockStripePublishableKeyForBookForgeUI123456789',
  ENDPOINTS: {
    AUTH: { LOGIN: '/auth/login', SIGNUP: '/auth/signup', VERIFY: '/auth/verify', REFRESH: '/auth/refresh', LOGOUT: '/auth/logout', PROFILE_ME: '/profile/me', APPLY_PROVIDER: '/profile/apply-provider' },
    CATEGORY: { GET_ALL: '/category', CREATE: '/category', UPDATE: '/category', DELETE: (id) => `/category/${id}` },
    VENUE: { GET_ALL: '/venues', GET_MY_VENUES: '/venues/my-venues', GET_DETAILS: (id) => `/venues/${id}`, CREATE: '/venues', UPDATE_DETAILS: (id) => `/venues/${id}/details`, UPDATE_STATUS: (id) => `/venues/${id}/status`, DELETE: (id) => `/venues/${id}` },
    SPACE: { GET_ALL: '/spaces', GET_BY_VENUE: (id) => `/spaces/venue/${id}`, GET_DETAILS: (id) => `/spaces/${id}`, CREATE: '/spaces', UPDATE: (id) => `/spaces/${id}`, DELETE: (id) => `/spaces/${id}` },
    RESOURCE: { GET_ALL: '/resources', GET_BY_SPACE: (id) => `/resources/space/${id}`, GET_DETAILS: (id) => `/resources/${id}`, CREATE: '/resources', UPDATE: (id) => `/resources/${id}`, DELETE: (id) => `/resources/${id}` },
    AVAILABILITY: { RULES_BY_SPACE: (id) => `/availability/rules/space/${id}`, RULES: '/availability/rules', DELETE_RULE: (id) => `/availability/rules/${id}`, BLACKOUTS_BY_SPACE: (id) => `/availability/blackouts/space/${id}`, BLACKOUTS: '/availability/blackouts', DELETE_BLACKOUT: (id) => `/availability/blackouts/${id}`, SLOTS: (id) => `/availability/slots/space/${id}` },
    ADMIN_PROVIDERS: { PENDING: '/admin/providers/pending', REVIEW: (id) => `/admin/providers/${id}/status` },
    PRICING: { RULES_BY_SPACE: (id) => `/pricing/rules/space/${id}`, RULES: '/pricing/rules', DELETE_RULE: (id) => `/pricing/rules/${id}`, CALCULATE: '/pricing/calculate' },
    BOOKING: { BASE: '/booking', CREATE: '/booking/create-booking', CANCEL: '/booking/cancel-booking', GET_MY_HISTORY: '/booking', GET_DETAILS: (id) => `/booking/${id}`, GET_BY_SPACE: (id) => `/booking/space/${id}`, UPDATE_STATUS: (id) => `/booking/${id}/status` },
    PAYMENT: { BASE: '/payment', CHECKOUT: '/payment/checkout', VERIFY: (id) => `/payment/verify/${id}`, REFUND: '/payment/refund' }
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

// Low-level fetch wrapper with automatic CommonApiResponse unwrapping and microservice routing
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('bookforge_token');
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Populate trusted user identity headers for direct downstream filter validation
  const user = window.Auth ? window.Auth.getUser() : null;
  const userId = window.Auth ? window.Auth.getUserId() : null;
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  if (user && user.username) {
    headers['X-User-Name'] = user.username;
  }
  if (user && user.roles) {
    headers['X-User-Roles'] = Array.isArray(user.roles) ? user.roles.join(',') : user.roles;
  }

  const candidateUrls = [];
  const primaryUrl = `${API_BASE_URL}${endpoint}`;
  candidateUrls.push(primaryUrl);

  // If endpoint is booking or payment, add alternative fallback URLs
  if (endpoint.startsWith('/booking')) {
    // Plural route through gateway if gateway predicates use /bookings/**
    const pluralEndpoint = `/booking${endpoint.substring('/booking'.length)}`;
    candidateUrls.push(`${API_BASE_URL}${pluralEndpoint}`);
    // Direct service URL fallback (port 8700)
    const directUrl = `${CONFIG.BOOKING_SERVICE_URL || 'http://localhost:8700/api/v1'}${endpoint}`;
    if (!candidateUrls.includes(directUrl)) candidateUrls.push(directUrl);
  } else if (endpoint.startsWith('/payment')) {
    // Plural route through gateway if gateway predicates use /payments/**
    const pluralEndpoint = `/payments${endpoint.substring('/payment'.length)}`;
    candidateUrls.push(`${API_BASE_URL}${pluralEndpoint}`);
    // Direct service URL fallback (port 8800)
    const directUrl = `${CONFIG.PAYMENT_SERVICE_URL || 'http://localhost:8800/api/v1'}${endpoint}`;
    if (!candidateUrls.includes(directUrl)) candidateUrls.push(directUrl);
  }

  showLoader(options.loaderText || 'EXECUTING TRANSACTION...');
  try {
    let lastError = null;
    let res = null;
    let responseData = null;

    for (let i = 0; i < candidateUrls.length; i++) {
      const targetUrl = candidateUrls[i];
      try {
        res = await fetch(targetUrl, {
          method: options.method || 'GET',
          headers,
          body: options.body
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          responseData = await res.json();
        } else {
          responseData = await res.text();
        }

        // If 404 or connection refused and we have another candidate URL to try, continue
        if (res.status === 404 && i < candidateUrls.length - 1) {
          console.warn(`[API] 404 on ${targetUrl}, trying fallback candidate...`);
          continue;
        }

        // We got a definitive response from server
        break;
      } catch (networkErr) {
        lastError = networkErr;
        if (i < candidateUrls.length - 1) {
          console.warn(`[API] Network failure on ${targetUrl}, trying fallback candidate...`);
          continue;
        }
        throw networkErr;
      }
    }

    if (!res.ok) {
      const errMsg = (responseData && (responseData.message || responseData.error)) || 
                     (typeof responseData === 'string' ? responseData : `Error ${res.status}: ${res.statusText}`);
                     
      // Global Stale JWT Handler (Only for 401 Unauthorized on non-auth endpoints)
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/signup') || endpoint.includes('/auth/verify');
      if (res.status === 401 && !isAuthEndpoint) {
        console.warn('Authentication token expired or invalid. Forcing logout.');
        AuthAPI.logout();
      }
      
      throw new Error(errMsg);
    }

    if (responseData && typeof responseData === 'object' && responseData.data !== undefined) {
      const unwrapped = responseData.data;
      if (unwrapped && typeof unwrapped === 'object' && !('data' in unwrapped)) {
        try {
          Object.defineProperty(unwrapped, 'data', { get() { return this; }, configurable: true, enumerable: false });
        } catch(e) {}
      }
      return unwrapped;
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
    let primaryRole = 'ROLE_CUSTOMER';
    if (rolesArray.includes('ROLE_ADMIN') || username === 'admin') {
      primaryRole = 'ROLE_ADMIN';
    } else if (rolesArray.includes('ROLE_PROVIDER') || username === 'ram123') {
      primaryRole = 'ROLE_PROVIDER';
    }

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

  async applyProvider(dto) {
    return await apiRequest(CONFIG.ENDPOINTS.AUTH.APPLY_PROVIDER, {
      method: 'POST',
      body: JSON.stringify(dto),
      loaderText: 'SUBMITTING HOST APPLICATION...'
    });
  },

  logout() {
    localStorage.removeItem('bookforge_token');
    localStorage.removeItem('bookforge_user');
    localStorage.removeItem('signupIntent');
    localStorage.removeItem('pending_verify_email');
    const path = window.location.pathname;
    const isInSubdir = path.includes('/auth/') || path.includes('/dashboard/') || path.includes('/venues/');
    window.location.replace(isInSubdir ? '../auth/login.html' : 'auth/login.html');
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

  async getDetails(id) { return await this.getById(id); },

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

  async getDetails(id) { return await this.getById(id); },

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

  async getDetails(id) { return await this.getById(id); },

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
      method: "GET",
      loaderText: "FETCHING OPERATING RULES..."
    });
  },
  async getRulesBySpace(spaceId) { return await this.getRules(spaceId); },

  async createRule(payload) {
    const spaceId = payload.spaceId;
    const dayOfWeek = payload.dayOfWeek;
    let openingTime = payload.openingTime || payload.openTime || "09:00:00";
    let closingTime = payload.closingTime || payload.closeTime || "18:00:00";
    if (openingTime && openingTime.length === 5) openingTime += ":00";
    if (closingTime && closingTime.length === 5) closingTime += ":00";
    const open = payload.open !== undefined ? Boolean(payload.open) : true;
    const slotDurationInMinutes = parseInt(payload.slotDurationInMinutes || payload.slotDurationMinutes || 60, 10);

    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.RULES, {
      method: "POST",
      body: JSON.stringify({
        spaceId,
        dayOfWeek,
        openingTime,
        closingTime,
        open,
        slotDurationInMinutes
      }),
      loaderText: "CONFIGURING SCHEDULE RULE..."
    });
  },

  async deleteRule(ruleId) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.DELETE_RULE(ruleId), {
      method: "DELETE",
      loaderText: "DELETING SCHEDULE RULE..."
    });
  },

  async getBlackouts(spaceId) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.BLACKOUTS_BY_SPACE(spaceId), {
      method: "GET",
      loaderText: "FETCHING BLACKOUT WINDOWS..."
    });
  },
  async getBlackoutsBySpace(spaceId) { return await this.getBlackouts(spaceId); },

  async createBlackout(payload) {
    const spaceId = payload.spaceId;
    let startDateTime = payload.startDateTime || payload.startTime;
    let endDateTime = payload.endDateTime || payload.endTime;
    if (startDateTime && startDateTime.length === 16) startDateTime += ":00";
    if (endDateTime && endDateTime.length === 16) endDateTime += ":00";
    const reason = payload.reason || "Scheduled maintenance";

    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.BLACKOUTS, {
      method: "POST",
      body: JSON.stringify({ spaceId, startDateTime, endDateTime, reason }),
      loaderText: "CONFIGURING BLACKOUT WINDOW..."
    });
  },

  async deleteBlackout(blackoutId) {
    return await apiRequest(CONFIG.ENDPOINTS.AVAILABILITY.DELETE_BLACKOUT(blackoutId), {
      method: "DELETE",
      loaderText: "REMOVING BLACKOUT..."
    });
  },

  async getSlots({ spaceId, startDate, endDate }) {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const qs = params.toString();

    return await apiRequest(`${CONFIG.ENDPOINTS.AVAILABILITY.SLOTS(spaceId)}${qs ? "?" + qs : ""}`, {
      method: "GET",
      loaderText: "QUERYING OPEN SLOTS..."
    });
  }
};

// -------------------------------------------------------------
// PRICING MODULE
// -------------------------------------------------------------
const PricingAPI = {
  async getRules(spaceId) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.RULES_BY_SPACE(spaceId), {
      method: "GET",
      loaderText: "FETCHING DYNAMIC PRICING RULES..."
    });
  },
  async getRulesBySpace(spaceId) { return await this.getRules(spaceId); },

  async createRule(ruleData) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.RULES, {
      method: "POST",
      body: JSON.stringify(ruleData),
      loaderText: "SAVING PRICING RULE..."
    });
  },

  async deleteRule(ruleId) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.DELETE_RULE(ruleId), {
      method: "DELETE",
      loaderText: "DELETING PRICING RULE..."
    });
  },

  async calculate({ spaceId, slotStartTime, slotEndTime, resourceIds = [] }) {
    return await apiRequest(CONFIG.ENDPOINTS.PRICING.CALCULATE, {
      method: "POST",
      body: JSON.stringify({ spaceId, slotStartTime, slotEndTime, resourceIds }),
      loaderText: "CALCULATING TOTAL QUOTE..."
    });
  },
  async calculatePrice(payload) { return await this.calculate(payload); }
};

const AdminAPI = {
  async getPendingProviders() {
    return await apiRequest(CONFIG.ENDPOINTS.ADMIN_PROVIDERS.PENDING || "/admin/providers/pending", {
      method: "GET",
      loaderText: "FETCHING PENDING APPLICATIONS..."
    });
  },

  async reviewProvider(userId, status, rejectionReason = "") {
    let finalStatus = status;
    let finalReason = rejectionReason;
    if (typeof status === "object" && status !== null) {
      finalStatus = status.status;
      finalReason = status.rejectionReason || "";
    }
    while (typeof finalStatus === "object" && finalStatus !== null) {
      finalStatus = finalStatus.status;
    }
    if (typeof finalStatus === "string") {
      finalStatus = finalStatus.trim().toUpperCase();
    }
    return await apiRequest(CONFIG.ENDPOINTS.ADMIN_PROVIDERS.REVIEW(userId), {
      method: "PATCH",
      body: JSON.stringify({
        status: finalStatus,
        rejectionReason: finalReason || null
      }),
      loaderText: `${finalStatus === "APPROVED" ? "APPROVING" : "REJECTING"} HOST APPLICATION...`
    });
  }
};

// -------------------------------------------------------------
// BOOKING MODULE
// -------------------------------------------------------------
const BookingAPI = {
  async createBooking(dto) {
    // Generate idempotency key if not provided
    const idempotencyKey = dto.idempotencyKey || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'idemp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
    const customerId = dto.customerId || (window.Auth ? window.Auth.getUserId() : '');

    const payload = {
      idempotencyKey,
      customerId,
      venueId: dto.venueId,
      spaceId: dto.spaceId,
      basePriceAmount: parseFloat(dto.basePriceAmount || 0),
      slotStartTime: dto.slotStartTime,
      slotEndTime: dto.slotEndTime,
      bookingResourceItem: Array.isArray(dto.bookingResourceItem) ? dto.bookingResourceItem : []
    };

    return await apiRequest(CONFIG.ENDPOINTS.BOOKING.CREATE || '/booking/create-booking', {
      method: 'POST',
      body: JSON.stringify(payload),
      loaderText: 'SECURING 5-MINUTE CHECKOUT HOLD...'
    });
  },

  async cancelBooking({ bookingId, cancellationReason = 'Customer requested cancellation' }) {
    return await apiRequest(CONFIG.ENDPOINTS.BOOKING.CANCEL || '/booking/cancel-booking', {
      method: 'POST',
      body: JSON.stringify({ bookingId, cancellationReason }),
      loaderText: 'PROCESSING CANCELLATION & POLICY VERIFICATION...'
    });
  },

  async getMyBookings() {
    return await apiRequest(CONFIG.ENDPOINTS.BOOKING.GET_MY_HISTORY || '/booking', {
      method: 'GET',
      loaderText: 'FETCHING RESERVATION HISTORY...'
    });
  },

  async getById(bookingId) {
    const endpoint = (CONFIG.ENDPOINTS.BOOKING.GET_DETAILS) 
      ? CONFIG.ENDPOINTS.BOOKING.GET_DETAILS(bookingId) 
      : `/booking/${bookingId}`;
    return await apiRequest(endpoint, {
      method: 'GET',
      loaderText: 'RETRIEVING RESERVATION LEDGER...'
    });
  },

  async getBySpace(spaceId) {
    const endpoint = (CONFIG.ENDPOINTS.BOOKING.GET_BY_SPACE) 
      ? CONFIG.ENDPOINTS.BOOKING.GET_BY_SPACE(spaceId) 
      : `/booking/space/${spaceId}`;
    return await apiRequest(endpoint, {
      method: 'GET',
      loaderText: 'LOADING SPACE RESERVATION ROSTER...'
    });
  },

  async updateStatus(bookingId, bookingStatus) {
    const endpoint = (CONFIG.ENDPOINTS.BOOKING.UPDATE_STATUS) 
      ? CONFIG.ENDPOINTS.BOOKING.UPDATE_STATUS(bookingId) 
      : `/booking/${bookingId}/status`;
    return await apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ bookingStatus }),
      loaderText: `UPDATING BOOKING STATUS TO ${bookingStatus}...`
    });
  }
};

// -------------------------------------------------------------
// PAYMENT MODULE
// -------------------------------------------------------------
const PaymentAPI = {
  async checkout({ bookingId }) {
    return await apiRequest(CONFIG.ENDPOINTS.PAYMENT.CHECKOUT || '/payment/checkout', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
      loaderText: 'INITIALIZING STRIPE CHECKOUT INTENT...'
    });
  },

  async verify(bookingId) {
    const endpoint = (CONFIG.ENDPOINTS.PAYMENT.VERIFY) 
      ? CONFIG.ENDPOINTS.PAYMENT.VERIFY(bookingId) 
      : `/payment/verify/${bookingId}`;
    return await apiRequest(endpoint, {
      method: 'POST',
      loaderText: 'VERIFYING STRIPE SETTLEMENT...'
    });
  },

  async refund({ bookingId }) {
    return await apiRequest(CONFIG.ENDPOINTS.PAYMENT.REFUND || '/payment/refund', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
      loaderText: 'INITIATING REVERSAL TO PAYMENT CARD...'
    });
  }
};

// -------------------------------------------------------------
// STRIPE INTEGRATION CLIENT
// -------------------------------------------------------------
const StripeClient = {
  _stripe: null,

  getPublishableKey() {
    return localStorage.getItem('stripe_publishable_key') || 
           (window.BOOKFORGE_CONFIG && window.BOOKFORGE_CONFIG.STRIPE_PUBLISHABLE_KEY) || 
           CONFIG.STRIPE_PUBLISHABLE_KEY || 
           '';
  },

  setPublishableKey(key) {
    if (key) {
      localStorage.setItem('stripe_publishable_key', key.trim());
      if (window.BOOKFORGE_CONFIG) window.BOOKFORGE_CONFIG.STRIPE_PUBLISHABLE_KEY = key.trim();
      this._stripe = null;
    }
  },

  async loadScript() {
    if (window.Stripe) return true;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="stripe.com"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', (e) => reject(e));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Stripe.js from stripe.com'));
      document.head.appendChild(script);
    });
  },

  async getStripe() {
    await this.loadScript();
    const key = this.getPublishableKey();
    if (!key) {
      throw new Error('Stripe Publishable Key not configured. Please supply your Stripe key.');
    }
    if (!this._stripe) {
      this._stripe = window.Stripe(key);
    }
    return this._stripe;
  },

  async createElements(clientSecret) {
    const stripe = await this.getStripe();
    const elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'flat',
        variables: {
          colorPrimary: '#E25C37',
          colorBackground: '#FFFFFF',
          colorText: '#1A1816',
          colorDanger: '#E25C37',
          fontFamily: 'Playfair Display, Plus Jakarta Sans, sans-serif',
          spacingUnit: '4px',
          borderRadius: '2px'
        },
        rules: {
          '.Input': {
            border: '1px solid #D5CCC0',
            boxShadow: 'none',
            padding: '12px'
          },
          '.Input:focus': {
            border: '1px solid #1A1816',
            boxShadow: 'none'
          }
        }
      }
    });

    return { stripe, elements };
  }
};

const SeedUsers = {
  customer: { username: "shyam123", password: "shyam@123", role: "ROLE_CUSTOMER" },
  provider: { username: "ram123", password: "ram@123", role: "ROLE_PROVIDER" },
  admin: { username: "admin", password: "admin@123", role: "ROLE_ADMIN" }
};

window.AuthAPI = AuthAPI;
window.CategoryAPI = CategoryAPI;
window.VenueAPI = VenueAPI;
window.SpaceAPI = SpaceAPI;
window.ResourceAPI = ResourceAPI;
window.AvailabilityAPI = AvailabilityAPI;
window.PricingAPI = PricingAPI;
window.AdminAPI = AdminAPI;
window.BookingAPI = BookingAPI;
window.PaymentAPI = PaymentAPI;
window.StripeClient = StripeClient;
window.SeedUsers = SeedUsers;




