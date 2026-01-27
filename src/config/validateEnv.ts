/**
 * Environment Variable Validation
 * Ensures all required environment variables are present before app initialization
 */

interface EnvConfig {
    // Firebase
    FIREBASE_API_KEY: string;
    FIREBASE_AUTH_DOMAIN: string;
    FIREBASE_DATABASE_URL: string;
    FIREBASE_PROJECT_ID: string;
    FIREBASE_STORAGE_BUCKET: string;
    FIREBASE_MESSAGING_SENDER_ID: string;
    FIREBASE_APP_ID: string;
    FIREBASE_MEASUREMENT_ID: string;

    // Google Maps (Required)
    GOOGLE_MAPS_API_KEY: string;

    // Optional APIs
    RAZORPAY_KEY_ID?: string;
    CLOUDINARY_CLOUD_NAME?: string;
}

const REQUIRED_ENV_VARS = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
    'REACT_APP_GOOGLE_MAPS_API_KEY', // Required for Maps functionality
] as const;

const OPTIONAL_ENV_VARS = [
    'REACT_APP_FIREBASE_DATABASE_URL',
    'REACT_APP_FIREBASE_MEASUREMENT_ID',
    'REACT_APP_RAZORPAY_KEY_ID',
    'REACT_APP_CLOUDINARY_CLOUD_NAME',
] as const;

export class EnvironmentValidationError extends Error {
    constructor(message: string, public missingVars: string[]) {
        super(message);
        this.name = 'EnvironmentValidationError';
    }
}

/**
 * Validates that all required environment variables are present
 * @throws {EnvironmentValidationError} if required variables are missing
 */
export const validateEnvironment = (): void => {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    REQUIRED_ENV_VARS.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });

    // Check optional but recommended variables
    OPTIONAL_ENV_VARS.forEach(varName => {
        if (!process.env[varName]) {
            warnings.push(varName);
        }
    });

    if (missing.length > 0) {
        const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║                  ENVIRONMENT CONFIGURATION ERROR                ║
╚════════════════════════════════════════════════════════════════╝

Missing required environment variables:
${missing.map(v => `  ❌ ${v}`).join('\n')}

To fix this:
1. Copy .env.example to .env
2. Fill in the required values
3. Restart the development server

For CodeSandbox/Production:
- Add these variables in your environment settings
- See CODESANDBOX_SETUP.md for detailed instructions
    `.trim();

        throw new EnvironmentValidationError(errorMessage, missing);
    }

    // Log warnings for optional variables
    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Optional environment variables not set:');
        warnings.forEach(v => console.warn(`   - ${v}`));
        console.warn('   Some features may not work correctly.\n');
    }
};

/**
 * Gets a validated environment configuration object
 * @returns {EnvConfig} Validated environment configuration
 */
export const getEnvConfig = (): EnvConfig => {
    validateEnvironment();

    return {
        FIREBASE_API_KEY: process.env.REACT_APP_FIREBASE_API_KEY!,
        FIREBASE_AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN!,
        FIREBASE_DATABASE_URL: process.env.REACT_APP_FIREBASE_DATABASE_URL || '',
        FIREBASE_PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID!,
        FIREBASE_STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET!,
        FIREBASE_MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID!,
        FIREBASE_APP_ID: process.env.REACT_APP_FIREBASE_APP_ID!,
        FIREBASE_MEASUREMENT_ID: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || '',
        GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY!, // Now required
        RAZORPAY_KEY_ID: process.env.REACT_APP_RAZORPAY_KEY_ID,
        CLOUDINARY_CLOUD_NAME: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
    };
};
