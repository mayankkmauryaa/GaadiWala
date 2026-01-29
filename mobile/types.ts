// Copied from src/types.ts

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
    coords?: Coordinates;
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
    cancellationReason?: string;
}

export interface User {
    id: string;
    email?: string;
    phone?: string;
    role: UserRole;
    roles?: UserRole[];
    isApproved: boolean;
    isKycCompleted: boolean;
    name: string;
    avatar?: string;
    rejectionReason?: string;
    vehicleImage?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    vehicleType?: VehicleCategory;
    rating?: number;
    savedLocations: SavedLocation[];
    scheduledRides: ScheduledRide[];
    tripHistory?: Trip[];
    isActive?: boolean;
    wasDriverRemoved?: boolean;
    createdAt?: string;
    emailVerified?: boolean;
    lastLogin?: string;
    provider?: 'password' | 'google' | 'phone';
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    birthDate?: string;
    ageVerified?: boolean;
    loyaltyPoints?: number;
    totalRides?: number;
    currentLocation?: Coordinates;
    walletBalance?: number;
    referralCode?: string;
    isOnline?: boolean;
    lastOnline?: number;
    preferredRoutes?: PreferredRoute[];
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
    createdAt: any;
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
    PAYMENT_PENDING = 'PAYMENT_PENDING',
}

export enum VehicleCategory {
    BIKE = 'BIKE',
    AUTO = 'AUTO',
    MINI = 'MINI',
    PRIME = 'PRIME',
    PINK = 'PINK',
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
    driverBasePriceRange: [number, number];
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
    deliveryLocation?: Coordinates;
    batchId?: string;
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
