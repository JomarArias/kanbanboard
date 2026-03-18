import { Router } from "express";
import multer from "multer";
import { uploadCardImage, uploadProfileImage } from "../controllers/upload.controller.js";
import { requireWorkspaceAccess } from "../middlewares/workspace.middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.post("/uploads/image", requireWorkspaceAccess, upload.single("file"), uploadCardImage);

router.post("/uploads/profile-image", upload.single("file"), uploadProfileImage)

export default router;

