export interface KanbanLabel {
    id: string;
    name: string;
    color: string;
}

export interface KanbanStyle {
    backgroundType?: 'default' | 'color' | 'image';
    backgroundColor?: string | null;
    backgroundImageUrl?: string | null;
}

export interface KanbanAssigneeRef {
    _id: string;
    name?: string;
    email?: string;
    picture?: string;
}

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
    assigneeId?: string | KanbanAssigneeRef | null;
    archived?: boolean;
    dueDate?: string | null;
    labels?: KanbanLabel[];
    style?: KanbanStyle;
}
