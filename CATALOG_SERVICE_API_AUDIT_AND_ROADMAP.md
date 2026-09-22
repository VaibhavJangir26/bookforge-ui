# BOOKFORGE CATALOG SERVICE: API AUDIT, RBAC SPECIFICATION & BACKEND ROADMAP

**Document Version:** 1.0.0  
**Architectural Scope:** Microservices Architecture (Auth Service `8500`, Catalog Service `8600`, Booking Service `8700`, Payment Service `8800`, API Gateway `8900`)  
**Domain Model:** Peerspace / Airbnb Commercial Venue & Studio Marketplace Model  

---

## 1. EXECUTIVE SUMMARY & REAL-WORLD BUSINESS ANALOGY

BookForge operates on a multi-tier commercial venue and creative studio inventory engine. In a production marketplace:

1. **System Owner / Administrator (`ROLE_ADMIN`):**  
   Governs global category taxonomy (e.g., Sound Studios, Daylight Photography Lofts, Auditoriums) and acts as the regulatory gatekeeper reviewing and approving or rejecting newly registered venues before they appear publicly.
2. **Space Provider (`ROLE_PROVIDER`):**  
   The legal entity or operator owning or leasing commercial real estate. The provider:
   - Deploys Venue entities and defines parent location metadata.
   - Provisions sub-Spaces within venues with guest capacity and base hourly rates.
   - Attaches hardware resources (microphones, strobe packs, projectors) with stock quantities and hourly/flat pricing.
   - Establishes weekly operating schedules (opening/closing hours per day) and blocks out maintenance blackouts.
   - Configures dynamic surge/discount pricing rules (peak hours, weekend surges, seasonal modifiers).
   - **Crucial Rule:** The provider is the *owner* of the space—they do NOT search for slot availability to book their own space; they configure the schedules and pricing rules that define availability.
   - **Financial Rule:** Providers earn money once bookings are confirmed and escrowed through the Booking & Payment services. Payout balances and withdrawal features must strictly remain dormant until actual customer booking and payment integrations are live.
3. **Customer / Renter (`ROLE_CUSTOMER`):**  
   The client booking a creative or commercial space. The customer:
   - Explores verified venues and spaces.
   - Checks live slot availability across selected dates.
   - Selects hardware equipment add-ons with customizable quantities (e.g., reserving 2 studio microphones up to the provider-defined inventory stock).
   - Requests real-time dynamic price quotes reflecting base rates, surge multipliers, and equipment subtotals.
   - Proceeds through reservation checkout.

---

## 2. EXISTING CATALOG SERVICE API AUDIT

The current Catalog Service (`com.bluewave`, port `8600`) exposes 6 Spring Boot REST controllers guarded by Spring Security Method Security (`@PreAuthorize`).

### 2.1 Category Taxonomy Controller (`/api/v1/category`)
| HTTP Method | Path | Security Rule (`@PreAuthorize`) | Purpose & Payload |
|:---|:---|:---|:---|
| `POST` | `/api/v1/category` | `hasRole('ADMIN')` | Create new category (`CreateCategoryRequestDTO`: `name`, `slug`, `description`) |
| `GET` | `/api/v1/category` | `hasAnyRole('CUSTOMER', 'PROVIDER', 'ADMIN')` | Fetch all categories (`List<CategoryResponseDTO>`) |
| `PATCH` | `/api/v1/category` | `hasRole('ADMIN')` | Update category details (`UpdateCategoryRequestDTO`: `id`, `name`, `slug`, `description`) |
| `DELETE` | `/api/v1/category/{categoryId}` | `hasRole('ADMIN')` | Delete category by ID |

### 2.2 Venue Management Controller (`/api/v1/venues`)
| HTTP Method | Path | Security Rule (`@PreAuthorize`) | Purpose & Payload |
|:---|:---|:---|:---|
| `POST` | `/api/v1/venues` | `hasRole('PROVIDER')` | Register venue entity. **Customers CANNOT call this.** (`CreateVenueRequestDTO`: `name`, `slug`, `description`, `contactEmail`, `contactPhone`, `categoryId`, `address`) |
| `PATCH` | `/api/v1/venues/{venueId}/details` | `hasAnyRole('PROVIDER', 'ADMIN')` | Update venue metadata (`UpdateVenueDetailsRequestDTO`) |
| `PATCH` | `/api/v1/venues/{venueId}/status` | `hasRole('ADMIN')` | Approve or reject venue status (`UpdateVenueStatusDTO`: `venueStatus`) |
| `GET` | `/api/v1/venues` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Retrieve all venues (`List<VenueResponseDTO>`) |
| `GET` | `/api/v1/venues/{venueId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Retrieve single venue details |
| `DELETE` | `/api/v1/venues/{venueId}` | `hasAnyRole('ADMIN', 'PROVIDER')` | Delete venue entity |

### 2.3 Sub-Space Controller (`/api/v1/spaces`)
| HTTP Method | Path | Security Rule (`@PreAuthorize`) | Purpose & Payload |
|:---|:---|:---|:---|
| `POST` | `/api/v1/spaces` | `hasRole('PROVIDER')` | Create sub-space under venue with multipart assets. (`multipart/form-data`: `request` JSON blob + optional `images` files) |
| `PATCH` | `/api/v1/spaces/{spaceId}` | `hasAnyRole('PROVIDER', 'ADMIN')` | Update space specifications and images |
| `GET` | `/api/v1/spaces/venue/{venueId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Retrieve spaces belonging to specific venue |
| `GET` | `/api/v1/spaces` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Retrieve all catalog spaces |
| `GET` | `/api/v1/spaces/{spaceId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Retrieve single space specifications |
| `DELETE` | `/api/v1/spaces/{spaceId}` | `hasAnyRole('ADMIN', 'PROVIDER')` | Delete space entity |

### 2.4 Resource & Equipment Controller (`/api/v1/resources`)
| HTTP Method | Path | Security Rule (`@PreAuthorize`) | Purpose & Payload |
|:---|:---|:---|:---|
| `POST` | `/api/v1/resources` | `hasRole('PROVIDER')` | Attach hardware resource with stock quantity. (`multipart/form-data`: `request` + `images`) |
| `GET` | `/api/v1/resources` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | List all resources |
| `GET` | `/api/v1/resources/space/{spaceId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | List resources attached to space |
| `GET` | `/api/v1/resources/{resourceId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Get single resource details |
| `PATCH` | `/api/v1/resources/{resourceId}` | `hasRole('PROVIDER')` | Update resource details and stock |
| `DELETE` | `/api/v1/resources/{resourceId}` | `hasRole('PROVIDER')` | Delete resource entity |

### 2.5 Operating Availability & Blackout Controller (`/api/v1/availability`)
| HTTP Method | Path | Security Rule (`@PreAuthorize`) | Purpose & Payload |
|:---|:---|:---|:---|
| `POST` | `/api/v1/availability/rules` | `hasRole('PROVIDER')` | Create recurring weekly operating schedule (`dayOfWeek`, `openingTime`, `closingTime`, `slotDurationInMinutes`) |
| `POST` | `/api/v1/availability/blackouts` | `hasRole('PROVIDER')` | Block date/time maintenance window (`startDateTime`, `endDateTime`, `reason`) |
| `GET` | `/api/v1/availability/rules/space/{spaceId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | View weekly schedule rules |
| `GET` | `/api/v1/availability/blackouts/space/{spaceId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | View blackout windows |
| `GET` | `/api/v1/availability/slots/space/{spaceId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Query open discrete booking slots (**Customer facing**) |
| `DELETE` | `/api/v1/availability/rules/{ruleId}` | `hasRole('PROVIDER')` | Delete schedule rule |
| `DELETE` | `/api/v1/availability/blackouts/{blackoutId}` | `hasRole('PROVIDER')` | Delete blackout window |

### 2.6 Dynamic Pricing Controller (`/api/v1/pricing`)
| HTTP Method | Path | Security Rule (`@PreAuthorize`) | Purpose & Payload |
|:---|:---|:---|:---|
| `POST` | `/api/v1/pricing/rules` | `hasRole('PROVIDER')` | Create surge/discount rule (`name`, `ruleType`, `adjustmentType`, `priceAdjustment`, `dayOfWeek`, `priority`) |
| `GET` | `/api/v1/pricing/rules/space/{spaceId}` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | View space dynamic pricing rules |
| `DELETE` | `/api/v1/pricing/rules/{ruleId}` | `hasRole('PROVIDER')` | Delete pricing rule |
| `POST` | `/api/v1/pricing/calculate` | `hasAnyRole('ADMIN', 'PROVIDER', 'CUSTOMER')` | Compute dynamic quote with selected time & resources (`CalculatePriceRequestDTO`) |

---

## 3. RBAC UI ENFORCEMENT MATRIX

Based on backend security annotations, the UI controls must be strictly partitioned:

| UI Control / Action | `ROLE_CUSTOMER` | `ROLE_PROVIDER` | `ROLE_ADMIN` |
|:---|:---:|:---:|:---:|
| **+ Register Venue Button & Form** | ❌ Hidden | ✅ Visible | ✅ Visible |
| **+ Add Space Button & Form** | ❌ Hidden | ✅ Visible | ✅ Visible |
| **+ Attach Resource Button & Form** | ❌ Hidden | ✅ Visible | ❌ Hidden |
| **+ Weekly Rule & Blackout Buttons** | ❌ Hidden | ✅ Visible | ❌ Hidden |
| **+ Add Dynamic Pricing Rule** | ❌ Hidden | ✅ Visible | ❌ Hidden |
| **Delete Buttons (Venues, Spaces, Rules)** | ❌ Hidden | ✅ Visible (Owned) | ✅ Visible |
| **Approve / Reject Venue Status** | ❌ Hidden | ❌ Hidden | ✅ Visible |
| **Category Taxonomy Tab & CRUD** | ❌ Hidden | ❌ Hidden | ✅ Visible |
| **Check Available Booking Slots Explorer** | ✅ Visible (Primary) | ❌ Hidden (Owner) | ❌ Hidden |
| **Interactive Resource Cart & Quantity Steppers** | ✅ Visible (Primary) | ❌ Hidden | ❌ Hidden |
| **Live Dynamic Pricing Quote Calculator** | ✅ Visible (Primary) | ✅ Simulator | ✅ Simulator |
| **Provider Balance / Withdrawal Dashboard** | ❌ Hidden | ❌ Hidden (Until Bookings Exist) | ❌ Hidden |

---

## 4. BACKEND GAP ANALYSIS & ROADMAP

To reach enterprise production status, the following endpoints and data contract enhancements need to be implemented in the backend services:

### 4.1 Missing Endpoints in Catalog Service

1. **Provider-Scoped Venues Endpoint (`GET /api/v1/venues/my-venues`)** [ACTIVE & INTEGRATED]:
   - *Current State:* `GET /api/v1/venues` returns all venues from all providers across the database.
   - *Requirement:* Providers need an endpoint filtered by `SecurityContext` / `UserContext.getUserId()` returning only venues registered by the authenticated provider.
   - *Proposed Signature:* `GET /api/v1/venues/provider` -> returns `CommonApiResponse<List<VenueResponseDTO>>` where `providerId == currentUserId`.

2. **Resource Quantities in Dynamic Pricing Calculation (`POST /api/v1/pricing/calculate`)**:
   - *Current State:* `CalculatePriceRequestDTO` accepts `private List<String> resourceIds`. The calculation logic in `PricingService` iterates each resource and adds its unit cost once.
   - *Requirement:* Customers often order multiple units of a resource (e.g., 2 wireless handheld mics, 3 camera lenses).
   - *Proposed Enhancement:* Update DTO to accept resource quantities:
     ```java
     public class ResourceSelectionDTO {
         private String resourceId;
         private Integer quantity; // must be <= resource.getResourceCountQuantity()
     }
     public class CalculatePriceRequestDTO {
         private String spaceId;
         private LocalDateTime slotStartTime;
         private LocalDateTime slotEndTime;
         private List<ResourceSelectionDTO> selectedResources;
     }
     ```
   - *Pricing Calculation:* Multiply `unitPrice * quantity * (isPerHour ? durationHours : 1)`.

3. **Customer Venue & Space Discovery Filter Endpoint (`GET /api/v1/spaces/search`)**:
   - *Current State:* Customers must navigate Venue -> Spaces hierarchy.
   - *Requirement:* Real-world rental platforms require faceted search across categories, cities, guest capacity, price range, and date availability.
   - *Proposed Signature:* `GET /api/v1/spaces/search?category=...&city=...&minCapacity=...&maxPrice=...&date=...`

### 4.2 Missing Endpoints in Auth & Admin Pipeline

1. **Provider Application Pipeline (`POST /api/v1/auth/provider-request`)**:
   - *Current State:* Users register as Customers by default. No database entity or endpoint exists to record provider upgrade requests.
   - *Requirement:* Customers must submit a business justification, tax/EIN number, or portfolio link. Admins review and elevate the user role to `ROLE_PROVIDER`.
   - *Proposed Endpoints:*
     - `POST /api/v1/provider-requests` (Customer)
     - `GET /api/v1/admin/provider-requests` (Admin only)
     - `PATCH /api/v1/admin/provider-requests/{id}/approve` (Admin only)

### 4.3 Future Booking & Payment Service Roadmap

1. **Slot Reservation & Concurrency Lock (`POST /api/v1/bookings`)**:
   - Lock selected slot, validate no overlapping bookings, place slot in `PENDING_PAYMENT` state with 15-minute TTL.
2. **Escrow Payment Intent (`POST /api/v1/payments/create-session`)**:
   - Customer pays via Stripe / Payment Gateway. Funds are held in escrow.
3. **Provider Payouts & Balance Service (`GET /api/v1/payments/provider-balance` & `POST /api/v1/payments/withdraw`)**:
   - Once the event concludes without dispute, escrow releases earnings to the provider balance.
   - Providers can then view their ledger and initiate bank withdrawals.
   - *Design Decision:* Keep payout/withdrawal UI completely omitted until these backend microservices are implemented.

---

## 5. BUSINESS INVARIANT SPECIFICATIONS

1. **Space Ownership Integrity:**  
   When updating or deleting spaces, resources, availability schedules, or pricing rules, the backend checks:
   ```java
   if (!UserContext.isAdmin() && !space.getVenue().getProviderId().equals(currentUserId)) {
       throw new AccessDeniedException("You do not have permission to configure this entity");
   }
   ```
2. **Pricing Rule Priority Cascade:**  
   When calculating price quotes, active rules are sorted by `priority DESC`. The highest priority rule that satisfies the slot time window (Peak Hour vs Weekend vs Seasonal) is applied to calculate the modified space rate, before adding itemized equipment add-ons.
3. **Blackout Slot Exemption:**  
   Slots intersecting any registered `BlackoutSlot` are excluded from `getAvailableSlots()`.

---

## 6. PROVIDER REGISTRATION & HOST APPROVAL PIPELINE [ACTIVE & INTEGRATED]

1. **Host Application Workflow (`POST /api/v1/profile/apply-provider`)**:
   - Customer submits commercial credentials (`businessName`, `taxOrGstNumber`, `mobileNo`, and operating `businessAddress`).
   - Profile status transitions to `PENDING`.
   - Free onboarding with zero setup fees or listing charges.
2. **Admin Verification & Approval (`GET /api/v1/admin/providers/pending` & `PATCH /api/v1/admin/providers/{userId}/status`)**:
   - Platform Administrator reviews tax/GST credentials, applicant details, and operating address.
   - Admin approves application (`status: APPROVED`) or rejects with reason (`status: REJECTED`).
   - On approval, backend assigns `ROLE_PROVIDER`, evicts Redis cache & active sessions, and unlocks the full provider console.
