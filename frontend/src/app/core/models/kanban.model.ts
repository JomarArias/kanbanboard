export interface KanbanLabel {
  id: string;
  name: string;
  color: string;
}

export interface style {
   backgroundType?:'default' | 'color';
   backgroundColor?: string | null
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
    dueDate?: string | null;
    labels?: KanbanLabel[];
    style?: style;

}
