// src/controllers/card.controller.ts
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { sendError } from "../utils/http-response.js";
import * as cardService from "../services/card.service.js";
import { getIO } from "../sockets/socket.server.js";


export const listCardsByList = async (req: Request, res: Response) => {
  try {
    const listId = req.params.listId as string;
    const workspaceId = res.locals.workspaceId as string;

    if (!listId) return sendError(res, 400, "listId es requerido");

    const cards = await cardService.listCardsByList(listId, workspaceId);
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
    const workspaceId = res.locals.workspaceId as string;

    if (!q.trim()) {
      return sendError(res, 400, "El parámetro q es requerido");
    }

    const cards = await cardService.searchCards(q, workspaceId);
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
    const id = req.params.id as string;
    const workspaceId = res.locals.workspaceId as string;
    const performedById = res.locals.user._id;

    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

    const card = await cardService.archiveCard(id, workspaceId, performedById);

    try {
      getIO().to(`workspace:${workspaceId}`).emit("card:updated", card);
    } catch (e) {
      console.error("Socket error emitting card:updated", e);
    }

    return res.json(card);
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error archivando tarjeta", err);
  }
};

// GET /cards/archived
export const listArchivedCards = async (_req: Request, res: Response) => {
  try {
    const workspaceId = res.locals.workspaceId as string;
    const cards = await cardService.listArchivedCards(workspaceId);
    return res.json(cards);
  } catch (err) {
    return sendError(res, 500, "Error listando tarjetas archivadas", err);
  }
};

// PATCH /cards/:id/restore
export const restoreCard = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = res.locals.workspaceId as string;
    const performedById = res.locals.user._id;

    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

    const card = await cardService.restoreCard(id, workspaceId, performedById);

    try {
      getIO().to(`workspace:${workspaceId}`).emit("card:updated", card);
    } catch (e) {
      console.error("Socket error emitting card:updated", e);
    }

    return res.json(card);
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error restaurando tarjeta", err);
  }
};
// ─────────────────────────────────────────────────────────────────────────────

export const createCard = async (req: Request, res: Response) => {
  try {
    const { listId, title, task, assigneeId } = req.body ?? {};
    const workspaceId = res.locals.workspaceId as string;
    const performedById = res.locals.user._id;

    if (!listId || !title || !task) {
      return sendError(res, 400, "listId, title y task son requeridos");
    }

    const card = await cardService.createCard(listId, title, task, workspaceId, performedById, assigneeId);

    try {
      getIO().to(`workspace:${workspaceId}`).emit("card:created", card);
    } catch (e) {
      console.error("Socket error emitting card:created", e);
    }
    return res.status(201).json(card);
  } catch (err) {
    return sendError(res, 500, "Error creando tarjeta", err);
  }
};






export const updateCard = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, task, expectedVersion, dueDate, labels, style, assigneeId } = req.body ?? {};
    const workspaceId = res.locals.workspaceId as string;
    const performedById = res.locals.user._id;

    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      return sendError(res, 400, "expectedVersion debe ser un entero mayor o igual a 0");
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (task !== undefined) updateData.task = task;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (labels !== undefined) updateData.labels = labels
    if (style !== undefined) updateData.style = style
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;

    if (Object.keys(updateData).length === 0) {
      return sendError(res, 400, "No hay campos para actualizar")
    }

    const card = await cardService.updateCard(id as string, expectedVersion, updateData, workspaceId, performedById);

    // Broadcast to room
    try {
      getIO().to(`workspace:${workspaceId}`).emit("card:updated", card);
    } catch (e) {
      console.error("Socket error emitting card:updated", e);
    }
    return res.json(card);
  } catch (err: any) {
    if (err?.status === 409) return res.status(409).json({ message: err.message, currentCard: err.currentCard });
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error actualizando tarjeta", err);
  }
};










export const deleteCard = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = res.locals.workspaceId as string;
    const performedById = res.locals.user._id;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

    await cardService.deleteCard(id, workspaceId, performedById);

    try {
      getIO().to(`workspace:${workspaceId}`).emit("card:deleted", { _id: id });
    } catch (e) {
      console.error("Socket error emitting card:deleted", e);
    }
    return res.json({ ok: true });
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    return sendError(res, 500, "Error eliminando tarjeta", err);
  }
};

export const moveCard = async (req: Request, res: Response) => {
  try {
    const { cardId, listId, prevOrder, nextOrder } = req.body ?? {};
    const workspaceId = res.locals.workspaceId as string;
    const performedById = res.locals.user._id;

    if (!cardId || !listId) {
      return sendError(res, 400, "cardId y listId son requeridos");
    }

    if (!isValidObjectId(cardId)) {
      return sendError(res, 400, "cardId invalido");
    }

    const result = await cardService.moveCard(cardId, listId, workspaceId, performedById, prevOrder, nextOrder);

    try {
      getIO().to(`workspace:${workspaceId}`).emit("card:moved", { cardId, listId, order: result.order });
    } catch (e) {
      console.error("Socket error emitting card:moved", e);
    }
    return res.json(result);
  } catch (err: any) {
    if (err?.status === 404) return sendError(res, 404, err.message);
    if (err?.status === 400) return sendError(res, 400, err.message);
    return sendError(res, 500, "Error moviendo tarjeta", err);
  }
};
