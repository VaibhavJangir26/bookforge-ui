/**
 * BookForge Centralized Application Configuration & Endpoints
 * All service ports and routing paths are configured here.
 */

window.BOOKFORGE_CONFIG = {
  // Service Ports
  PORTS: {
    API_GATEWAY: 8900,
    AUTH_SERVICE: 8500,
    CATALOG_SERVICE: 8600,
    BOOKING_SERVICE: 8700,
    PAYMENT_SERVICE: 8800,
    EUREKA_SERVER: 8761
  },

  // Base API URLs
  API_BASE_URL: 'http://localhost:8900/api/v1',
  AUTH_SERVICE_URL: 'http://localhost:8900/api/v1',
  CATALOG_SERVICE_URL: 'http://localhost:8900/api/v1',
  BOOKING_SERVICE_URL: 'http://localhost:8700/api/v1',
  PAYMENT_SERVICE_URL: 'http://localhost:8800/api/v1',

  // Endpoints synchronized with backend microservice controllers
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      SIGNUP: '/auth/signup',
      VERIFY: '/auth/verify',
      REFRESH: '/auth/refresh',
      LOGOUT: '/auth/logout',
      CHECK_AVAILABLE: '/auth/check-available',
      PROFILE_ME: '/profile/me',
      APPLY_PROVIDER: '/profile/apply-provider'
    },
    CATEGORY: {
      BASE: '/category',
      GET_ALL: '/category',
      CREATE: '/category',
      UPDATE: '/category',
      DELETE: (id) => `/category/${id}`
    },
    VENUE: {
      BASE: '/venues',
      GET_ALL: '/venues',
      GET_MY_VENUES: '/venues/my-venues',
      GET_DETAILS: (id) => `/venues/${id}`,
      CREATE: '/venues',
      UPDATE_DETAILS: (id) => `/venues/${id}/details`,
      UPDATE_STATUS: (id) => `/venues/${id}/status`,
      DELETE: (id) => `/venues/${id}`
    },
    SPACE: {
      BASE: '/spaces',
      GET_ALL: '/spaces',
      GET_BY_VENUE: (venueId) => `/spaces/venue/${venueId}`,
      GET_DETAILS: (id) => `/spaces/${id}`,
      CREATE: '/spaces',
      UPDATE: (id) => `/spaces/${id}`,
      DELETE: (id) => `/spaces/${id}`
    },
    RESOURCE: {
      BASE: '/resources',
      GET_ALL: '/resources',
      GET_BY_SPACE: (spaceId) => `/resources/space/${spaceId}`,
      GET_DETAILS: (id) => `/resources/${id}`,
      CREATE: '/resources',
      UPDATE: (id) => `/resources/${id}`,
      DELETE: (id) => `/resources/${id}`
    },
    AVAILABILITY: {
      BASE: '/availability',
      RULES: '/availability/rules',
      RULES_BY_SPACE: (spaceId) => `/availability/rules/space/${spaceId}`,
      DELETE_RULE: (id) => `/availability/rules/${id}`,
      BLACKOUTS: '/availability/blackouts',
      BLACKOUTS_BY_SPACE: (spaceId) => `/availability/blackouts/space/${spaceId}`,
      DELETE_BLACKOUT: (id) => `/availability/blackouts/${id}`,
      SLOTS: (spaceId) => `/availability/slots/space/${spaceId}`
    },
    ADMIN_PROVIDERS: {
      BASE: '/admin/providers',
      PENDING: '/admin/providers/pending',
      REVIEW: (userId) => `/admin/providers/${userId}/status`
    },
    PRICING: {
      BASE: '/pricing',
      RULES: '/pricing/rules',
      RULES_BY_SPACE: (spaceId) => `/pricing/rules/space/${spaceId}`,
      DELETE_RULE: (id) => `/pricing/rules/${id}`,
      CALCULATE: '/pricing/calculate'
    },
    BOOKING: {
      BASE: '/booking',
      CREATE: '/booking/create-booking',
      CANCEL: '/booking/cancel-booking',
      GET_MY_HISTORY: '/booking',
      GET_DETAILS: (bookingId) => `/booking/${bookingId}`,
      GET_BY_SPACE: (spaceId) => `/booking/space/${spaceId}`,
      UPDATE_STATUS: (bookingId) => `/booking/${bookingId}/status`
    },
    PAYMENT: {
      BASE: '/payment',
      CHECKOUT: '/payment/checkout',
      VERIFY: (bookingId) => `/payment/verify/${bookingId}`,
      REFUND: '/payment/refund'
    }
  },

  // Stripe Gateway Configuration
  // Fallbacks: localStorage -> config default -> placeholder
  STRIPE_PUBLISHABLE_KEY: localStorage.getItem('stripe_publishable_key') || 'pk_test_51MockStripePublishableKeyForBookForgeUI123456789'
};

