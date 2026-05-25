import { Schema, model, Document, Types } from 'mongoose';

export type MeetingRequestStatus = 'pending' | 'cancelled';
export type MeetingRequestSyncStatus = 'pending' | 'synced' | 'failed';

export interface IMeetingRequest extends Document {
  createdBy: Types.ObjectId;
  cardId?: Types.ObjectId | null;
  prospectName: string;
  prospectEmail?: string | null;
  prospectPhone?: string | null;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
  status: MeetingRequestStatus;
  googleEventId?: string | null;
  googleEventHtmlLink?: string | null;
  syncStatus: MeetingRequestSyncStatus;
  syncError?: string | null;
  syncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingRequestSchema = new Schema<IMeetingRequest>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      default: null,
      index: true,
    },
    prospectName: {
      type: String,
      required: true,
      trim: true,
    },
    prospectEmail: {
      type: String,
      default: null,
      trim: true,
    },
    prospectPhone: {
      type: String,
      default: null,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'cancelled'],
      default: 'pending',
      index: true,
    },
    googleEventId: {
      type: String,
      default: null,
      trim: true,
    },
    googleEventHtmlLink: {
      type: String,
      default: null,
      trim: true,
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending',
      index: true,
    },
    syncError: {
      type: String,
      default: null,
      trim: true,
    },
    syncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

MeetingRequestSchema.index({ createdBy: 1, createdAt: -1 });

export const MeetingRequest = model<IMeetingRequest>('MeetingRequest', MeetingRequestSchema);
