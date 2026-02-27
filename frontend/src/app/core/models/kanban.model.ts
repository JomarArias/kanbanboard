export interface Kanban {
    _id: string;
    title: string;
    task: string;
    listId: string;
    order: string;
    createdAt?: string;
    updatedAt?: string;
    isNew?: boolean;
    version?: number;
    workspaceId?: string;
    assigneeId?: string;
}