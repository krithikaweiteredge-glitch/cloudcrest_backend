import { Router } from "express";
import { createTicket, getMyTickets, getTicketDetails } from "../controllers/ticketController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { createTicketSchema } from "../validators/schemas.js";

const router = Router();

// Force auth verification on all support ticket actions
router.use(authMiddleware as any);

// Users can create and view their tickets only. Replying and resolving are
// admin-only actions handled under /api/admin/tickets.
router.post("/", validate(createTicketSchema), createTicket as any);
router.get("/my-tickets", getMyTickets as any);
router.get("/:id", getTicketDetails as any);

export default router;
