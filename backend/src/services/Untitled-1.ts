// // src/controllers/card.controller.ts
// import { Request, Response } from "express";
// import { LexoRank } from "lexorank";
// import { isValidObjectId } from "mongoose";
// import { AuditLog, AuditLogAction } from "../models/audit-log.js";
// import { Card } from "../models/card.js";
// import { sendError } from "../utils/http-response.js";
// import { saveAuditLog } from "../services/audit.service.js";


// export const listCardsByList = async (req: Request, res: Response) => {
//   try {
//     const { listId } = req.params;
//     if (!listId) return sendError(res, 400, "listId es requerido");

//     const cards = await Card.find({ listId }).sort({ order: 1, _id: 1 });
//     return res.json(cards);
//   } catch (err) {
//     return sendError(res, 500, "Error listando tarjetas", err);
//   }
// };

// export const createCard = async (req: Request, res: Response) => {
//   try {
//     const { listId, title, task } = req.body ?? {};
//     if (!listId || !title || !task) {
//       return sendError(res, 400, "listId, title y task son requeridos");
//     }

//     const lastCard = await Card.findOne({ listId }).sort({ order: -1 });
//     const order = lastCard
//       ? LexoRank.parse(lastCard.order).genNext().toString()
//       : LexoRank.middle().toString();

//     const card = await Card.create({ listId, title, task, order });
//     console.log(`[BACKEND] Card created: ${card.title} in ${card.listId}`);
//     await saveAuditLog("CREATE", `Tarjeta "${card.title}" creada en lista ${card.listId}`);
//     return res.status(201).json(card);
//   } catch (err) {
//     return sendError(res, 500, "Error creando tarjeta", err);
//   }
// };

// export const updateCard = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { title, task } = req.body;

//     if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");
//     if (!title || !task) return sendError(res, 400, "title y task son requeridos");

//     const card = await Card.findByIdAndUpdate(
//       id,
//       { title, task },
//       { new: true }
//     );
//     console.log(`[BACKEND] Card updated: ${card?.title}`);

//     if (!card) return sendError(res, 404, "Tarjeta no encontrada");
//     await saveAuditLog("UPDATE", `Tarjeta "${card.title}" actualizada`);
//     return res.json(card);
//   } catch (err) {
//     return sendError(res, 500, "Error actualizando tarjeta", err);
//   }
// };

// export const deleteCard = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) return sendError(res, 400, "id invalido");

//     const card = await Card.findByIdAndDelete(id);
//     if (!card) return sendError(res, 404, "Tarjeta no encontrada");
//     console.log(`[BACKEND] Card deleted: ${card.title}`);

//     await saveAuditLog("DELETE", `Tarjeta "${card.title}" eliminada de lista ${card.listId}`);
//     return res.json({ ok: true });
//   } catch (err) {
//     return sendError(res, 500, "Error eliminando tarjeta", err);
//   }
// };

// export const moveCard = async (req: Request, res: Response) => {
//   try {
//     const { cardId, listId, prevOrder, nextOrder } = req.body ?? {};

//     if (!cardId || !listId) {
//       return sendError(res, 400, "cardId y listId son requeridos");
//     }

//     if (!isValidObjectId(cardId)) return sendError(res, 400, "cardId invalido");

//     const cardBeforeMove = await Card.findById(cardId);
//     if (!cardBeforeMove) return sendError(res, 404, "Tarjeta no encontrada");
// // !------------------------------------------
//     let order: string;

//     if (!prevOrder && !nextOrder) {
//       const destinationHasCards = await Card.exists({
//         listId,
//         _id: { $ne: cardId }
//       });

//       if (destinationHasCards) {
//         return sendError(
//           res,
//           400,
//           "prevOrder y nextOrder son requeridos cuando la lista destino no esta vacia"
//         );
//       }

//       order = LexoRank.middle().toString();
//     } else if (!prevOrder) {
//       order = LexoRank.parse(nextOrder).genPrev().toString();
//     } else if (!nextOrder) {
//       order = LexoRank.parse(prevOrder).genNext().toString();
//     } else {
//       order = LexoRank
//         .parse(prevOrder)
//         .between(LexoRank.parse(nextOrder))
//         .toString();
//     }

//     const card = await Card.findByIdAndUpdate(
//       cardId,
//       { listId, order },
//       { new: true }
//     );
//     console.log(`[BACKEND] Card moved: ${card?.title} to ${listId}`);

//     if (!card) return sendError(res, 404, "Tarjeta no encontrada");
//     await saveAuditLog("MOVE", `Tarjeta "${cardBeforeMove.title}" movida a ${listId}`);

//     return res.json({ ok: true, order });
//   } catch (err) {
//     return sendError(res, 500, "Error moviendo tarjeta", err);
//   }
// };
