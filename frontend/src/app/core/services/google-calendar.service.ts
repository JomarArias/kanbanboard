import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GoogleCalendarConnectionStatus {
  connected: boolean;
  googleEmail?: string | null;
  accessTokenExpiresAt?: string;
  updatedAt?: string;
}

export interface GoogleCalendarConnectResponse {
  authUrl: string;
}

export interface GoogleCalendarDisconnectResponse {
  disconnected: boolean;
  existed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<GoogleCalendarConnectionStatus> {
    return this.http.get<GoogleCalendarConnectionStatus>(`${this.apiUrl}/google-calendar/status`);
  }

  getConnectUrl(): Observable<GoogleCalendarConnectResponse> {
    return this.http.get<GoogleCalendarConnectResponse>(`${this.apiUrl}/google-calendar/connect`);
  }

  disconnect(): Observable<GoogleCalendarDisconnectResponse> {
    return this.http.delete<GoogleCalendarDisconnectResponse>(`${this.apiUrl}/google-calendar/disconnect`);
  }
}
