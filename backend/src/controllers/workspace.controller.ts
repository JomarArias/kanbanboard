import { Request, Response } from 'express';
import { Workspace, WorkspaceRole } from '../models/Workspace.js';
import { User } from '../models/User.js';
import { sendError } from '../utils/http-response.js';

export const getMyWorkspaces = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;

        // Find workspaces where user is owner OR a member (new schema)
        const workspaces = await Workspace.find({
            $or: [
                { owners: user._id },
                { 'members.userId': user._id }
            ]
        }).populate('owners', 'name email picture')
            .lean();

        // Populate member user objects + include member roles
        // Guard against legacy documents where members may be plain ObjectIds
        const populatedWorkspaces = await Promise.all(workspaces.map(async (w) => {
            // Filter out any legacy members that don't have userId
            const validMembers = (w.members as any[]).filter(m => m && m.userId);

            const memberIds = validMembers.map((m: any) => m.userId);
            const memberUsers = memberIds.length
                ? await User.find({ _id: { $in: memberIds } }).select('name email picture isDeleted').lean()
                : [];

            const membersWithRoles = validMembers.map((m: any) => {
                const userObj = memberUsers.find((u: any) =>
                    u._id?.toString() === m.userId?.toString()
                );
                return { ...userObj, role: m.role || 'editor' };
            });

            const isOwner = (w.owners as any[]).some((o: any) =>
                (o._id ?? o)?.toString() === user._id.toString()
            );
            const myMembership = validMembers.find((m: any) =>
                m.userId?.toString() === user._id.toString()
            );
            const myRole: string = isOwner ? 'admin' : (myMembership?.role || 'viewer');

            return {
                ...w,
                members: membersWithRoles,
                isOwner,
                myRole
            };
        }));

        return res.json(populatedWorkspaces);
    } catch (error: any) {
        return sendError(res, 500, 'Error fetching workspaces', error);
    }
};

export const createWorkspace = async (req: Request, res: Response) => {
    try {
        const user = res.locals.user;
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return sendError(res, 400, 'Workspace name is required');
        }

        const workspace = await Workspace.create({
            name,
            owners: [user._id],
            members: []
        });

        return res.status(201).json({ ...workspace.toObject(), isOwner: true, myRole: 'admin' });
    } catch (error: any) {
        return sendError(res, 500, 'Error creating workspace', error);
    }
};

export const getWorkspaceMembers = async (req: Request, res: Response) => {
    try {
        const workspace = await Workspace.findById(res.locals.workspaceId)
            .populate('owners', 'name email picture isDeleted')
            .lean();

        if (!workspace) {
            return sendError(res, 404, 'Workspace not found');
        }

        // Build owners list with admin role
        const ownersWithRole = (workspace.owners as any[]).map((o: any) => ({
            ...o,
            role: 'admin' as WorkspaceRole,
            isOwner: true
        }));

        // Populate member users
        const memberIds = workspace.members.map((m: any) => m.userId);
        const memberUsers = await User.find({ _id: { $in: memberIds } }).select('name email picture isDeleted').lean();

        const membersWithRoles = workspace.members.map((m: any) => {
            const userObj = memberUsers.find((u: any) => u._id.toString() === m.userId.toString());
            return { ...userObj, role: m.role, isOwner: false };
        });

        // Merge, deduplicate owners who are also in members list
        const ownerIds = new Set(ownersWithRole.map((o: any) => o._id.toString()));
        const uniqueMembers = membersWithRoles.filter((m: any) => !ownerIds.has(m._id?.toString()));

        return res.json([...ownersWithRole, ...uniqueMembers]);
    } catch (error: any) {
        return sendError(res, 500, 'Error fetching members', error);
    }
};

export const inviteMember = async (req: Request, res: Response) => {
    try {
        const { email, role = 'editor' } = req.body;
        const currentUser = res.locals.user;
        const workspace = res.locals.workspace;

        if (!email) return sendError(res, 400, 'Email is required');

        const isOwner = workspace.owners.some((ownerId: any) => ownerId.toString() === currentUser._id.toString());
        if (!isOwner) return sendError(res, 403, 'Only Workspace owners can invite members');

        if (!['admin', 'editor', 'viewer'].includes(role)) {
            return sendError(res, 400, 'Role must be admin, editor, or viewer');
        }

        let userToInvite = await User.findOne({ email });

        if (!userToInvite) {
            userToInvite = new User({
                auth0Id: `pending_${Date.now()}_${Math.random()}`,
                email,
                name: email.split('@')[0],
                picture: ''
            });
            await userToInvite.save();
        }

        const isAlreadyMember = workspace.members.some((m: any) => m.userId.toString() === userToInvite!._id.toString()) ||
            workspace.owners.some((ownerId: any) => ownerId.toString() === userToInvite!._id.toString());

        if (isAlreadyMember) {
            return res.status(400).json({ message: 'User is already a member of this workspace' });
        }

        workspace.members.push({ userId: userToInvite._id, role });
        await workspace.save();

        return res.json({ message: 'User invited successfully', user: userToInvite });
    } catch (error: any) {
        return sendError(res, 500, 'Error inviting member', error);
    }
};

export const updateMemberRole = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const currentUser = res.locals.user;
        const workspace = res.locals.workspace;

        if (!['editor', 'viewer'].includes(role)) {
            return sendError(res, 400, 'Role for members must be editor or viewer');
        }

        const isOwner = workspace.owners.some((ownerId: any) => ownerId.toString() === currentUser._id.toString());
        if (!isOwner) return sendError(res, 403, 'Only owners can change member roles');

        const member = workspace.members.find((m: any) => m.userId.toString() === userId);
        if (!member) return sendError(res, 404, 'Member not found in this workspace');

        member.role = role;
        await workspace.save();

        return res.json({ message: 'Role updated', userId, role });
    } catch (error: any) {
        return sendError(res, 500, 'Error updating member role', error);
    }
};

export const removeMember = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const currentUser = res.locals.user;
        const workspace = res.locals.workspace;

        const isOwner = workspace.owners.some((ownerId: any) => ownerId.toString() === currentUser._id.toString());
        if (!isOwner) return sendError(res, 403, 'Only owners can remove members');

        workspace.members = workspace.members.filter((m: any) => m.userId.toString() !== userId);
        await workspace.save();

        return res.json({ message: 'Member removed' });
    } catch (error: any) {
        return sendError(res, 500, 'Error removing member', error);
    }
};

// ─── Admin-only board/workspace management ───────────────────────────────────

export const adminCreateWorkspace = async (req: Request, res: Response) => {
    try {
        const { name, ownerUserId } = req.body;
        if (!name?.trim()) return sendError(res, 400, 'Workspace name is required');

        let ownerIds: any[] = [];
        if (ownerUserId) {
            const owner = await User.findById(ownerUserId);
            if (!owner) return sendError(res, 404, 'Owner user not found');
            ownerIds = [owner._id];
        } else {
            ownerIds = [res.locals.user._id]; // fallback to requesting admin
        }

        const workspace = await Workspace.create({
            name: name.trim(),
            owners: ownerIds,
            members: []
        });

        const populated = await Workspace.findById(workspace._id)
            .populate('owners', 'name email picture');

        return res.status(201).json(populated);
    } catch (error: any) {
        return sendError(res, 500, 'Error creating workspace', error);
    }
};

export const adminListWorkspaces = async (req: Request, res: Response) => {
    try {
        const workspaces = await Workspace.find({})
            .populate('owners', 'name email picture')
            .lean();

        const result = await Promise.all(workspaces.map(async (w: any) => {
            const memberIds = w.members.map((m: any) => m.userId);
            const memberUsers = await User.find({ _id: { $in: memberIds } })
                .select('name email picture').lean();
            const membersWithRoles = w.members.map((m: any) => {
                const u = memberUsers.find((u: any) => u._id.toString() === m.userId.toString());
                return { ...u, role: m.role };
            });
            return { ...w, members: membersWithRoles };
        }));

        return res.json(result);
    } catch (error: any) {
        return sendError(res, 500, 'Error fetching workspaces', error);
    }
};

export const adminUpdateWorkspace = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name?.trim()) return sendError(res, 400, 'Name is required');

        const workspace = await Workspace.findByIdAndUpdate(
            id, { name: name.trim() }, { new: true }
        ).populate('owners', 'name email picture');

        if (!workspace) return sendError(res, 404, 'Workspace not found');
        return res.json(workspace);
    } catch (error: any) {
        return sendError(res, 500, 'Error updating workspace', error);
    }
};

export const adminDeleteWorkspace = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await Workspace.findByIdAndDelete(id);
        if (!deleted) return sendError(res, 404, 'Workspace not found');
        return res.json({ message: 'Workspace deleted' });
    } catch (error: any) {
        return sendError(res, 500, 'Error deleting workspace', error);
    }
};

export const adminAddMemberToWorkspace = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId, role = 'editor' } = req.body;

        if (!userId) return sendError(res, 400, 'userId is required');
        if (!['admin', 'editor', 'viewer'].includes(role)) return sendError(res, 400, 'Invalid role');

        const workspace = await Workspace.findById(id);
        if (!workspace) return sendError(res, 404, 'Workspace not found');

        const user = await User.findById(userId);
        if (!user) return sendError(res, 404, 'User not found');

        const isAlreadyOwner = workspace.owners.some(o => o.toString() === userId);
        const isAlreadyMember = workspace.members.some((m: any) => m.userId.toString() === userId);

        if (isAlreadyOwner || isAlreadyMember) {
            return sendError(res, 409, 'User is already in this workspace');
        }

        workspace.members.push({ userId: user._id, role } as any);
        await workspace.save();

        return res.json({ message: 'Member added', workspace });
    } catch (error: any) {
        return sendError(res, 500, 'Error adding member', error);
    }
};

export const adminRemoveMemberFromWorkspace = async (req: Request, res: Response) => {
    try {
        const { id, userId } = req.params;

        const workspace = await Workspace.findById(id);
        if (!workspace) return sendError(res, 404, 'Workspace not found');

        workspace.members = workspace.members.filter((m: any) => m.userId.toString() !== userId);
        await workspace.save();

        return res.json({ message: 'Member removed' });
    } catch (error: any) {
        return sendError(res, 500, 'Error removing member', error);
    }
};
