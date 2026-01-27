/**
 * Run this script locally to grant admin privileges.
 * 
 * Usage:
 *   export SERVICE_ACCOUNT_KEY="$(cat path/to/serviceAccountKey.json)"
 *   export ADMIN_EMAIL="admin@example.com"
 *   node scripts/setAdminClaim.js
 */

const admin = require('firebase-admin');

// 1. Initialize Firebase Admin SDK
// Check if SERVICE_ACCOUNT_KEY env var is present
if (!process.env.SERVICE_ACCOUNT_KEY) {
    console.error("Error: SERVICE_ACCOUNT_KEY env var is missing.");
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const email = process.env.ADMIN_EMAIL;

if (!email) {
    console.error("Error: ADMIN_EMAIL env var is missing.");
    process.exit(1);
}

// 2. Grant Claim
async function grantAdminRole(email) {
    try {
        const user = await admin.auth().getUserByEmail(email);

        // Add 'admin' claim
        // Existing claims are preserved or overwritten if key matches
        const currentClaims = user.customClaims || {};
        await admin.auth().setCustomUserClaims(user.uid, {
            ...currentClaims,
            admin: true
        });

        console.log(`Success! User ${email} (UID: ${user.uid}) is now an admin.`);
        console.log("Ask the user to sign out and sign in again (or force token refresh) to pick up the new claim.");

    } catch (error) {
        console.error("Error setting admin claim:", error);
        process.exit(1);
    }
}

grantAdminRole(email);
