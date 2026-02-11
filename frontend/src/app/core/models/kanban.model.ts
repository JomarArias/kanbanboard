export interface Kanban {
    id: string;
    title: string;
    task: string;
    listId: string;
    order: string;
    updatedAt: Date;
    isNew?: boolean;
}