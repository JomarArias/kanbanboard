// src/index.ts
import { createServer } from "http";
import mongoose from "mongoose";
import "dotenv/config";
import { initSocketServer, setIO } from "./sockets/socket.server.js";

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("Mongo conectado"))
  .catch(console.error);

const app = await import("./app.js").then(m => m.default);
const httpServer = createServer(app);
const io = initSocketServer(httpServer);
setIO(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Servidor en ${PORT}`);
});
