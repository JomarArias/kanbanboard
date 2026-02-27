import { Schema, model, Document, Types } from 'mongoose';

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface IWorkspaceMember {
    userId: Types.ObjectId;
    role: WorkspaceRole;
}

export interface IWorkspace extends Document {
    name: string;
    owners: Types.ObjectId[];
    members: IWorkspaceMember[];
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'editor', 'viewer'],
        default: 'editor'
    }
}, { _id: false });

const workspaceSchema = new Schema<IWorkspace>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    owners: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    members: [workspaceMemberSchema]
}, {
    timestamps: true
});

export const Workspace = model<IWorkspace>('Workspace', workspaceSchema);
