// src/controllers/card.controller.ts
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { sendError } from "../utils/http-response.js";
import * as cardService from "../services/card.service.js";

export const listCardsByList = async (req: Request, res: Response) => {
  try {
    const listId = req.params.listId as string;

    if (!listId) return sendError(res, 400, "listId es requerido");

    const cards = await cardService.listCardsByList(listId);
    return res.json(cards);
  } catch (err) {
    return sendError(res, 500, "Error listando tarjetas", err);
  }
};

export const createCard = async (req: Request, res: Response) => {
  try {
    const { listId, title, task } = req.body ?? {};

    if (!listId || !title || !task) {
      return sendError(res, 400, "listId, title y task son requeridos");
    }

    const card = await cardService.createCard(listId, title, task);

    console.log(`[BACKEND] Card created: ${card.title} in ${card.listId}`);
    return res.status(201).json(card);
  } catch (err) {
    return sendError(res, 500, "Error creando tarjeta", err);
  }
};

export const updateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, task } = req.body ?? {};

    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
    if (!title || !task) return sendError(res, 400, "title y task son requeridos");

    const card = await cardService.updateCard(id as string, title, task);

    return res.json(card);
  } catch (err: any) {
    return sendError(res, err.status || 500, err.message || "Error al actualizar la tarjeta");
  }
};

export const deleteCard = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

    await cardService.deleteCard(id);
    return res.json({ ok: true });
  } catch (err: any) {
    return sendError(res, err.status || 500, err.message || "Error eliminando tarjeta");
  }
};

export const moveCard = async (req: Request, res: Response) => {
  try {
    const { cardId, listId, prevOrder, nextOrder } = req.body ?? {};

    if (!cardId || !listId) {
      return sendError(res, 400, "cardId y listId son requeridos");
    }

    if (!isValidObjectId(cardId)) {
      return sendError(res, 400, "cardId invalido");
    }

    const result = await cardService.moveCard(cardId, listId, prevOrder, nextOrder);

    return res.json(result);
  } catch (err: any) {
    return sendError(res, err.status || 500, err.message || "Error moviendo tarjeta");
  }
};
