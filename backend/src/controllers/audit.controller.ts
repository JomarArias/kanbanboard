import { AuditLog } from "../models/audit-log.js";
import { Request, Response } from "express";
import { sendError } from "../utils/http-response.js";

export const listAuditLogs = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 100);
    const offset = Number(req.query.offset ?? 0);

    if (!Number.isInteger(limit) || limit <= 0 || limit > 500) {
      return sendError(res, 400, "limit debe ser un entero entre 1 y 500");
    }

    if (!Number.isInteger(offset) || offset < 0) {
      return sendError(res, 400, "offset debe ser un entero mayor o igual a 0");
    }

    const logs = await AuditLog.find()
      .sort({ timestamp: -1, _id: -1 })
      .skip(offset)
      .limit(limit);

    return res.json(logs);
  } catch (err) {
    return sendError(res, 500, "Error listando historial", err);
  }
};
