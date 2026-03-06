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
const STATUS_CHECK_URL = "https://share.google/gs8ZCcUuoPJtawEFd";

httpServer.listen(PORT, () => {
  console.log(`Servidor en ${PORT}`);
  checkApiStatus(STATUS_CHECK_URL);
});

async function checkApiStatus(url: string) {
  try {
    const response = await fetch(url);
    const statusInfo = getCustomStatusMessage(response.status);
    console.log(`API status -> ${url}: ${response.status} ${response.statusText} | ${statusInfo}`);
  } catch (error: any) {
    console.error(`API estado fallido -> ${url}:`, error?.message || error);
  }
}

function getCustomStatusMessage(statusCode: number): string {
  const knownStatus: Record<number, string> = {
    100: "Continue (la peticion puede continuar)",
    101: "Switching Protocols (cambio de protocolo)",
    102: "Processing (procesando)",
    200: "OK (operacion exitosa)",
    201: "Created (recurso creado)",
    202: "Accepted (peticion aceptada)",
    204: "No Content (sin contenido)",
    301: "Moved Permanently (recurso movido permanentemente)",
    302: "Found (redireccion temporal)",
    304: "Not Modified (sin cambios)",
    400: "Bad Request (solicitud invalida)",
    401: "Unauthorized (no autenticado)",
    403: "Forbidden (sin permisos)",
    404: "Not Found (recurso no encontrado)",
    409: "Conflict (conflicto de datos)",
    422: "Unprocessable Content (validacion fallida)",
    429: "Too Many Requests (demasiadas solicitudes)",
    500: "Internal Server Error (error interno del servidor)",
  };

  if (knownStatus[statusCode]) return knownStatus[statusCode];
  if (statusCode >= 100 && statusCode < 200) return "Informational 1xx (respuesta informativa)";
  if (statusCode >= 200 && statusCode < 300) return "Success 2xx (operacion exitosa)";
  if (statusCode >= 300 && statusCode < 400) return "Redirection 3xx (requiere redireccion)";
  if (statusCode >= 400 && statusCode < 500) return "Client Error 4xx (error del cliente)";
  if (statusCode >= 500 && statusCode < 600) return "Server Error 5xx (error del servidor)";
  return "Codigo fuera del rango HTTP esperado";
}

