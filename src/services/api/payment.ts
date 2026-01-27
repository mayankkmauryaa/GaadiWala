
import { db, CONFIG } from '../../firebase';
import { collection, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { WalletTransaction } from '../../types';

export const loadRazorpay = () => {
    return new Promise((resolve) => {
        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const initializePayment = async (options: {
    amount: number;
    userName: string;
    userEmail?: string;
    userPhone?: string;
    description: string;
}) => {
    const res = await loadRazorpay();
    if (!res) {
        throw new Error("Razorpay SDK failed to load.");
    }

    if (!CONFIG.RAZORPAY_KEY_ID) {
        throw new Error("Razorpay Key ID is not configured in environment.");
    }

    return new Promise((resolve, reject) => {
        const razorpayOptions = {
            key: CONFIG.RAZORPAY_KEY_ID,
            amount: Math.round(options.amount * 100), // Amount in paise
            currency: "INR",
            name: "Gaadiwala",
            description: options.description,
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gaadiwala",
            handler: function (response: any) {
                resolve({ success: true, paymentId: response.razorpay_payment_id });
            },
            prefill: {
                name: options.userName,
                email: options.userEmail || "",
                contact: options.userPhone || "",
            },
            theme: {
                color: "#00D1FF",
            },
            modal: {
                ondismiss: function () {
                    reject(new Error("Payment cancelled by user"));
                }
            }
        };

        const rzp = new (window as any).Razorpay(razorpayOptions);
        rzp.on('payment.failed', function (response: any) {
            reject(new Error(response.error.description || "Payment failed"));
        });
        rzp.open();
    });
};

export const topUpWallet = async (userId: string, amount: number, paymentId: string) => {
    try {
        // 1. Update User Balance
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            walletBalance: increment(amount)
        });

        // 2. Add Transaction Log
        const transaction: Omit<WalletTransaction, 'id'> = {
            userId,
            amount,
            type: 'CREDIT',
            description: 'Wallet Top-up',
            timestamp: Date.now(),
            metadata: { paymentId }
        };
        await addDoc(collection(db, 'transactions'), transaction);

        return true;
    } catch (err) {
        console.error("Wallet Top-up error:", err);
        throw err;
    }
};

export const deductFromWallet = async (userId: string, amount: number, description: string) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            walletBalance: increment(-amount)
        });

        const transaction: Omit<WalletTransaction, 'id'> = {
            userId,
            amount,
            type: 'DEBIT',
            description,
            timestamp: Date.now()
        };
        await addDoc(collection(db, 'transactions'), transaction);
        return true;
    } catch (err) {
        console.error("Wallet Deduction error:", err);
        throw err;
    }
};
