// src/app.ts
import express from "express";
import cors from "cors";
import cardRoutes from "./routes/card.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cardRoutes);

export default app;
