// import { Kanban } from './../../../frontend/src/app/core/models/kanban.model';
import { cloudinary } from "../config/cloudinary.js";

type UploadImageResult = {
  imageUrl: string;
  publicId: string;
};

export const uploadImageBuffer = async (
  fileBuffer: Buffer,
  folder: string = "Kanban/cards"
): Promise<UploadImageResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result.public_id) {
          return reject(new Error("Cloudinary no devolvió un resultado de carga válido"));
        }

        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

