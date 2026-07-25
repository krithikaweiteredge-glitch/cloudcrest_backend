import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from "../controllers/authController.js";
import { sendOtp, verifyOtp, firebaseLogin, googleLogin } from "../controllers/otpController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { authLimiter, otpLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  firebaseLoginSchema,
} from "../validators/schemas.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), registerUser);
router.post("/login", authLimiter, validate(loginSchema), loginUser);
router.post("/logout", logoutUser);
router.post("/send-otp", otpLimiter, validate(sendOtpSchema), sendOtp);
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post("/firebase-login", authLimiter, validate(firebaseLoginSchema), firebaseLogin);
router.post("/google-login", authLimiter, validate(firebaseLoginSchema), googleLogin);
router.get("/me", authMiddleware as any, getCurrentUser as any);

export default router;
