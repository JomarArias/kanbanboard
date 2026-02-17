import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { registerCardSocketHandlers } from "./card.socket.js";

export const BOARD_ROOM = "board:default";

export const initSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*"
    }
  });

  io.on("connection", (socket) => {
    registerCardSocketHandlers(io, socket);
  });

  return io;
};

