// src/index.ts
import mongoose from "mongoose";
import "dotenv/config";
import app from "./app.js";

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log("Mongo conectado"))
  .catch(console.error);

app.listen(3000, () => {
  console.log("Servidor en 3000");
});
