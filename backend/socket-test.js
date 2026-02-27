import { io } from "socket.io-client";
import { randomUUID } from "crypto";

const SERVER_URL = process.env.SOCKET_URL || "http://localhost:3000";
const cardId = process.env.CARD_ID;
const targetListId = process.env.TARGET_LIST_ID || "inProgress";
const beforeCardId = process.env.BEFORE_CARD_ID || null;
const afterCardId = process.env.AFTER_CARD_ID || null;
const expectedVersion = Number(process.env.EXPECTED_VERSION);
const operationId = process.env.OPERATION_ID || randomUUID();
const strictMode = process.env.SOCKET_TEST_STRICT === "1";

if (!cardId) {
  console.error("Falta CARD_ID");
  process.exit(1);
}

if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
  console.error("Falta EXPECTED_VERSION valido (entero >= 0)");
  process.exit(1);
}

const socket = io(SERVER_URL, {
  // transports: ["websocket"],
  timeout: 8000
});

const payload = {
  operationId,
  cardId,
  targetListId,
  beforeCardId,
  afterCardId,
  expectedVersion
};

const close = (code = 0) => {
  socket.disconnect();
  process.exit(code);
};

socket.on("connect", () => {
  console.log("[socket] connected:", socket.id);
  console.log("[socket] sending card:move:request", payload);
  socket.emit("card:move:request", payload);
});

socket.on("card:move:accepted", (data) => {
  console.log("[socket] card:move:accepted", data);
  close(0);
});

socket.on("card:move:rejected", (data) => {
  console.log("[socket] card:move:rejected", data);
  if (strictMode) {
    close(2);
    return;
  }
  close(0);
});

socket.on("card:moved", (data) => {
  console.log("[socket] card:moved (broadcast)", data);
});

socket.on("connect_error", (err) => {
  console.error("[socket] connect_error:", err.message);
  close(3);
});

setTimeout(() => {
  console.error("[socket] timeout waiting response");
  close(4);
}, 10000);
