import { Server, Socket } from "socket.io";
import { isValidObjectId } from "mongoose";
import { moveCardRealtime } from "../services/card.service.js";

const BOARD_ROOM = "board:default";
const processedOperations = new Map<string, unknown>();
const MAX_OPERATION_CACHE = 1000;

type MoveRequestPayload = {
  operationId: string;
  cardId: string;
  targetListId: string;
  beforeCardId?: string | null;
  afterCardId?: string | null;
  expectedVersion: number;
};

const cacheOperation = (operationId: string, payload: unknown) => {
  processedOperations.set(operationId, payload);
  if (processedOperations.size > MAX_OPERATION_CACHE) {
    const firstKey = processedOperations.keys().next().value as string | undefined;
    if (firstKey) processedOperations.delete(firstKey);
  }
};

const isValidNeighborId = (id?: string | null) => !id || isValidObjectId(id);

export const registerCardSocketHandlers = (io: Server, socket: Socket) => {
  socket.join(BOARD_ROOM);

  socket.on("card:move:request", async (payload: MoveRequestPayload) => {
    try {
      if (!payload?.operationId) {
        socket.emit("card:move:rejected", {
          reason: "validation",
          message: "operationId es requerido"
        });
        return;
      }

      const cachedResult = processedOperations.get(payload.operationId);
      if (cachedResult) {
        socket.emit("card:move:accepted", cachedResult);
        return;
      }

      const {
        operationId,
        cardId,
        targetListId,
        beforeCardId = null,
        afterCardId = null,
        expectedVersion
      } = payload;

      if (!isValidObjectId(cardId)) {
        socket.emit("card:move:rejected", {
          operationId,
          reason: "validation",
          message: "cardId invalido"
        });
        return;
      }

      if (!targetListId) {
        socket.emit("card:move:rejected", {
          operationId,
          reason: "validation",
          message: "targetListId es requerido"
        });
        return;
      }

      if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
        socket.emit("card:move:rejected", {
          operationId,
          reason: "validation",
          message: "expectedVersion debe ser un entero mayor o igual a 0"
        });
        return;
      }

      if (!isValidNeighborId(beforeCardId) || !isValidNeighborId(afterCardId)) {
        socket.emit("card:move:rejected", {
          operationId,
          reason: "validation",
          message: "beforeCardId/afterCardId invalidos"
        });
        return;
      }

      const result = await moveCardRealtime({
        cardId,
        targetListId,
        beforeCardId,
        afterCardId,
        expectedVersion
      });

      const acceptedPayload = {
        operationId,
        ...result
      };

      cacheOperation(operationId, acceptedPayload);

      socket.emit("card:move:accepted", acceptedPayload);
      io.to(BOARD_ROOM).emit("card:moved", acceptedPayload);
    } catch (error: any) {
      socket.emit("card:move:rejected", {
        operationId: payload?.operationId,
        reason: error?.code || "internal_error",
        message: error?.message || "Error moviendo tarjeta",
        currentCard: error?.currentCard
      });
    }
  });

  socket.on("card:editing:start", (payload: { cardId: string; username: string }) => {
    socket.to(BOARD_ROOM).emit("card:editing:started", payload);
  });

  socket.on("card:editing:stop", (payload: { cardId: string }) => {
    socket.to(BOARD_ROOM).emit("card:editing:stopped", payload);
  });
};
