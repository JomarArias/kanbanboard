import { Server, Socket } from "socket.io";
import { isValidObjectId } from "mongoose";
import { moveCardRealtime } from "../services/card.service.js";
import { User } from "../models/User.js";

const processedOperations = new Map<string, unknown>();
const MAX_OPERATION_CACHE = 1000;

// ── Presence Map ─────────────────────────────────────────────
// workspacePresence[workspaceId][socketId] = { username, userId }
const workspacePresence = new Map<string, Map<string, { username: string; userId: string | null }>>();

function getPresenceList(workspaceId: string): { username: string; userId: string | null }[] {
  const room = workspacePresence.get(workspaceId);
  return room ? Array.from(room.values()) : [];
}

function addPresence(workspaceId: string, socketId: string, username: string, userId: string | null) {
  if (!workspacePresence.has(workspaceId)) {
    workspacePresence.set(workspaceId, new Map());
  }
  workspacePresence.get(workspaceId)!.set(socketId, { username, userId });
}

function removePresence(workspaceId: string, socketId: string) {
  const room = workspacePresence.get(workspaceId);
  if (room) {
    room.delete(socketId);
    if (room.size === 0) workspacePresence.delete(workspaceId);
  }
}

type MoveRequestPayload = {
  operationId: string;
  cardId: string;
  targetListId: string;
  beforeCardId?: string | null;
  afterCardId?: string | null;
  expectedVersion: number;
  workspaceId: string;
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

  const userEditingCards = new Set<string>();
  let currentWorkspaceId: string | null = null;
  let currentUsername: string | null = null;
  let currentUserId: string | null = null;

  socket.on("workspace:join", async ({ workspaceId, username, userId }: { workspaceId: string, username: string, userId?: string }) => {
    // ── Leave previous workspace ──────────────────────────────
    if (currentWorkspaceId) {
      const prevRoom = `workspace:${currentWorkspaceId}`;
      socket.leave(prevRoom);

      // Remove from presence before emitting
      removePresence(currentWorkspaceId, socket.id);

      // Notify peers in old room with updated list
      io.to(prevRoom).emit("workspace:users", {
        workspaceId: currentWorkspaceId,
        users: getPresenceList(currentWorkspaceId)
      });
    }

    // ── Join new workspace ────────────────────────────────────
    const roomName = `workspace:${workspaceId}`;
    socket.join(roomName);

    currentWorkspaceId = workspaceId;
    currentUsername = username;
    currentUserId = userId || null;

    // Update presence map
    addPresence(workspaceId, socket.id, username, currentUserId);

    // Mark user as active in DB
    if (userId && isValidObjectId(userId)) {
      try {
        await User.findByIdAndUpdate(userId, { status: 'active' });
      } catch (_) { }
    }

    // Broadcast authoritative user list to ALL in room (including the joiner)
    io.to(roomName).emit("workspace:users", {
      workspaceId,
      users: getPresenceList(workspaceId)
    });

    // Toast notification to peers only
    socket.to(roomName).emit("user:joined", { username, userId, workspaceId });
  });

  socket.on("disconnect", async () => {
    if (currentWorkspaceId && currentUsername) {
      const roomName = `workspace:${currentWorkspaceId}`;

      // Remove from presence
      removePresence(currentWorkspaceId, socket.id);

      // Broadcast updated list to remaining peers
      io.to(roomName).emit("workspace:users", {
        workspaceId: currentWorkspaceId,
        users: getPresenceList(currentWorkspaceId)
      });

      // Toast notification to peers
      socket.broadcast.to(roomName).emit("user:left", {
        username: currentUsername,
        userId: currentUserId,
        workspaceId: currentWorkspaceId
      });

      // Mark user as offline in DB
      if (currentUserId && isValidObjectId(currentUserId)) {
        try {
          await User.findByIdAndUpdate(currentUserId, { status: 'offline' });
        } catch (_) { }
      }

      // Cleanup editing state
      userEditingCards.forEach(cardId => {
        socket.broadcast.to(roomName).emit("card:editing:stopped", { cardId, workspaceId: currentWorkspaceId });
      });
      userEditingCards.clear();
    }
  });

  socket.on("card:move:request", async (payload: MoveRequestPayload) => {
    try {
      if (!payload?.operationId) {
        socket.emit("card:move:rejected", { reason: "validation", message: "operationId es requerido" });
        return;
      }

      const cachedResult = processedOperations.get(payload.operationId);
      if (cachedResult) {
        socket.emit("card:move:accepted", cachedResult);
        return;
      }

      const { operationId, cardId, targetListId, beforeCardId = null, afterCardId = null, expectedVersion, workspaceId } = payload;

      if (!isValidObjectId(cardId)) {
        socket.emit("card:move:rejected", { operationId, reason: "validation", message: "cardId invalido" });
        return;
      }
      if (!targetListId) {
        socket.emit("card:move:rejected", { operationId, reason: "validation", message: "targetListId es requerido" });
        return;
      }
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
        socket.emit("card:move:rejected", { operationId, reason: "validation", message: "expectedVersion debe ser un entero >= 0" });
        return;
      }
      if (!isValidNeighborId(beforeCardId) || !isValidNeighborId(afterCardId)) {
        socket.emit("card:move:rejected", { operationId, reason: "validation", message: "beforeCardId/afterCardId invalidos" });
        return;
      }
      if (!workspaceId) {
        socket.emit("card:move:rejected", { operationId, reason: "validation", message: "workspaceId is required" });
        return;
      }

      const result = await moveCardRealtime({ cardId, targetListId, beforeCardId, afterCardId, expectedVersion } as any);

      const acceptedPayload = { operationId, ...result };
      cacheOperation(operationId, acceptedPayload);

      socket.emit("card:move:accepted", acceptedPayload);
      io.to(`workspace:${workspaceId}`).emit("card:moved", acceptedPayload);
    } catch (error: any) {
      socket.emit("card:move:rejected", {
        operationId: payload?.operationId,
        reason: error?.code || "internal_error",
        message: error?.message || "Error moviendo tarjeta",
        currentCard: error?.currentCard
      });
    }
  });

  socket.on("card:editing:start", (payload: { cardId: string; username: string; workspaceId: string }) => {
    if (payload.workspaceId) {
      userEditingCards.add(payload.cardId);
      socket.to(`workspace:${payload.workspaceId}`).emit("card:editing:started", payload);
    }
  });

  socket.on("card:editing:stop", (payload: { cardId: string; workspaceId: string }) => {
    if (payload.workspaceId) {
      userEditingCards.delete(payload.cardId);
      socket.to(`workspace:${payload.workspaceId}`).emit("card:editing:stopped", payload);
    }
  });
};
