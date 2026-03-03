import { Server, Socket } from "socket.io";

export type ChatMessage = {
  id: string;
  username: string;
  text: string;
  timestamp: string;
};

// Historial en memoria — últimos 50 mensajes
const messageHistory: ChatMessage[] = [];
const MAX_HISTORY = 50;

export const registerChatSocketHandlers = (io: Server, socket: Socket) => {

  // Al conectar, enviamos el historial solo al cliente que se conectó
  socket.emit("chat:history", messageHistory);

  // Nuevo mensaje
  socket.on("chat:message", (payload: { username: string; text: string }) => {
    if (!payload?.username?.trim() || !payload?.text?.trim()) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      username: payload.username.trim(),
      text: payload.text.trim().slice(0, 500), // máximo 500 caracteres
      timestamp: new Date().toISOString()
    };

    messageHistory.push(message);
    if (messageHistory.length > MAX_HISTORY) {
      messageHistory.shift();
    }

    // Emitir a todos los clientes conectados (incluido el emisor)
    io.emit("chat:message", message);
  });

  // Notificar a todos que alguien se unió
  socket.on("chat:join", (payload: { username: string }) => {
    if (!payload?.username?.trim()) return;
    socket.broadcast.emit("chat:user:joined", { username: payload.username.trim() });
  });
};