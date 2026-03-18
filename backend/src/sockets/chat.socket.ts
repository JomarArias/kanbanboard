import { Server, Socket } from "socket.io";
import { ChatMessageModel } from "../models/chat-message.js";

export type ChatMessage = {
  id: string;
  username: string;
  text: string;
  timestamp: string;
};

const MAX_HISTORY = 50;

export const registerChatSocketHandlers = (io: Server, socket: Socket) => {

  // Emitir historial de un workspace específico
  socket.on("chat:get_history", async (payload: { workspaceId: string }) => {
    if (!payload?.workspaceId) return;
    try {
      const messagesDb = await ChatMessageModel.find({ workspaceId: payload.workspaceId })
        .sort({ createdAt: -1 })
        .limit(MAX_HISTORY)
        .lean();

      const history: ChatMessage[] = messagesDb.reverse().map(m => ({
        id: (m._id as any).toString(),
        username: m.username,
        text: m.text,
        timestamp: m.createdAt.toISOString()
      }));

      socket.emit("chat:history", history);
    } catch (e) {
      console.error("Error fetching chat history", e);
    }
  });

  // Nuevo mensaje
  socket.on("chat:message", async (payload: { username: string; text: string; workspaceId: string }) => {
    if (!payload?.username?.trim() || !payload?.text?.trim() || !payload?.workspaceId) return;

    try {
      const text = payload.text.trim().slice(0, 500);
      const username = payload.username.trim();

      const newMessage = await ChatMessageModel.create({
        workspaceId: payload.workspaceId,
        username,
        text
      });

      const message: ChatMessage = {
        id: newMessage._id.toString(),
        username: newMessage.username,
        text: newMessage.text,
        timestamp: newMessage.createdAt.toISOString()
      };

      // Emitir a todos los clientes conectados en el workspace (incluido el emisor)
      io.to(`workspace:${payload.workspaceId}`).emit("chat:message", message);
    } catch (e) {
      console.error("Error creating chat message", e);
    }
  });

  // Notificar a todos en el workspace que alguien se unió al chat
  socket.on("chat:join", (payload: { username: string; workspaceId: string }) => {
    if (!payload?.username?.trim() || !payload?.workspaceId) return;
    socket.to(`workspace:${payload.workspaceId}`).emit("chat:user:joined", { username: payload.username.trim() });
  });
};