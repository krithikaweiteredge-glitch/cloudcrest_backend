import { Router } from "express";
import { createTicket, getMyTickets, getTicketDetails, replyToTicket } from "../controllers/ticketController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// Force auth verification on all support ticket actions
router.use(authMiddleware as any);

router.post("/", createTicket as any);
router.get("/my-tickets", getMyTickets as any);
router.get("/:id", getTicketDetails as any);
router.post("/:id/messages", replyToTicket as any);

export default router;
