// src/controllers/card.controller.ts
import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { sendError } from "../utils/http-response.js";
import * as cardService from "../services/card.service.js";
import { getIO, BOARD_ROOM } from "../sockets/socket.server.js";


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
    const { listId, title, task,  } = req.body ?? {};

    if (!listId || !title || !task) {
      return sendError(res, 400, "listId, title y task son requeridos");
    }

    const card = await cardService.createCard(listId, title, task);

    console.log(`[BACKEND] Card created: ${card.title} in ${card.listId}`);

    // Broadcast to room
    try {
      getIO().to(BOARD_ROOM).emit("card:created", card);
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
    const { id } = req.params;
    const { title, task, expectedVersion, dueDate, labels, style } = req.body ?? {};

    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
    // if (!title || !task) return sendError(res, 400, "title y task son requeridos");
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      return sendError(res, 400, "expectedVersion debe ser un entero mayor o igual a 0");
    }
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (task !== undefined)  updateData.task = task;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if ( labels !== undefined) updateData.labels = labels   
    if ( style !== undefined) updateData.style = style

    if(Object.keys(updateData).length === 0){
      return sendError(res, 400, "No hay campos para actualizar")
    }

    const card = await cardService.updateCard(id as string,  expectedVersion, updateData);

    // Broadcast to room
    try {
      getIO().to(BOARD_ROOM).emit("card:updated", card);
    } catch (e) {
      console.error("Socket error emitting card:updated", e);
    }

    return res.json(card);
  } catch (err: any) {
    if (err?.status === 409 && err?.currentCard) {
      return res.status(409).json({
        ok: false,
        message: err.message,
        reason: err.code || "conflict",
        currentCard: err.currentCard
      });
    }

    return sendError(res, err.status || 500, err.message || "Error al actualizar la tarjeta");
  }
};










export const deleteCard = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

    await cardService.deleteCard(id);

    // Broadcast to room
    try {
      getIO().to(BOARD_ROOM).emit("card:deleted", { _id: id });
    } catch (e) {
      console.error("Socket error emitting card:deleted", e);
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return sendError(res, err.status || 500, err.message || "Error eliminando tarjeta");
  }
};

export const moveCard = async (req: Request, res: Response) => {
  try {
    const { cardId, listId, prevOrder, nextOrder} = req.body ?? {};

    if (!cardId || !listId) {
      return sendError(res, 400, "cardId y listId son requeridos");
    }

    if (!isValidObjectId(cardId)) {
      return sendError(res, 400, "cardId invalido");
    }

    const result = await cardService.moveCard(cardId, listId, prevOrder, nextOrder);

    // Broadcast to room - NOTE: socket.server might already handle this via card:move:request if using pure sockets
    // But since we use HTTP for drag&drop, we must emit here too.
    // However, avoid double emit if the client reloads on 'card:moved'
    try {
      // We can reuse 'card:moved' event structure
      getIO().to(BOARD_ROOM).emit("card:moved", { cardId, listId, order: result.order });
    } catch (e) {
      console.error("Socket error emitting card:moved", e);
    }


    return res.json(result);
  } catch (err: any) {
    return sendError(res, err.status || 500, err.message || "Error moviendo tarjeta");
  }
};
