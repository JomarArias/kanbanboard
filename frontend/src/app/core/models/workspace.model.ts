export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
    _id: string;
    name: string;
    email: string;
    picture: string;
    role: WorkspaceRole;
    isOwner: boolean;
    isDeleted?: boolean;
}

export interface Workspace {
    _id: string;
    name: string;
    owners: any[];
    members: WorkspaceMember[];
    createdAt?: string;
    updatedAt?: string;
    isOwner?: boolean;
    myRole?: WorkspaceRole;
}
