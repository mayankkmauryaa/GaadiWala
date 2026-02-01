// import exp from "constants";

export enum UserRole {
    RIDER = 'RIDER',
    DRIVER = 'DRIVER',
    ADMIN = 'ADMIN',
    UNSET = 'UNSET'
}

export type Language = 'en' | 'hi';
export type RideType = 'SHARED' | 'RESERVED';
export type PaymentMethod = 'UPI' | 'CARD' | 'CASH' | 'WALLET';

export interface SavedLocation {
    id: string;
    label: string;
    address: string;
    coords?: Coordinates; // Added for precise saved locations
    type: 'HOME' | 'WORK' | 'OTHER';
}

export interface ScheduledRide {
    id: string;
    pickup: string;
    destination: string;
    timestamp: number;
    rideType: RideType;
    category: VehicleCategory;
    fare: number;
    driverId?: string;
    paymentMethod?: PaymentMethod;
}

export interface Trip {
    id: string;
    date: string;
    pickup: string;
    destination: string;
    fare: number;
    status: 'COMPLETED' | 'CANCELLED';
    rating?: number;
    driverName?: string;
    vehicle?: string;
    category?: VehicleCategory;
    cancellationReason?: string; // Added field
}

export interface User {
    id: string;
    email?: string;
    phone?: string;
    role: UserRole;
    roles?: UserRole[]; // Track all capabilities (Rider, Driver, Admin)
    isApproved: boolean;
    isKycCompleted: boolean;
    name: string;
    avatar?: string;
    rejectionReason?: string;
    // Vehicle details for drivers
    vehicleImage?: string;
    vehicleNumber?: string;
    vehicleModel?: string; // Added
    vehicleType?: VehicleCategory;
    rating?: number;
    // Personalization
    savedLocations: SavedLocation[];
    scheduledRides: ScheduledRide[];
    tripHistory?: Trip[];
    isActive?: boolean;
    wasDriverRemoved?: boolean; // Tracking for re-application flow
    createdAt?: string;
    emailVerified?: boolean;
    lastLogin?: string;
    provider?: 'password' | 'google' | 'phone';
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    birthDate?: string;
    ageVerified?: boolean;
    loyaltyPoints?: number;
    totalRides?: number;
    currentLocation?: Coordinates; // Added
    walletBalance?: number;
    referralCode?: string;
    isOnline?: boolean; // For drivers - indicates if they're currently online/available
    lastOnline?: number; // Timestamp of last online activity
    preferredRoutes?: PreferredRoute[]; // Driver's multiple intended routes/destinations with costs
    bio?: string;
    languages?: string[];
}

export interface PreferredRoute {
    destination: string;
    price: number;
}


export interface RideRequest {
    id: string;
    riderId: string;
    riderName: string;
    riderRating: number;
    pickupLocation: Coordinates;
    dropLocation: Coordinates;
    pickupAddress: string;
    dropAddress: string;
    vehicleType: VehicleCategory;
    status: RideStatus;
    createdAt: any; // Using any for serverTimestamp compatibility
    estimatedFare: number;
    otp: string;
    paymentMethod: string;
    driverId?: string | null;
    driverName?: string;
    driverPhone?: string;
    driverAvatar?: string;
    driverRating?: number;
    driverDetails?: {
        name: string;
        avatar?: string;
        vehicleModel?: string;
        vehicleNumber?: string;
        rating: number;
    };
    acceptedAt?: any;
    isRideCheckEnabled?: boolean;
    preferences?: RidePreferences;
    // Optimistic locking and idempotency
    version?: number;
    locationSequence?: number;
    locationUpdatedAt?: any;
    declinedDrivers?: string[]; // Track drivers who declined to prevent re-dispatch
    dispatchedDrivers?: string[]; // Track all dispatched drivers for deduplication
}

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: number;
}

export interface RidePreferences {
    silent: boolean;
    ac: boolean;
    music: boolean;
}

export interface Report {
    id: string;
    type: 'BUG' | 'SPAM' | 'ABUSE';
    description: string;
    status: 'OPEN' | 'RESOLVED';
    timestamp: number;
    reporterId: string;
}

export interface Coordinates {
    lat: number;
    lng: number;
}

export enum RideStatus {
    SEARCHING = 'SEARCHING',
    ACCEPTED = 'ACCEPTED',
    ARRIVED = 'ARRIVED',
    STARTED = 'STARTED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    DECLINED = 'DECLINED', // Driver declined
    PAYMENT_PENDING = 'PAYMENT_PENDING',
}

export enum VehicleCategory {
    BIKE = 'BIKE',
    AUTO = 'AUTO',
    MINI = 'MINI',
    PRIME = 'PRIME',
    PINK = 'PINK', // Women only
}

export interface PricingDetails {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    discounts: {
        type: 'AGE' | 'LOYALTY' | 'PROMO';
        amount: number;
        description: string;
    }[];
    total: number;
    currency: string;
}

export interface SafetySettings {
    shareTripEnabled: boolean;
    emergencyContactIds: string[];
}

export interface PricingConfig {
    baseFare: number;
    perKm: number;
    studentDiscountPercent: number;
    seniorDiscountPercent: number;
    loyaltyDiscountPercent: number;
    loyaltyRideThreshold: number;
    driverBasePriceRange: [number, number]; // [min, max]
}

export interface TiffinVendor {
    id: string;
    isSuspended?: boolean;
    name: string;
    description: string;
    rating: number;
    image: string;
    location: Coordinates;
    pureVeg: boolean;
    basePrice: number;
    menus: {
        id: string;
        day: string;
        items: string[];
    }[];
    plans: {
        id: string;
        name: string;
        duration: 'DAILY' | 'WEEKLY' | 'MONTHLY';
        price: number;
    }[];
}

export interface TiffinSubscription {
    id: string;
    userId: string;
    vendorId: string;
    planId: string;
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    startDate: string;
    endDate: string;
    deliveryTime: string;
    address: string;
}

export interface TiffinOrder {
    id: string;
    subscriptionId?: string;
    userId: string;
    vendorId: string;
    vendorName: string;
    status: 'PENDING' | 'PICKED' | 'DELIVERED' | 'CANCELLED';
    deliveryAddress: string;
    deliveryLocation?: Coordinates; // Added for precision optimization
    batchId?: string; // Grouping indicator
    price: number;
    createdAt: any;
    driverId?: string | null;
    driverName?: string;
    pickedAt?: any;
    deliveredAt?: any;
}

export interface WalletTransaction {
    id: string;
    userId: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    timestamp: number;
    metadata?: any;
}

export interface PromoCode {
    id: string;
    code: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    value: number;
    maxDiscount: number;
    expiry: number;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
}
