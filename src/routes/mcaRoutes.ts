import { Router } from "express";
import { checkNameAvailability, getCompanyDetails } from "../controllers/mcaController.js";

const router = Router();

router.post("/name-check", checkNameAvailability);
router.post("/company-details", getCompanyDetails);

export default router;
