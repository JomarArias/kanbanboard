import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { MeetingRequest } from '../models/MeetingRequest.js';
import { sendError } from '../utils/http-response.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseDate = (input: unknown): Date | null => {
  if (!input) return null;
  const date = new Date(String(input));
  return Number.isNaN(date.getTime()) ? null : date;
};

const validatePayload = (body: any) => {
  const title = (body?.title || '').trim();
  const prospectName = (body?.prospectName || '').trim();
  const prospectEmail = (body?.prospectEmail || '').trim();
  const prospectPhone = (body?.prospectPhone || '').trim();
  const description = (body?.description || '').trim();
  const cardId = body?.cardId;

  const startAt = parseDate(body?.startAt);
  const endAt = parseDate(body?.endAt);

  if (!title) return { ok: false, message: 'El título es obligatorio' };
  if (!prospectName) return { ok: false, message: 'El nombre del prospecto es obligatorio' };
  if (!startAt) return { ok: false, message: 'La fecha/hora de inicio es obligatoria y válida' };
  if (!endAt) return { ok: false, message: 'La fecha/hora de fin es obligatoria y válida' };

  if (startAt.getTime() < Date.now()) {
    return { ok: false, message: 'La fecha/hora de inicio no puede estar en el pasado' };
  }

  if (endAt.getTime() <= startAt.getTime()) {
    return { ok: false, message: 'La fecha/hora de fin debe ser posterior a la de inicio' };
  }

  if (prospectEmail && !EMAIL_REGEX.test(prospectEmail)) {
    return { ok: false, message: 'El correo del prospecto no es válido' };
  }

  if (cardId && !isValidObjectId(String(cardId))) {
    return { ok: false, message: 'cardId inválido' };
  }

  return {
    ok: true,
    value: {
      title,
      prospectName,
      prospectEmail: prospectEmail || null,
      prospectPhone: prospectPhone || null,
      description: description || null,
      cardId: cardId ? String(cardId) : undefined,
      startAt,
      endAt,
    }
  };
};

export const createMeetingRequest = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id;
    const validation = validatePayload(req.body);

    if (!validation.ok) return sendError(res, 400, validation.message || 'Payload inválido');

    const created = await MeetingRequest.create({
      createdBy: userId,
      ...validation.value,
      status: 'pending',
      googleEventId: null,
    });

    return res.status(201).json(created);
  } catch (error) {
    return sendError(res, 500, 'Error creando solicitud de cita');
  }
};

export const listMyMeetingRequests = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id;
    const requests = await MeetingRequest.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(requests);
  } catch (error) {
    return sendError(res, 500, 'Error listando solicitudes de cita');
  }
};

export const getMyMeetingRequestById = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id;
    const id = req.params.id;

    if (!isValidObjectId(id)) return sendError(res, 400, 'id inválido');

    const request = await MeetingRequest.findOne({ _id: id, createdBy: userId }).lean();
    if (!request) return sendError(res, 404, 'Solicitud no encontrada');

    return res.json(request);
  } catch (error) {
    return sendError(res, 500, 'Error obteniendo solicitud de cita');
  }
};

export const cancelMyMeetingRequest = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user._id;
    const id = req.params.id;

    if (!isValidObjectId(id)) return sendError(res, 400, 'id inválido');

    const updated = await MeetingRequest.findOneAndUpdate(
      { _id: id, createdBy: userId },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!updated) return sendError(res, 404, 'Solicitud no encontrada');
    return res.json(updated);
  } catch (error) {
    return sendError(res, 500, 'Error cancelando solicitud de cita');
  }
};
