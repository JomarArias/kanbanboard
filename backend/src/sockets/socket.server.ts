import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { registerCardSocketHandlers } from "./card.socket.js";

export const BOARD_ROOM = "board:default";

export const initSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:4200",
        "https://kanbanboard-frontend.vercel.app",
        "https://kanbanboard-beige-pi.vercel.app",
        process.env.FRONTEND_URL || ""
      ],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    registerCardSocketHandlers(io, socket);
  });

  return io;
};

let io: Server;

export const setIO = (server: Server) => {
  io = server;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

