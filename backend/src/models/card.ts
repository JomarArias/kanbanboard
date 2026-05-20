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
      required: true
    },
    version: {
      type: Number,
      required: true,
      default: 0
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace'
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    prospectName: {
      type: String,
      default: null,
      trim: true
    },
    prospectEmail: {
      type: String,
      default: null,
      trim: true
    },
    prospectPhone: {
      type: String,
      default: null,
      trim: true
    },
    calendarEventId: {
      type: String,
      default: null,
      trim: true
    },
    lastReminderSentAt: {
      type: Date,
      default: null
    },
    // ── ARCHIVADO ────────────────────────────────────────────────────────────────
    archived: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    dueDate: {
      type: Date,
      default: null,
      index: true
    },
    labels: {
      type: [{
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        color: { type: String, required: true },
      }],
      default: []
    },
    style: {
      backgroundType: {
        type: String, enum: ["default", "color", "image"], default: "default"
      },
      backgroundColor: {
        type: String,
        default: null
      },
      backgroundImageUrl: {
        type: String,
        default: null
      }
    }
    // ────────────────────────────────────────────────────────────────────────
  },

  { timestamps: true },


);

cardSchema.index({ listId: 1, order: 1 });

export const Card = model("Card", cardSchema);
