import mongoose, { Schema, Document } from 'mongoose';

export interface IInvitation extends Document {
    token: string;
    workspaceId: mongoose.Types.ObjectId;
    role: 'admin' | 'editor' | 'viewer';
    email: string | null;
    expiresAt: Date;
    used: boolean;
}

const InvitationSchema = new Schema<IInvitation>({
    token: { type: String, required: true, unique: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'editor' },
    email: { type: String, default: null }, // If null, ANYONE with the link can use it
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Auto-delete expired invitations after expiration
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);
