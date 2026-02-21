import { Request, Response } from "express";
import { sendError } from "../utils/http-response.js";
import { uploadImageBuffer } from "../services/upload.service.js";

export const uploadCardImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return sendError(res, 400, "Archivo requerido en campo 'file'");
    }

    if (!file.mimetype.startsWith("image/")) {
      return sendError(res, 400, "El archivo debe ser una imagen");
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

