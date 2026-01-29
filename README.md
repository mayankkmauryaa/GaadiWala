# 🚗 GaadiWala - Multi-Service Mobility Platform

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://gaadiwala-app.web.app)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/mayankkmauryaa/GaadiWala)
[![Firebase](https://img.shields.io/badge/Firebase-Deployed-orange)](https://firebase.google.com)

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://reactjs.org/)

[**Live App**](https://gaadiwala-app.web.app)

A comprehensive mobility and logistics platform integrating **Ride Hailing**, **Tiffin Delivery**, and **Wallet** systems. Recently upgraded with a **Premium, AI-driven UI** featuring cinematic backgrounds, glassmorphism, and advanced mobile responsiveness.

---

## 📋 Table of Contents

- [Features](#-features)
- [User Roles & Journeys](#-user-roles--journeys)
- [Core Systems](#-core-systems)
  - [FlexFare Ecosystem](#-the-flexfare-ecosystem)
  - [Tiffin Logistics](#-tiffin-logistics-engine)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Security](#-security)
- [Deployment](#-deployment)

---

## ✨ Features

### 🚗 Rider Features
- **Live Map Booking** - Real-time tracking with Google Maps integration.
- **FlexFare System** - Proprietary fare bidding and negotiation.
- **Multi-Category Fleet** - Bike, Auto, Mini, Prime, and **Pink Partner** (women-only).
- **Tiffin Marketplace** - Meal subscriptions with batch delivery.
- **Digital Wallet** - Native UPI/Card/Wallet payment system via Firestore.
- **Safety Protocol** - SOS button and live trip sharing with verified OTP.

### 🚕 Driver Features
- **Mission Dashboard** - Toggle between Ride and Tiffin delivery modes.
- **Earnings Forensics** - Real-time yield analysis and performance charts.
- **KYC Onboarding** - Automated document verification pipeline.
- **Gamified Tiers** - Performance-based levels (Bronze, Silver, Gold).
- **Smart Pricing** - Route-specific price adjustment for long-distance hauls.

### 🎨 Premium UI/UX
- **Cinematic Experience** - Luxury city hero sections with progressive auto-zoom.
- **Glassmorphism** - High-depth blurred layers and glowing UI elements.
- **Responsive Stacking** - Mobile-first layout optimization for high conversion.
- **Micro-Animations** - Smooth Framer Motion transitions across all screens.

### 👑 Admin HQ
- **Operations Heatmap** - Real-time geospatial cluster analysis.
- **Fleet Control** - Comprehensive driver audit and approval system.
- **Promo Engine** - Dynamic discount and campaign management.
- **System Knobs** - Global control over base fares, surge, and student discounts.

---

## 👥 User Roles & Journeys

The platform is built on a **Role-Based UI (RBUI)** architecture, where the interface and available services transform based on the user's authenticated role.

### 👤 Rider Journey
1.  **Discovery**: Unified search for rides or tiffin vendors using `PlacesService`.
2.  **Booking**: Select from 5 vehicle categories including **Pink Partner** (women-only).
3.  **The FlexFare Cycle**: Enter a target fare $\rightarrow$ Driver counter-offers $\rightarrow$ Rider accepts.
4.  **Live Engagement**: Track ride progress with real-time OTP verification and encrypted chat.
5.  **Post-Trip**: Rate the experience and pay via Wallet or cash.

### 🚕 Driver Journey
1.  **Onboarding**: Multi-stage KYC with vehicle document verification.
2.  **The Hustle**: Toggle between **Ride Mode** and **Tiffin Mode**.
3.  **Revenue Control**: Set preferred long-distance route pricing using the **Pricing Slider**.
4.  **Logistics Execution**: Follow optimized batch routes for multiple tiffin deliveries.
5.  **Financials**: Detailed earnings forensics with weekly performance bonuses.

### 👑 Admin HQ
1.  **Pulse Monitoring**: Live heatmap of current ride requests and driver locations.
2.  **Fleet Control**: Audit-log based approval for new driver registrations.
3.  **Market Calibration**: Real-time adjustment of base fares, per-km rates, and surge multipliers.
4.  **Logistics Oversight**: Monitor tiffin batch efficiency and delivery success rates.

---

## 💹 The FlexFare Ecosystem

Our proprietary **FlexFare** system moves away from static pricing to a dynamic negotiation model:

-   **Dynamic Base**: System computes an initial fare using `pricing.ts` based on distance, time, and traffic.
-   **Rider Modification**: Riders can suggest a lower price based on their urgency.
-   **Driver Counter**: Nearby drivers receive the bid and can accept or counter-offer within a +/- 20% range.
-   **Fairness Ledger**: The final accepted price is locked into the Firestore document to prevent post-booking disputes.

---

## 🍱 Tiffin Logistics Engine

The **Tiffin Delivery** system uses a custom `RouteOptimizationService` to handle batch deliveries:

-   **Geospatial Clustering**: Orders are grouped (batched) by `batchId` if they share a common pickup zone or delivery route.
-   **Batch Optimization**: Drivers see "Pick 3, Deliver 3" missions, where routes are sorted using the **Nearest Neighbor** algorithm for maximum efficiency.
-   **Earnings Multiplier**: Drivers earn a flat delivery fee per tiffin, significantly increasing their hourly yield compared to single rides.

---

### ✅ P2: Premium UI Overhaul (COMPLETE - Jan 24, 2026)

- ✅ **Cinematic Hero** - Luxury dush city background with 20s auto-zoom
- ✅ **Ambient Blur** - Animated floating orbs for extreme depth
- ✅ **Glassmorphic Navbar** - High-blur backdrop with glowing indicators
- ✅ **Mobile Stacking** - Reordered elements for better functional onboarding
- ✅ **Social Proof** - "Live rides" counter and "Trusted by 10M+" indicators

### 📊 Refactoring Impact

| Metric             | Before      | After            | Improvement          |
| ------------------ | ----------- | ---------------- | -------------------- |
| **Security**       | ❌ No rules | ✅ Comprehensive | 🔒 Production-ready  |
| **UX/UI**          | ⚠️ Basic    | ✅ Premium       | ✨ "Wow" Factor      |
| **Code Structure** | ⚠️ Low      | ✅ High          | ♻️ DRY principle     |
| **Mobile Flow**    | ⚠️ Stacked  | ✅ Prioritized   | 📱 Better Conversion |
| **Total Files**    | ~20         | 25+              | 🏗️ Modular Design    |

**Total Changes**: 20+ files created/modified, all deployed to production

---

## 🛠️ Technology Stack

| Layer         | Technology            | Usage                               |
| ------------- | --------------------- | ----------------------------------- |
| **Frontend**  | React 19 + TypeScript | Core framework                      |
| **Routing**   | React Router v7       | Client-side navigation              |
| **State**     | React Context API     | Auth & global session               |
| **Backend**   | Firebase              | Auth, Firestore, Storage, Functions |
| **Maps**      | Google Maps JS API    | Geocoding, Places, Directions       |
| **Styling**   | Tailwind CSS          | Utility-first styling               |
| **Charts**    | Recharts              | Admin analytics                     |
| **Animation** | Framer Motion         | Page transitions & modals           |

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- npm
- Firebase account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mayankkmauryaa/GaadiWala
cd GaadiWala

# 2. Install dependencies
npm install

# 3. Environment Configuration
cp .env.example .env
# Fill in your Firebase and Google Maps API keys
```

### Required Environment Variables

```env
# Firebase
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Google Maps
REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_key

# Optional
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key
```

### Running Locally

```bash
npm start
# Opens http://localhost:3000
```

### Building for Production

```bash
npm run build
# Creates optimized build in ./build
```

---

## 🏗️ Architecture

### Design Philosophy

- **Thick Client** - Business logic in React frontend
- **Real-time First** - Firestore `onSnapshot` for live updates
- **Role-Based UI** - Interface transforms based on user role

### 🏗️ Project Structure

```text
.
├── public/                 # Static assets
│   ├── assets/             # Images and local binary data
│   │   └── tiffins/        # MenuItem thumbnails
│   ├── favicon.png         # App icon
│   ├── index.html          # Main HTML entry point
│   └── manifest.json       # PWA manifest
├── scripts/                # CI/CD and Admin utility scripts
│   └── setAdminClaim.js    # Firebase Auth custom claims script
├── src/                    # Application source code
│   ├── components/         # Reusable UI components
│   │   ├── Auth/           # Auth UI (OTP, LoginForm, Signup)
│   │   ├── Booking/        # Ride hailing UI (ServiceSelection, RideRequest)
│   │   ├── admin/          # Admin dashboard components
│   │   │   └── tabs/       # Individual HQ tabs (Fleet, LiveOps, etc.)
│   │   ├── Discovery/      # Maps and location discovery UI
│   │   ├── Driver/         # Driver-specific UI widgets
│   │   ├── Safety/         # SOS and safety features
│   │   ├── Tiffin/         # Tiffin marketplace UI
│   │   ├── shared/         # Common inputs, chat, and scroll hooks
│   │   ├── CinematicIntro  # Animated welcome sequence
│   │   ├── MapContainer    # Core Google Maps integration
│   │   └── LoadingState    # Glassmorphic skeleton loaders
│   ├── config/             # Environment validation logic
│   ├── context/            # React Context (AuthContext)
│   ├── firebase/           # Auth and Firestore initialization
│   ├── hooks/              # Custom business logic hooks
│   │   ├── useRide.ts      # Ride state management
│   │   └── useSystemConfig # Global admin parameters
│   ├── screens/            # Application view layers
│   │   ├── admin/          # AdminHQ Command Center
│   │   ├── driver/         # Multi-mode Driver Dashboard
│   │   └── rider/          # FlexFare Home and Tiffin Market
│   ├── services/           # Backend communication and logic
│   │   ├── api/            # Low-level Firestore transactions
│   │   ├── LocationService # Google Geocoding wrapper
│   │   ├── RoutesService   # Traffic-aware navigation logic
│   │   └── RouteOptimization # Tiffin batching algorithm
│   ├── types.ts            # Global TypeScript interfaces
│   ├── App.tsx             # Main router and app shell
│   └── firebase.ts         # High-level Firebase configuration
```

### 📂 Full Map Architecture

```text
.
├── public/
│   ├── assets/
│   │   └── tiffins/        # MenuItem static images
│   │       ├── dal_roti.png
│   │       ├── maharaja_thali.png
│   │       └── special_thali.png
│   ├── favicon.png
│   ├── index.html
│   ├── manifest.json
│   ├── metadata.json
│   └── robots.txt
├── scripts/
│   └── setAdminClaim.js     # Admin privilege assignment script
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── GoogleButton.jsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── PhoneOtpForm.jsx
│   │   │   ├── PhoneVerification.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── Booking/
│   │   │   ├── RideRequest.tsx
│   │   │   └── ServiceSelector.tsx
│   │   ├── Discovery/
│   │   │   ├── DistrictPicker.tsx
│   │   │   └── SavedPlaces.tsx
│   │   ├── Driver/
│   │   │   └── DriverPricingSlider.tsx
│   │   ├── Safety/
│   │   │   └── SOSButton.tsx
│   │   ├── Tiffin/
│   │   │   └── TiffinMarketplace.tsx
│   │   ├── admin/
│   │   │   ├── tabs/
│   │   │   │   ├── BroadcastTab.tsx
│   │   │   │   ├── FleetTab.tsx
│   │   │   │   ├── LiveOpsTab.tsx
│   │   │   │   ├── OverviewTab.tsx
│   │   │   │   ├── PromotionsTab.tsx
│   │   │   │   ├── ReportsTab.tsx
│   │   │   │   ├── RidersTab.tsx
│   │   │   │   ├── SettingsTab.tsx
│   │   │   │   └── TiffinTab.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── AdminModals.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── DashboardMetrics.tsx
│   │   │   ├── LiveHeatmap.tsx
│   │   │   └── PerformanceAnalytics.tsx
│   │   ├── shared/
│   │   │   ├── Chat.tsx
│   │   │   └── ScrollHint.tsx
│   │   ├── CinematicIntro.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── GlobalBanner.tsx
│   │   ├── LoadingState.tsx
│   │   ├── MapContainer.tsx
│   │   ├── NavigationOverlay.tsx
│   │   └── PremiumLoader.tsx
│   ├── config/
│   │   └── validateEnv.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── firebase/
│   │   └── authService.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useClickOutside.ts
│   │   ├── useDriverManagement.ts
│   │   ├── useRide.ts
│   │   ├── useSystemConfig.ts
│   │   └── useTiffinManagement.ts
│   ├── screens/
│   │   ├── admin/
│   │   │   └── AdminHQ.tsx
│   │   ├── driver/
│   │   │   ├── DriverDashboard.tsx
│   │   │   ├── DriverProfile.tsx
│   │   │   ├── Earnings.tsx
│   │   │   └── KYC.tsx
│   │   ├── rider/
│   │   │   ├── FlexFare.tsx
│   │   │   ├── LiveTracking.tsx
│   │   │   ├── RiderHome.tsx
│   │   │   ├── RiderProfile.tsx
│   │   │   ├── TiffinMarketplace.tsx
│   │   │   ├── TripSummary.tsx
│   │   │   └── Wallet.tsx
│   │   ├── AuthTestScreen.tsx
│   │   ├── EmailComplete.tsx
│   │   └── Welcome.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── payment.ts
│   │   │   ├── rides.ts
│   │   │   └── users.ts
│   │   ├── LocationService.ts
│   │   ├── PlacesService.ts
│   │   ├── pricing.test.ts
│   │   ├── pricing.ts
│   │   ├── RoadsService.ts
│   │   ├── RouteOptimizationService.ts
│   │   └── RoutesService.ts
│   ├── utils/
│   │   └── GeolocationHelper.ts
│   ├── App.css
│   ├── App.test.tsx
│   ├── App.tsx
│   ├── firebase.ts
│   ├── index.css
│   ├── index.tsx
│   ├── logo.svg
│   ├── react-app-env.d.ts
│   ├── reportWebVitals.ts
│   ├── setupTests.ts
│   └── types.ts
├── .env                     # Local Environment Secrets
├── .env.example             # Template for Environment Variables
├── .firebaserc              # Firebase environment configuration
├── .gitignore               # Ignored files for Git
├── approve-driver.html      # Legacy approval testing utility
├── database.rules.json      # Realtime Database security logic
├── debug-driver.html        # Driver state debugging tool
├── eslint_report.json       # Linter audit output
├── firebase.json            # Firebase CLI deployment config
├── firestore.indexes.json   # Composite index definitions
├── firestore.rules          # Cloud Firestore Security Rules
├── package-lock.json        # Locked dependency tree
├── package.json             # Scripts & Dependency manifest
├── README.md                # This documentation
├── storage.rules            # Firebase Storage Security Rules
└── tsconfig.json            # TypeScript Compiler settings
```

---

## 🧱 Core Modules Documentation

### 📍 Location Intelligence (`services/`)
-   **`LocationService`**: Handles reverse geocoding and address normalization using the Google Address Validation API.
-   **`PlacesService`**: Powers the "Search for zones" feature with intelligent autocomplete and nearby POI discovery.
-   **`RoadsService`**: Implements snap-to-road logic to ensure driver tracking follows actual street geometry rather than straight lines.
-   **`RoutesService`**: Computes time-to-arrival (ETA) and distance-to-destination (dist) while considering real-time traffic density.
-   **`RouteOptimization`**: A specialized engine that computes the mathematical shortest path for tiffin delivery batches.

### 💰 Financial Engine (`pricing.ts`)
-   **Surge Pricing**: Automatically inflates fares during high-demand/low-supply periods.
-   **Tiered Discounts**: Applies dynamic discounts for students (-20%), seniors (-15%), and loyal riders based on trip history.
-   **Wallet Bridge**: Manages double-entry ledgering for wallet-to-wallet transactions between riders and drivers.

### 🏗️ UI Framework (`components/`)
-   **`MapContainer`**: A highly optimized wrapper for `@react-google-maps/api` with custom styling (Grayscale/Night mode).
-   **`FlexFare Bidding`**: A real-time state machine that manages the negotiation bridge between rider and driver.
-   **`Admin Command Center`**: A modular dashboard layout with real-time Firestore listeners for global operations monitoring.

---

## ⚙️ System Configuration

The platform's behavior is cross-configured via the **AdminHQ Settings**:

| Variable | Description | Default Value |
| :--- | :--- | :--- |
| **Base Fare** | Minimum charge for any ride booking | ₹40.00 |
| **Per KM Rate** | Charge per kilometer based on vehicle type | ₹12.00 - ₹25.00 |
| **Surge Multiplier** | Real-time multiplier based on demand | 1.0x - 2.5x |
| **Loyalty Threshold** | Rides required to unlock 'Gold' status | 50 Trips |
| **Tiffin Fee** | Flat delivery fee earned by the driver | ₹15.00 / tiffin |

---

## 🔒 Security & Persistence

### Firebase Logic
-   **Firestore Rules**: Role-based access control (Rider/Driver/Admin). Drivers require `isApproved` status to accept rides.
-   **Storage Rules**: Strict type validation (images/PDF) and 10MB individual file limits.
-   **Realtime DB**: Used for high-frequency location pings with ephemeral node TTLs.

### Environment Validation
The application uses a strict `validateEnv.ts` boot-sequence. If critical API keys (Firebase/Maps) are missing, the UI gracefully falls back to a global configuration error state rather than crashing.

---

## 🎯 Roadmap

### ✅ Completed (v1.0 - Jan 2026)
- [x] **Premium UI/UX**: Cinematic city-zoom hero and glassmorphism.
- [x] **FlexFare System**: Native negotiation bridge between users.
- [x] **Tiffin Optimization**: Route batching logic for high-yield deliveries.
- [x] **Security Hardening**: Comprehensive Firestore/Storage security rules.
- [x] **Earnings Forecast**: Real-time yields and demand prediction charts.

### 🔄 In Progress (v1.1)
- [ ] **Internationalization**: Full i18n support for Hindi and Regional dialects.
- [ ] **Advanced Analytics**: Cohort analysis for rider retention in AdminHQ.
- [ ] **PWA Support**: Offline-first capabilities for low-bandwidth zones.

### 📋 Planned (v2.0)
- [ ] **AI Route Prediction**: Predicting high-demand zones before they happen.
- [ ] **Fleet API**: External API access for third-party logistics partners.
- [ ] **Electric Fleet (EV)**: Specialized booking category with charging station maps.

## 📚 Documentation & Reference

### Custom Hooks (`hooks/`)
```typescript
// Driver Lifecycle
const { drivers, approveDriver, rejectDriver } = useDriverManagement({ status: "PENDING" });

// Tiffin Operations
const { orders, assignDriver } = useTiffinManagement();

// System Calibration
const { config, updateBaseFare } = useSystemConfig();
```

### API Service Layer (`services/api/`)
```typescript
import { ridesAPI } from "./services/api/rides";

// Real-time Ride Subscription
const unsubscribe = ridesAPI.subscribeToRide(rideId, (ride) => {
  console.log("Current Status:", ride.status);
});
```

---

## 🚀 Deployment

### Firebase CLI Commands
```bash
# 1. Auth Login
firebase login

# 2. Deploy Rules (Firestore/Storage/RTDB)
firebase deploy --only firestore:rules,storage:rules,database:rules

# 3. Production Build & Hosting
npm run build
firebase deploy --only hosting
```

### Production status
- [**Live Link**](https://gaadiwala-app.web.app)
- **Tech Version**: v1.0.4-stable
- **Build Compression**: gzip/brotli enabled

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all security rules are tested

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Mayank Maurya** - [@mayankkmauryaa](https://github.com/mayankkmauryaa)

---

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Google Maps Platform for location services
- React community for excellent tooling
- All contributors and testers

---

## 📞 Support

For support, email `hpmayankmaurya@gmail.com` or open an issue on GitHub.

---

- **Built with ❤️ for better urban mobility**
