import { Router } from "express";
import { checkNameAvailability, getSimilarNames, getCompanyDetails } from "../controllers/mcaController.js";

const router = Router();

router.post("/name-check", checkNameAvailability);
router.get("/similar", getSimilarNames);
router.post("/company-details", getCompanyDetails);

export default router;
