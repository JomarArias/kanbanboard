// src/routes/card.routes.ts
import { Router } from "express";
import {
  createCard,
  deleteCard,
  listCardsByList,
  moveCard,
  updateCard,
  searchCards,
  archiveCard,
  listArchivedCards,
  restoreCard,
} from "../controllers/card.controller.js";

const router = Router();

router.get("/cards/search",   searchCards);
router.get("/cards/archived", listArchivedCards);
router.get("/lists/:listId/cards", listCardsByList);
router.post("/cards",         createCard);
router.put("/cards/move",     moveCard);
router.put("/cards/:id",      updateCard);
router.delete("/cards/:id",   deleteCard);

// ── ARCHIVADO ────────────────────────────────────────────────────────────────────
router.patch("/cards/:id/archive", archiveCard);
router.patch("/cards/:id/restore", restoreCard);
// ─────────────────────────────────────────────────────────────────────────────

export default router;