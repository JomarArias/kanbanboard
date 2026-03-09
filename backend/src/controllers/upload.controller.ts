// import { uploadCardImage } from './upload.controller';
import { Request, Response } from "express";
import { sendError } from "../utils/http-response.js";
import { uploadImageBuffer } from "../services/upload.service.js";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export const uploadCardImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return sendError(res, 400, "Archivo requerido en campo 'file'");
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return sendError(
        res,
        400,
        "Formato no permitido. Usa JPG, PNG o WEBP"
      );
    }

    const uploaded = await uploadImageBuffer(file.buffer);

    return res.status(201).json({
      imageUrl: uploaded.imageUrl,
      publicId: uploaded.publicId
    });
  } catch (err: any) {
    return sendError(res, 500, err?.message || "Error subiendo imagen");
  }
};

export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const file = req.file

    if (!file) return sendError (res, 400, "Archivo requiere un campo file")

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)){
      return sendError (
        res, 400, "Formato no permitido.Usa JPG, PNG o WEBP"
      )
    }
    const uploaded = await uploadImageBuffer(file.buffer, "kanban/profiles")

    return res.status(201).json({
      imageUrl: uploaded.imageUrl,
      publicId: uploaded.publicId
    })
  } catch (err: any) {
    return sendError(res, 500, err?.message || "Error subiendo imagen de perfil");
    
  }
};

