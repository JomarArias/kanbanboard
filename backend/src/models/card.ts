// src/models/Card.ts
import { Schema, model } from "mongoose";

const cardSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    task: {
      type: String,
      required: true,
      trim: true
    },
    listId: {
      type: String,
      required: true,
      index: true
    },
    order: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

cardSchema.index({ listId: 1, order: 1 });

export const Card = model("Card", cardSchema);
