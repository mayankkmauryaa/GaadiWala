import { User, PricingConfig, VehicleCategory, PricingDetails } from '../types';

export const DEFAULT_CONFIG: PricingConfig = {
    baseFare: 25,
    perKm: 8,
    studentDiscountPercent: 5,
    seniorDiscountPercent: 10,
    loyaltyDiscountPercent: 10,
    loyaltyRideThreshold: 4,
    driverBasePriceRange: [20, 35]
};

const CATEGORY_FACTORS: Record<VehicleCategory, { base: number; perKm: number; perMin: number }> = {
    [VehicleCategory.BIKE]: { base: 12, perKm: 5, perMin: 0.5 },
    [VehicleCategory.AUTO]: { base: 20, perKm: 7, perMin: 1 },
    [VehicleCategory.MINI]: { base: 35, perKm: 10, perMin: 1.5 },
    [VehicleCategory.PINK]: { base: 40, perKm: 10, perMin: 1.5 },
    [VehicleCategory.PRIME]: { base: 55, perKm: 18, perMin: 2 },
};

export const calculateFare = (
    distanceKm: number,
    durationMins: number,
    category: VehicleCategory,
    user?: User,
    dynamicConfig?: { baseFares: Record<VehicleCategory, number>; surgeMultiplier: number },
    passengerCount: number = 1,
    config: PricingConfig = DEFAULT_CONFIG
): PricingDetails => {
    const factors = CATEGORY_FACTORS[category];
    const baseFare = dynamicConfig?.baseFares[category] || factors.base;
    const surgeMultiplier = dynamicConfig?.surgeMultiplier || 1.0;

    const distanceFare = distanceKm * factors.perKm;
    const timeFare = durationMins * factors.perMin;

    // Total gross fare is (Base + Distance + Time) * Surge * PassengerCount
    // per user request: "price should be set as 179 x 2 i.e. 358"
    const grossFare = (baseFare + distanceFare + timeFare) * surgeMultiplier * passengerCount;

    const discounts: PricingDetails['discounts'] = [];

    if (user) {
        // Age-based discounts
        if (user.ageVerified && user.birthDate) {
            const age = calculateAge(user.birthDate);
            if (age >= 13 && age <= 25) {
                const amount = (grossFare * config.studentDiscountPercent) / 100;
                discounts.push({ type: 'AGE', amount, description: `Student Discount (${config.studentDiscountPercent}%)` });
            } else if (age >= 60) {
                const amount = (grossFare * config.seniorDiscountPercent || grossFare * 10 / 100);
                discounts.push({ type: 'AGE', amount, description: `Senior Citizen Discount (10%)` });
            }
        }

        // Loyalty discount
        if (user.totalRides && user.totalRides >= config.loyaltyRideThreshold - 1) {
            const amount = (grossFare * config.loyaltyDiscountPercent) / 100;
            discounts.push({ type: 'LOYALTY', amount, description: `Loyalty Reward (${config.loyaltyDiscountPercent}%)` });
        }
    }

    // Use max discount for now (non-stacking)
    const totalDiscount = discounts.length > 0 ? Math.max(...discounts.map(d => d.amount)) : 0;

    return {
        baseFare,
        distanceFare,
        timeFare,
        surgeMultiplier,
        discounts,
        total: Math.round(grossFare - totalDiscount),
        currency: 'INR'
    };
};

const calculateAge = (dobString: string): number => {
    const dob = new Date(dobString);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};
