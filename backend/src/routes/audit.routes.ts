import { Router } from "express";
import { listAuditLogs } from "../controllers/audit.controller.js";

const router = Router();

router.get("/audit-logs", listAuditLogs);

export default router;
