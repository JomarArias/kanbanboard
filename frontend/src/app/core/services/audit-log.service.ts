import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog } from '../models/audit-log.model';

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    private apiUrl = `${environment.apiUrl}/audit-logs`;

    constructor(private http: HttpClient) { }

    getAuditLogs(limit: number = 100, offset: number = 0): Observable<AuditLog[]> {
        return this.http.get<AuditLog[]>(`${this.apiUrl}?limit=${limit}&offset=${offset}`);
    }
}
