import { Router } from 'express';
import {
    getMyWorkspaces, createWorkspace, getWorkspaceMembers, inviteMember,
    updateMemberRole, removeMember, adminListWorkspaces, adminCreateWorkspace,
    adminUpdateWorkspace, adminDeleteWorkspace, adminAddMemberToWorkspace, adminRemoveMemberFromWorkspace
} from '../controllers/workspace.controller.js';
import { verifyFirebaseToken, requireUser, requireAdmin } from '../middlewares/auth.middleware.js';
import { requireWorkspaceAccess } from '../middlewares/workspace.middleware.js';

const router = Router();

// All workspace routes require Firebase auth
router.use(verifyFirebaseToken, requireUser);

// My workspaces
router.get('/workspaces', getMyWorkspaces);
router.post('/workspaces', createWorkspace);

// Workspace-scoped member management
router.get('/workspaces/members', requireWorkspaceAccess, getWorkspaceMembers);
router.post('/workspaces/invite', requireWorkspaceAccess, inviteMember);
router.patch('/workspaces/members/:userId/role', requireWorkspaceAccess, updateMemberRole);
router.delete('/workspaces/members/:userId', requireWorkspaceAccess, removeMember);

// Admin: board/workspace CRUD (all workspaces)
router.get('/admin/workspaces', requireAdmin, adminListWorkspaces);
router.post('/admin/workspaces', requireAdmin, adminCreateWorkspace);
router.patch('/admin/workspaces/:id', requireAdmin, adminUpdateWorkspace);
router.delete('/admin/workspaces/:id', requireAdmin, adminDeleteWorkspace);
router.post('/admin/workspaces/:id/members', requireAdmin, adminAddMemberToWorkspace);
router.delete('/admin/workspaces/:id/members/:userId', requireAdmin, adminRemoveMemberFromWorkspace);

export default router;
