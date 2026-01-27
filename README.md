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
- [Recent Refactoring](#-recent-refactoring-jan-2026)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Security](#-security)
- [Documentation](#-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## ✨ Features

### 🚗 Rider Features

- **Live Map Booking** - Real-time driver tracking with Google Maps
- **Multiple Vehicle Categories** - Bike, Auto, Mini, Pink Cab (women-only), Prime
- **Fare Bidding System** - Negotiate fares with drivers
- **Tiffin Marketplace** - Subscribe to daily meal delivery
- **Digital Wallet** - Seamless in-app payments
- **Live Tracking** - Real-time ride progress with OTP verification
- **Safety Features** - SOS button, trip sharing

### 🚕 Driver Features

- **Smart Dashboard** - Accept rides, view earnings, hotspot maps
- **Dual Mode** - Switch between ride-hailing and tiffin delivery
- **KYC Verification** - Document upload with DigiLocker integration
- **Earnings Analytics** - Daily/weekly charts with incentive tracking
- **Gamification** - Tier system (Bronze/Silver/Gold) based on performance

### 🎨 Design & Experience (NEW)

- **Premium Aesthetics** - Cinematic hero sections with slow-zoom transitions
- **Ambient Depth** - Floating blurred orbs and glassmorphic layers
- **Optimized Mobile Flow** - Intelligent layout stacking for seamless onboarding
- **Social Proof** - Live ride tracking stats and verified community badges

### 🛡️ Admin Features

- **Live Operations Dashboard** - Real-time metrics and heatmaps
- **Fleet Management** - Approve/reject drivers, manage users
- **Promo Code Engine** - Create and manage promotional campaigns
- **Tiffin Operations** - Monitor food delivery orders
- **System Configuration** - Dynamic pricing and surge control

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

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Login, Signup, Phone verification
│   ├── Booking/        # Ride request components
│   ├── Safety/         # SOS button
│   ├── Tiffin/         # Tiffin marketplace components
│   ├── ErrorBoundary.tsx
│   └── LoadingState.tsx
├── context/            # React Context providers
│   └── AuthContext.tsx # Authentication state
├── hooks/              # Custom React hooks
│   ├── useRide.ts      # Ride management
│   ├── useDriverManagement.ts
│   ├── useTiffinManagement.ts
│   └── useSystemConfig.ts
├── screens/            # Page components
│   ├── rider/          # Rider-specific screens
│   ├── driver/         # Driver-specific screens
│   └── admin/          # Admin dashboard
├── services/           # Business logic
│   ├── api/            # API abstraction layer
│   │   ├── rides.ts
│   │   └── users.ts
│   └── pricing.ts      # Fare calculation
├── config/             # Configuration
│   └── validateEnv.ts  # Environment validation
├── types.ts            # TypeScript definitions
└── firebase.ts         # Firebase initialization
```

---

## 🔒 Security

### Firebase Security Rules

We've implemented comprehensive security rules:

**Firestore Rules** ([`firestore.rules`](firestore.rules))

- Role-based access control (Rider/Driver/Admin)
- Users can only access their own data
- Drivers need approval to accept rides
- Admins have full access to all collections

**Storage Rules** ([`storage.rules`](storage.rules))

- File type validation (images/PDFs only)
- Size limits (5MB for images, 10MB for documents)
- User-specific access control

**Realtime Database Rules** ([`database.rules.json`](database.rules.json))

- Authentication required for all operations
- Role-based read/write permissions

### Environment Validation

The app validates all required environment variables on startup and provides clear error messages if any are missing.

---

## 📚 Documentation

<!-- ### Refactoring Documentation

All refactoring work is documented in detail:

1. **[Implementation Plan](docs/implementation_plan.md)** - Complete P0-P3 roadmap
2. **[Walkthrough](docs/walkthrough.md)** - What was implemented
3. **[Quick Reference](docs/QUICK_REFERENCE.md)** - Code examples for new hooks/services
4. **[Final Summary](docs/FINAL_SUMMARY.md)** - Complete overview
5. **[Deployment Success](docs/DEPLOYMENT_SUCCESS.md)** - Production deployment status -->

### Key Features Documentation

- **Custom Hooks Usage**:

  ```typescript
  // Driver management
  const { drivers, approveDriver, rejectDriver } = useDriverManagement({
    status: "PENDING",
  });

  // Tiffin orders
  const { orders, assignDriver } = useTiffinManagement();

  // System config
  const { config, updateBaseFare } = useSystemConfig();
  ```

- **API Services Usage**:

  ```typescript
  import { ridesAPI } from "./services/api/rides";

  // Create ride
  const rideId = await ridesAPI.create({
    /* ... */
  });

  // Subscribe to updates
  const unsubscribe = ridesAPI.subscribeToRide(rideId, (ride) => {
    console.log("Status:", ride.status);
  });
  ```

---

## 🚀 Deployment

### Firebase Deployment

```bash
# 1. Login to Firebase
firebase login

# 2. Deploy security rules
firebase deploy --only firestore:rules,storage:rules,database:rules

# 3. Deploy hosting
npm run build
firebase deploy --only hosting
```

### Current Deployment

- [**Live App**](https://gaadiwala-app.web.app)
- [**Firebase Console**](https://console.firebase.google.com/project/gaadiwala-app/overview)
- **Build Size**: 418 kB (gzipped)
- **Status**: ✅ Production-ready

---

## 🎯 Roadmap

### ✅ Completed (P0 & P1)

- Environment validation
- Firebase security rules
- Custom hooks architecture
- API service layer
- Enhanced error handling
- Production deployment

### 🔄 In Progress (P2)

- [ ] Refactor AdminHQ using new hooks
- [ ] Add Zod form validation
- [ ] Remove remaining `any` types
- [ ] Optimize re-renders with `useMemo`/`useCallback`

### 📋 Planned (P3)

- [ ] React Query for data fetching
- [ ] Code splitting with lazy loading
- [ ] Storybook for component development
- [ ] E2E testing with Playwright
- [ ] Full internationalization (i18n)

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
