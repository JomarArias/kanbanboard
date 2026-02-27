import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
    firebaseUid: string;
    email: string;
    name: string;
    picture: string;
    role: 'admin' | 'member';
    status: 'active' | 'offline';
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        picture: {
            type: String,
            default: '',
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member',
        },
        status: {
            type: String,
            enum: ['active', 'offline'],
            default: 'offline',
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const User = model<IUser>('User', UserSchema);
