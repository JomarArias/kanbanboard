import { Request, Response, NextFunction } from 'express';
import { Workspace, WorkspaceRole } from '../models/Workspace.js';
import { sendError } from '../utils/http-response.js';

export const requireWorkspaceAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = res.locals.user;
        if (!user) {
            sendError(res, 500, 'User not attached to request context');
            return;
        }

        const workspaceId = req.body?.workspaceId || req.query?.workspaceId || req.params?.workspaceId;

        if (!workspaceId) {
            sendError(res, 400, 'workspaceId is required for this operation');
            return;
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            sendError(res, 404, 'Workspace not found');
            return;
        }

        const isOwner = workspace.owners.some(ownerId => ownerId?.toString() === user._id.toString());
        const membership = workspace.members.find((m: any) => m.userId?.toString() === user._id.toString());

        if (!isOwner && !membership) {
            sendError(res, 403, 'You do not have permission to access this Workspace');
            return;
        }

        const myRole: WorkspaceRole = isOwner ? 'admin' : membership!.role;

        res.locals.workspace = workspace;
        res.locals.workspaceId = workspaceId.toString();
        res.locals.myRole = myRole;
        res.locals.isOwner = isOwner;

        next();
    } catch (error: any) {
        sendError(res, 500, 'Error verifying workspace access', error);
        return;
    }
};

// Blocks access for viewers (read-only role)
export const requireEditorOrAbove = (req: Request, res: Response, next: NextFunction): void => {
    const role: WorkspaceRole = res.locals.myRole;
    if (role === 'viewer') {
        sendError(res, 403, 'Viewers cannot perform write operations');
        return;
    }
    next();
};
