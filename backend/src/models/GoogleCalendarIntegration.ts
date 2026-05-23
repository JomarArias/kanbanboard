import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleCalendarIntegration extends Document {
  userId: Types.ObjectId;
  googleEmail?: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiresAt: Date;
  scope: string;
  tokenType: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleCalendarIntegrationSchema = new Schema<IGoogleCalendarIntegration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    googleEmail: {
      type: String,
      default: null,
      trim: true,
    },
    accessTokenEncrypted: {
      type: String,
      required: true,
    },
    refreshTokenEncrypted: {
      type: String,
      required: true,
    },
    accessTokenExpiresAt: {
      type: Date,
      required: true,
    },
    scope: {
      type: String,
      required: true,
    },
    tokenType: {
      type: String,
      required: true,
      default: 'Bearer',
    },
  },
  { timestamps: true }
);

export const GoogleCalendarIntegration = model<IGoogleCalendarIntegration>(
  'GoogleCalendarIntegration',
  GoogleCalendarIntegrationSchema
);
