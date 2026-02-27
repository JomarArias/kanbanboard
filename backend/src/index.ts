// src/index.ts
import { createServer } from "http";
import mongoose from "mongoose";
import "dotenv/config";
import { initSocketServer, setIO } from "./sockets/socket.server.js";
import { migrateWorkspaces } from "./utils/migrateWorkspaces.js";

// ─── Global error handlers (evita crashes por errores no capturados) ──────────
process.on("uncaughtException", (err) => {
  console.error("⚠️  uncaughtException:", err.message, err.stack);
  // No hacemos process.exit — el servidor sigue corriendo
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️  unhandledRejection:", reason);
});
// ─────────────────────────────────────────────────────────────────────────────

mongoose.connect(process.env.MONGO_URI!)
  .then(async () => {
    console.log("Mongo conectado");
    await migrateWorkspaces();
  })
  .catch(console.error);

let app;
try {
  app = await import("./app.js").then(m => m.default);
} catch (error: any) {
  console.error("========================");
  console.error("Error cargando app.js:");
  console.error(error.message || error);
  console.error(error.stack);
  console.error("========================");
  process.exit(1);
}

const httpServer = createServer(app);
const io = initSocketServer(httpServer);
setIO(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Servidor en ${PORT}`);
});

