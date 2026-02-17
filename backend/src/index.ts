// src/index.ts
import { createServer } from "http";
import mongoose from "mongoose";
import "dotenv/config";
import app from "./app.js";
import { initSocketServer } from "./sockets/socket.server.js";

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("Mongo conectado"))
  .catch(console.error);

const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(3000, () => {
  console.log("Servidor en 3000");
});
