import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type MeetingRequestStatus = 'pending' | 'cancelled';

export interface MeetingRequest {
  _id: string;
  createdBy: string;
  cardId?: string | null;
  prospectName: string;
  prospectEmail?: string | null;
  prospectPhone?: string | null;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  status: MeetingRequestStatus;
  googleEventId?: string | null;
  googleEventHtmlLink?: string | null;
  syncStatus: 'pending' | 'synced' | 'failed';
  syncError?: string | null;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequestPayload {
  cardId?: string | null;
  prospectName: string;
  prospectEmail?: string | null;
  prospectPhone?: string | null;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MeetingRequestService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  create(payload: CreateMeetingRequestPayload): Observable<MeetingRequest> {
    return this.http.post<MeetingRequest>(`${this.apiUrl}/meeting-requests`, payload);
  }

  listMine(): Observable<MeetingRequest[]> {
    return this.http.get<MeetingRequest[]>(`${this.apiUrl}/meeting-requests`);
  }

  getById(id: string): Observable<MeetingRequest> {
    return this.http.get<MeetingRequest>(`${this.apiUrl}/meeting-requests/${id}`);
  }

  cancel(id: string): Observable<MeetingRequest> {
    return this.http.patch<MeetingRequest>(`${this.apiUrl}/meeting-requests/${id}/cancel`, {});
  }

  syncGoogle(id: string): Observable<{ ok: boolean; alreadySynced: boolean; meetingRequest: MeetingRequest }> {
    return this.http.post<{ ok: boolean; alreadySynced: boolean; meetingRequest: MeetingRequest }>(
      `${this.apiUrl}/meeting-requests/${id}/sync-google`,
      {}
    );
  }
}
