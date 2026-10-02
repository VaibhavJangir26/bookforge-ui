# 🏛️ BookForge UI — Enterprise Luxury Venue & Creative Studio Marketplace

[![Version](https://img.shields.io/badge/version-1.0.0-E25C37.svg?style=for-the-badge)](https://github.com/VaibhavJangir26/bookforge-ui)
[![License](https://img.shields.io/badge/license-MIT-101812.svg?style=for-the-badge)](LICENSE)
[![Stripe Connect](https://img.shields.io/badge/Stripe-Connect_Destination_Charges-635BFF.svg?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com)
[![Redis Locks](https://img.shields.io/badge/Redis-5--Min_Inventory_Hold-DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)

**BookForge UI** is a state-of-the-art, high-performance web interface designed for monetizing and reserving luxury architectural facilities, daylight photo lofts, acoustic soundstages, and event auditoriums. Built with a focus on pristine visual aesthetics, 60FPS glassmorphism, 3D volumetric elevation, and zero-framework performance overhead, BookForge delivers an enterprise-grade user experience for space guests, venue operators, and platform administrators.

---

## ✨ Key Architectural Highlights

* 🎨 **Rich Modern Aesthetics**: Customized luxury design tokens, dark glassmorphism, 3D tilt interaction cards, smooth micro-animations, and fluid editorial typography.
* ⚡ **Zero-Framework Speed**: Built using pure Vanilla HTML5, CSS3, and ES6+ JavaScript for instant page loads and zero bundle overhead.
* 🔒 **Redis 5-Minute Slot Hold**: Integrates with high-speed Redis lock mechanisms to reserve booking slots exclusively for 5 minutes during checkout, eliminating concurrency conflicts.
* 💳 **Stripe Connect & Destination Charges**: Built-in support for Stripe Express onboarding, automated split payments, and direct destination transfers for venue hosts.
* 🛡️ **Automated 24h Refund Policy**: Intelligent cancellation engine calculating custom partial refunds (80% customer refund, 15% venue provider compensation, 5% platform fee) for cancellations >24 hours prior.
* 🎙️ **Hardware Stock Synchronization**: Real-time hourly attachment of AV production gear (RED cinema cameras, Profoto strobe packages, wireless microphones).

---

## 📸 Platform Modules & Console Previews

### 1. 🌐 Landing Page (`index.html`)
* **Monumental Hero Section**: 3D elevated announcement pills, real-time host revenue metrics, and high-impact editorial typography.
* **6 Volumetric Discipline Cards**: Architectural Lofts, Audio Suites, Auditoriums, Executive Coworking, Hardware Gear, and Custom Facilities with instant fallbacks.
* **Interactive Earnings Calculator**: Dynamic revenue forecasting tool based on studio capacity, hourly rate, and weekly utilization.
* **Pricing & Guarantee Badges**: Highlighted $0 platform booking fees, 0% added taxes, and transparent 24h automated refund policies.

### 2. 👤 Customer Member Console (`dashboard/customer.html`)
* **Reservation Ledger**: Complete listing of confirmed, pending, and cancelled space bookings with status filters.
* **Automated Cancellation Modal**: Interactive refund breakdown calculator evaluating 24-hour cutoffs in real-time.
* **Profile & Identity Management**: Personal address, email verification status, and security settings.

### 3. 🏛️ Host Operator Console (`dashboard/provider.html`)
* **Facility Directory Workbench**: Register and manage creative venues, taxonomy categories, address, and media overviews.
* **Studio Room Provisioning**: Deploy sub-spaces with custom hourly pricing, capacity, and multi-image Cloudinary galleries.
* **Hardware & AV Inventory**: Attach hourly equipment add-ons with automated stock deduction.
* **Operating Rules & Blackouts**: Configure weekly operating hours, slot durations, and temporary maintenance blackout windows.
* **💳 Stripe Connect & Bank Payouts**: Dedicated payout dashboard supporting Stripe Express account linking, receiving bank details (ACH, IFSC, IBAN), and an interactive **Developer Testing Toolkit** with sample payment cards and test bank accounts.

### 4. ⚙️ Platform Admin Console (`dashboard/admin.html`)
* **Provider Approval Queue**: Inspect pending host applications, review verification documents, and approve/reject provider accounts.
* **Venue Moderation**: Change facility status between `VERIFICATION_PENDING`, `PUBLISHED`, and `SUSPENDED`.
* **Taxonomy Management**: Create, update, and organize venue categories and URL slugs.

### 5. 🚪 Space Details & Checkout (`venues/space-details.html`)
* **Interactive Availability Grid**: Real-time slot selector driven by microservice availability APIs.
* **Add-on Equipment Selector**: Synchronized hardware rental attachments.
* **Stripe Checkout Integration**: Seamless 256-bit encrypted card authorization with 3D Secure support.

---

## 🛠️ Technology Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend Core** | HTML5, JavaScript (ES6+ Modules), Vanilla CSS3 (Design Tokens, HSL Color Palettes) |
| **Icons & Fonts** | Google Fonts (Inter, Outfit, Playfair Display), Custom Inline SVG Vector Systems |
| **State & Storage** | LocalStorage API, Session JWT Token Management |
| **Payment Gateway** | Stripe.js v3, Stripe Checkout, Stripe Connect Express |
| **Microservice Interoperability** | Fetch API, RESTful API Client with automatic payload unwrapping & Spring Security headers |

---

## 🔌 API Client & Endpoint Synchronization

The frontend communicates with backend microservices via the unified API client

```javascript
// Microservice Endpoint Mapping (Default Port Configuration)
const CONFIG = {
  API_BASE_URL: 'http://localhost:8900/api/v1',         // API Gateway
  AUTH_SERVICE_URL: 'http://localhost:8500/api/v1',     // Auth & Profile Service
  CATALOG_SERVICE_URL: 'http://localhost:8600/api/v1',  // Venues, Spaces, Equipment
  BOOKING_SERVICE_URL: 'http://localhost:8700/api/v1',  // Booking & Redis Locks
  PAYMENT_SERVICE_URL: 'http://localhost:8800/api/v1'   // Stripe Payment & Connect
};
