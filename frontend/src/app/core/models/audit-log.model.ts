export interface AuditLog {
    _id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'ARCHIVE';
    details: string;
    performedBy?: { _id: string; name: string; picture: string; email: string };
    timestamp: string;
}
