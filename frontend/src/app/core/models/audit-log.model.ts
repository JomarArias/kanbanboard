export interface AuditLog {
    _id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
    details: string;
    timestamp: string;
}
