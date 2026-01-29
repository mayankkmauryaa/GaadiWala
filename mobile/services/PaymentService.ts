import { Alert, Linking } from 'react-native';

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;

interface PaymentOptions {
    amount: number;
    currency?: string;
    name: string;
    description: string;
    prefill?: {
        email?: string;
        contact?: string;
    };
}

export const startPayment = async (options: PaymentOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Validation
        if (!RAZORPAY_KEY) {
            console.warn("Razorpay Key ID not found in environment.");
            // Proceed for demo purposes or reject?
            // reject(new Error("Razorpay configuration missing"));
        }

        // For Expo Go / Development, we'll use a Simulated Payment Flow
        // Real Razorpay needs `react-native-razorpay` (ejected) or a Web-based checkout link

        Alert.alert(
            "Payment Gateway",
            `Pay ₹${options.amount} for ${options.description}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => reject(new Error("Payment cancelled"))
                },
                {
                    text: "Pay Now",
                    onPress: () => {
                        // Mock Success
                        setTimeout(() => {
                            resolve("pay_mock_" + Date.now());
                        }, 1000);
                    }
                }
            ]
        );
    });
};
