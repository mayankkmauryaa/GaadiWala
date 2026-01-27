import { calculateFare } from './pricing';
import { VehicleCategory, User, UserRole } from '../types';

describe('Pricing Service', () => {
    const mockUser: User = {
        id: '1',
        name: 'Test User',
        role: UserRole.RIDER,
        isApproved: true,
        isKycCompleted: true,
        savedLocations: [],
        scheduledRides: []
    };

    test('calculates base fare correctly for Auto', () => {
        const fare = calculateFare(5, 10, VehicleCategory.AUTO, mockUser);
        // Base: 30
        // Dist: 5 * 10 = 50
        // Time: 10 * 1.5 = 15
        // Total: 30 + 50 + 15 = 95
        expect(fare.total).toBe(95);
    });

    test('applies Student Discount for age 20', () => {
        const studentUser: User = {
            ...mockUser,
            ageVerified: true,
            birthDate: `${new Date().getFullYear() - 20}-01-01`
        };
        const fare = calculateFare(10, 20, VehicleCategory.MINI, studentUser);
        // Base Mini: 50
        // Dist: 10 * 15 = 150
        // Time: 20 * 2 = 40
        // Subtotal: 240
        // Discount: 5% of 240 = 12
        // Total: 240 - 12 = 228

        expect(fare.discounts).toContainEqual(expect.objectContaining({ type: 'AGE' }));
        expect(fare.total).toBe(228);
    });

    test('applies Loyalty Discount for 4th ride', () => {
        const loyalUser: User = { ...mockUser, totalRides: 3 }; // Next is 4th
        const fare = calculateFare(5, 10, VehicleCategory.BIKE, loyalUser);

        expect(fare.discounts).toContainEqual(expect.objectContaining({ type: 'LOYALTY' }));
    });
});
