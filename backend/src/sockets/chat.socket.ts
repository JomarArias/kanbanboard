import { Server, Socket } from "socket.io";

export type ChatMessage = {
  id: string;
  username: string;
  text: string;
  timestamp: string;
};

// Historial en memoria por workspaceId — últimos 50 mensajes por workspace
const messageHistoryByWorkspace = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 50;

export const registerChatSocketHandlers = (io: Server, socket: Socket) => {

  // Emitir historial de un workspace específico
  socket.on("chat:get_history", (payload: { workspaceId: string }) => {
    if (!payload?.workspaceId) return;
    const history = messageHistoryByWorkspace.get(payload.workspaceId) || [];
    socket.emit("chat:history", history);
  });

  // Nuevo mensaje
  socket.on("chat:message", (payload: { username: string; text: string; workspaceId: string }) => {
    if (!payload?.username?.trim() || !payload?.text?.trim() || !payload?.workspaceId) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      username: payload.username.trim(),
      text: payload.text.trim().slice(0, 500),
      timestamp: new Date().toISOString()
    };

    let history = messageHistoryByWorkspace.get(payload.workspaceId);
    if (!history) {
      history = [];
      messageHistoryByWorkspace.set(payload.workspaceId, history);
    }

    history.push(message);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    // Emitir a todos los clientes conectados en el workspace (incluido el emisor)
    io.to(`workspace:${payload.workspaceId}`).emit("chat:message", message);
  });

  // Notificar a todos en el workspace que alguien se unió al chat
  socket.on("chat:join", (payload: { username: string; workspaceId: string }) => {
    if (!payload?.username?.trim() || !payload?.workspaceId) return;
    socket.to(`workspace:${payload.workspaceId}`).emit("chat:user:joined", { username: payload.username.trim() });
  });
};