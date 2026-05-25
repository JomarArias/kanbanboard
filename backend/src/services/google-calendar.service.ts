import { MeetingRequest } from '../models/MeetingRequest.js';
import type { IMeetingRequest } from '../models/MeetingRequest.js';
import { GoogleCalendarIntegration } from '../models/GoogleCalendarIntegration.js';
import {
  encryptOAuthToken,
  getGoogleIntegrationRuntimeStatus,
  validateGoogleOAuthConfig,
} from './google-oauth.service.js';

const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() || 'America/Cancun';

type SyncInput = {
  meetingRequestId: string;
  userId: string;
};

type GoogleEventPayload = {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string }>;
};

type GoogleEventResponse = {
  id: string;
  htmlLink?: string;
};

export class GoogleCalendarNotLinkedError extends Error {}
export class GoogleCalendarReauthorizationRequiredError extends Error {}
export class GoogleCalendarSyncError extends Error {}

const buildEventDescription = (meeting: IMeetingRequest): string => {
  const lines = [
    meeting.description || 'Sin descripción',
    '',
    `Prospecto: ${meeting.prospectName}`,
    `Email: ${meeting.prospectEmail || 'N/D'}`,
    `Teléfono: ${meeting.prospectPhone || 'N/D'}`,
  ];

  return lines.join('\n').trim();
};

const mapMeetingRequestToGoogleEvent = (meeting: IMeetingRequest): GoogleEventPayload => {
  const payload: GoogleEventPayload = {
    summary: meeting.title,
    description: buildEventDescription(meeting),
    start: {
      dateTime: new Date(meeting.startAt).toISOString(),
      timeZone: DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: new Date(meeting.endAt).toISOString(),
      timeZone: DEFAULT_TIMEZONE,
    },
  };

  if (meeting.prospectEmail) {
    payload.attendees = [{ email: meeting.prospectEmail }];
  }

  return payload;
};

const refreshAccessToken = async (userId: string, refreshToken: string) => {
  const cfg = validateGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new GoogleCalendarReauthorizationRequiredError('No se pudo refrescar el token de Google');
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };

  const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  const integration = await GoogleCalendarIntegration.findOne({ userId });
  if (!integration) {
    throw new GoogleCalendarNotLinkedError('Integración de Google no encontrada');
  }

  integration.accessTokenEncrypted = encryptOAuthToken(tokenData.access_token);
  integration.accessTokenExpiresAt = accessTokenExpiresAt;
  integration.scope = tokenData.scope || integration.scope;
  integration.tokenType = tokenData.token_type || integration.tokenType || 'Bearer';
  await integration.save();

  return {
    accessToken: tokenData.access_token,
    tokenType: integration.tokenType,
  };
};

const createGoogleCalendarEvent = async (
  accessToken: string,
  tokenType: string,
  eventPayload: GoogleEventPayload
): Promise<GoogleEventResponse> => {
  const response = await fetch(GOOGLE_CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `${tokenType} ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (response.status === 401 || response.status === 403) {
    throw new GoogleCalendarReauthorizationRequiredError('Google rechazó la autorización. Reconecta tu cuenta.');
  }

  if (!response.ok) {
    throw new GoogleCalendarSyncError(`Google Calendar respondió con estado ${response.status}`);
  }

  return (await response.json()) as GoogleEventResponse;
};

export const syncMeetingRequestToGoogleCalendar = async ({
  meetingRequestId,
  userId,
}: SyncInput) => {
  const meeting = await MeetingRequest.findOne({ _id: meetingRequestId, createdBy: userId });
  if (!meeting) {
    throw new GoogleCalendarSyncError('Solicitud no encontrada');
  }

  if (meeting.googleEventId) {
    return {
      alreadySynced: true,
      googleEventId: meeting.googleEventId,
      googleEventHtmlLink: meeting.googleEventHtmlLink || null,
      meetingRequest: meeting,
    };
  }

  const runtime = await getGoogleIntegrationRuntimeStatus(userId);
  if (!runtime.connected || !runtime.token) {
    throw new GoogleCalendarNotLinkedError(
      'Debes vincular Google Calendar antes de solicitar una cita'
    );
  }

  let tokenType = runtime.token.tokenType || 'Bearer';
  let accessToken = runtime.token.accessToken;

  if (runtime.accessTokenExpired) {
    const refreshed = await refreshAccessToken(userId, runtime.token.refreshToken);
    accessToken = refreshed.accessToken;
    tokenType = refreshed.tokenType;
  }

  const eventPayload = mapMeetingRequestToGoogleEvent(meeting);
  const createdEvent = await createGoogleCalendarEvent(accessToken, tokenType, eventPayload);

  meeting.googleEventId = createdEvent.id;
  meeting.googleEventHtmlLink = createdEvent.htmlLink || null;
  meeting.syncStatus = 'synced';
  meeting.syncError = null;
  meeting.syncedAt = new Date();
  await meeting.save();

  return {
    alreadySynced: false,
    googleEventId: createdEvent.id,
    googleEventHtmlLink: createdEvent.htmlLink || null,
    meetingRequest: meeting,
  };
};
