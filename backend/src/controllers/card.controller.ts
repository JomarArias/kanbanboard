// src/controllers/card.controller.ts
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { sendError } from "../utils/http-response.js";
import {
  listCardsByList as listCardsByListService,
  createCard as createCardService,
  updateCard as updateCardService,
  deleteCard as deleteCardService,
  moveCard as moveCardService,
  searchCards as searchCardsService,
  archiveCard as archiveCardService,
  listArchivedCards as listArchivedCardsService,
  restoreCard as restoreCardService,
} from "../services/card.service.js";

export const listCardsByList = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    if (!listId) return sendError(res, 400, "listId es requerido");
    const cards = await listCardsByListService(listId);
    return res.json(cards);
  } catch (err) {
    return sendError(res, 500, "Error listando tarjetas", err);
  }
};

// ─── NUEVO CONTROLADOR ────────────────────────────────────────────────────────
// GET /cards/search?q=<término>
export const searchCards = async (req: Request, res: Response) => {
  try {
    const q = (req.query["q"] as string) ?? "";

    if (!q.trim()) {
      return sendError(res, 400, "El parámetro q es requerido");
    }

    const cards = await searchCardsService(q);
    return res.json(cards);
  } catch (err) {
    return sendError(res, 500, "Error buscando tarjetas", err);
  }
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── ARCHIVADO ──────────────────────────────────────────────────────────────────

// PATCH /cards/:id/archive
export const archiveCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
    const card = await archiveCardService(id);
    return res.json(card);
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error archivando tarjeta", err);
  }
};

// GET /cards/archived
export const listArchivedCards = async (_req: Request, res: Response) => {
  try {
    const cards = await listArchivedCardsService();
    return res.json(cards);
  } catch (err) {
    return sendError(res, 500, "Error listando tarjetas archivadas", err);
  }
};

// PATCH /cards/:id/restore
export const restoreCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
    const card = await restoreCardService(id);
    return res.json(card);
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error restaurando tarjeta", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export const createCard = async (req: Request, res: Response) => {
  try {
    const { listId, title, task } = req.body ?? {};
    if (!listId || !title || !task) return sendError(res, 400, "listId, title y task son requeridos");
    const card = await createCardService(listId, title, task);
    return res.status(201).json(card);
  } catch (err) {
    return sendError(res, 500, "Error creando tarjeta", err);
  }
};

export const updateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, task, expectedVersion } = req.body;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
    if (!title || !task) return sendError(res, 400, "title y task son requeridos");
    const card = await updateCardService(id, title, task, expectedVersion);
    return res.json(card);
  } catch (err: any) {
    if (err?.status === 409) return res.status(409).json({ message: err.message, currentCard: err.currentCard });
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error actualizando tarjeta", err);
  }
};

export const deleteCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
    await deleteCardService(id);
    return res.json({ ok: true });
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error eliminando tarjeta", err);
  }
};

export const moveCard = async (req: Request, res: Response) => {
  try {
    const { cardId, listId, prevOrder, nextOrder } = req.body ?? {};
    if (!cardId || !listId) return sendError(res, 400, "cardId y listId son requeridos");
    if (!isValidObjectId(cardId)) return sendError(res, 400, "cardId invalido");
    const result = await moveCardService(cardId, listId, prevOrder, nextOrder);
    return res.json(result);
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    if (err?.status === 400) return sendError(res, 400, err.message);
    return sendError(res, 500, "Error moviendo tarjeta", err);
  }
};