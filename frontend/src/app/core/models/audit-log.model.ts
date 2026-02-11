export interface AuditLog {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
    details: string;
    timestamp: Date;
}
