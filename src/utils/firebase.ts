import { initializeApp, cert } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

let isInitialized = false;

export function initializeFirebase() {
  if (isInitialized) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    try {
      const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
      initializeApp({
        credential: cert({
          projectId,
          privateKey: formattedPrivateKey,
          clientEmail,
        }),
      });
      isInitialized = true;
      console.log("Firebase Admin SDK initialized successfully.");
      return true;
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
      return false;
    }
  }
  return false;
}

/**
 * Verifies a Firebase ID token.
 * Supports sandbox test tokens prefixed with "TEST_FIREBASE_TOKEN_FOR_" to bypass 
 * network checks during E2E automated local test runs.
 */
export async function verifyFirebaseToken(token: string): Promise<{ phoneNumber?: string } | null> {
  if (token.startsWith("TEST_FIREBASE_TOKEN_FOR_")) {
    const phoneNumber = token.replace("TEST_FIREBASE_TOKEN_FOR_", "");
    return { phoneNumber };
  }

  const initialized = initializeFirebase();
  if (!initialized) {
    throw new Error(
      "Firebase Admin is not configured on the server. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL."
    );
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return {
      phoneNumber: decodedToken.phone_number,
    };
  } catch (error: any) {
    console.error("Firebase token verification error:", error);
    return null;
  }
}
