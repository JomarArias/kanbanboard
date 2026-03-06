import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog } from '../models/audit-log.model';
import { WorkspaceService } from './workspace.service';

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    private apiUrl = `${environment.apiUrl}/audit-logs`;

    constructor(
        private http: HttpClient,
        private workspaceService: WorkspaceService
    ) { }

    getAuditLogs(limit: number = 100, offset: number = 0): Observable<AuditLog[]> {
        let params = new HttpParams()
            .set('limit', String(limit))
            .set('offset', String(offset));

        const workspaceId = this.workspaceService.getActiveWorkspaceId();
        if (workspaceId) {
            params = params.set('workspaceId', workspaceId);
        }

        return this.http.get<AuditLog[]>(this.apiUrl, { params });
    }
}
