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

export type FirebaseIdentity = {
  uid?: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
};

/**
 * Verifies a Firebase ID token and returns the decoded identity (phone and/or Google).
 * Supports sandbox test tokens prefixed with "TEST_FIREBASE_TOKEN_FOR_" to bypass
 * network checks during E2E automated local test runs. If the suffix looks like an
 * email it is treated as a Google identity, otherwise as a phone number.
 */
export async function verifyFirebaseToken(token: string): Promise<FirebaseIdentity | null> {
  if (token.startsWith("TEST_FIREBASE_TOKEN_FOR_")) {
    const value = token.replace("TEST_FIREBASE_TOKEN_FOR_", "");
    if (value.includes("@")) {
      return { email: value, name: value.split("@")[0], emailVerified: true };
    }
    return { phoneNumber: value };
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
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number,
      email: decodedToken.email,
      name: (decodedToken.name as string | undefined) ?? undefined,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified,
    };
  } catch (error: any) {
    console.error("Firebase token verification error:", error);
    return null;
  }
}
