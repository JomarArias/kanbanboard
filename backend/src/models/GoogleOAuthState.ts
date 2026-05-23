import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleOAuthState extends Document {
  userId: Types.ObjectId;
  stateHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleOAuthStateSchema = new Schema<IGoogleOAuthState>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stateHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Cleanup historical state records automatically after expiration.
GoogleOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const GoogleOAuthState = model<IGoogleOAuthState>(
  'GoogleOAuthState',
  GoogleOAuthStateSchema
);

