import { db } from "../config/db.js";
import { otps } from "../models/schema.js";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Running integration test for Email OTP authentication...");

  const testEmail = `test_otp_${Date.now()}@example.com`;

  // 1. Send OTP
  console.log("1. Sending OTP to", testEmail);
  const sendRes = await fetch("http://localhost:5000/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail }),
  });

  const sendData = (await sendRes.json()) as any;
  if (sendRes.status !== 200) {
    console.error("Send OTP failed:", sendData);
    process.exit(1);
  }
  console.log("Send OTP response:", sendData);

  // 2. Fetch code from database
  console.log("2. Querying database for OTP code...");
  const dbOtps = await db
    .select()
    .from(otps)
    .where(eq(otps.emailOrPhone, testEmail))
    .limit(1);

  if (dbOtps.length === 0) {
    console.error("No OTP found in database!");
    process.exit(1);
  }

  const generatedCode = dbOtps[0].code;
  console.log("Retrieved OTP code from database:", generatedCode);

  // 3. Verify OTP
  console.log("3. Verifying OTP...");
  const verifyRes = await fetch("http://localhost:5000/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, code: generatedCode }),
  });

  const verifyData = (await verifyRes.json()) as any;
  if (verifyRes.status !== 200) {
    console.error("Verification failed:", verifyData);
    process.exit(1);
  }
  console.log("Verification response:", verifyData);

  // Extract auth token cookie
  const cookieHeader = verifyRes.headers.get("set-cookie");
  if (!cookieHeader) {
    console.error("No set-cookie header found!");
    process.exit(1);
  }
  const tokenCookie = cookieHeader.split(";")[0];
  console.log("Auth Cookie:", tokenCookie);

  // 4. Check session state
  console.log("4. Fetching current session info (/me)...");
  const meRes = await fetch("http://localhost:5000/api/auth/me", {
    method: "GET",
    headers: { Cookie: tokenCookie },
  });

  const meData = (await meRes.json()) as any;
  if (meRes.status !== 200) {
    console.error("Session check failed:", meData);
    process.exit(1);
  }
  console.log("Logged-in user email verified:", meData.user.email);
  console.log("All OTP verification cases passed successfully!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Test failed with error:", e);
  process.exit(1);
});
