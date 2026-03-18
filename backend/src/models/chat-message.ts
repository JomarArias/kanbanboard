import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
    workspaceId: mongoose.Types.ObjectId;
    username: string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

const chatMessageSchema = new Schema(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
        username: { type: String, required: true },
        text: { type: String, required: true },
    },
    { timestamps: true }
);

export const ChatMessageModel = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
