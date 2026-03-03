import { Response } from "express"

export const sendError = (res: Response, status: number, message: string, details?: unknown) => {
  if (details) console.error(details);
  return res.status(status).json({ ok: false, message });
};
