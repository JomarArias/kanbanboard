// src/controllers/card.controller.ts
import { Request, Response } from "express";
import { LexoRank } from "lexorank";
import { isValidObjectId } from "mongoose";
import { Card } from "../models/card.js";

const sendError = (res: Response, status: number, message: string, details?: unknown) => {
  if (details) console.error(details);
  return res.status(status).json({ ok: false, message });
};

export const listCardsByList = async (req: Request, res: Response) => {
  try {
    const { listId } = req.params;
    if (!listId) return sendError(res, 400, "listId es requerido");

    const cards = await Card.find({ listId }).sort({ order: 1 });
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

    const lastCard = await Card.findOne({ listId }).sort({ order: -1 });
    const order = lastCard
      ? LexoRank.parse(lastCard.order).genNext().toString()
      : LexoRank.middle().toString();

    const card = await Card.create({ listId, title, task, order });
    return res.status(201).json(card);
  } catch (err) {
    return sendError(res, 500, "Error creando tarjeta", err);
  }
};

export const updateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, task } = req.body;

    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
    if (!title || !task) return sendError(res, 400, "title y task son requeridos");

    const card = await Card.findByIdAndUpdate(
      id,
      { title, task },
      { new: true }
    );

    if (!card) return sendError(res, 404, "Tarjeta no encontrada");
    return res.json(card);
  } catch (err) {
    return sendError(res, 500, "Error actualizando tarjeta", err);
  }
};

export const deleteCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

    const card = await Card.findByIdAndDelete(id);
    if (!card) return sendError(res, 404, "Tarjeta no encontrada");

    return res.json({ ok: true });
  } catch (err) {
    return sendError(res, 500, "Error eliminando tarjeta", err);
  }
};

export const moveCard = async (req: Request, res: Response) => {
  try {
    const { cardId, listId, prevOrder, nextOrder } = req.body ?? {};

    if (!cardId || !listId) {
      return sendError(res, 400, "cardId y listId son requeridos");
    }

    if (!isValidObjectId(cardId)) return sendError(res, 400, "cardId invalido");

    let order: string;

    if (!prevOrder && !nextOrder) {
      order = LexoRank.middle().toString();
    } else if (!prevOrder) {
      order = LexoRank.parse(nextOrder).genPrev().toString();
    } else if (!nextOrder) {
      order = LexoRank.parse(prevOrder).genNext().toString();
    } else {
      order = LexoRank
        .parse(prevOrder)
        .between(LexoRank.parse(nextOrder))
        .toString();
    }

    const card = await Card.findByIdAndUpdate(
      cardId,
      { listId, order },
      { new: true }
    );

    if (!card) return sendError(res, 404, "Tarjeta no encontrada");

    return res.json({ ok: true, order });
  } catch (err) {
    return sendError(res, 500, "Error moviendo tarjeta", err);
  }
};
