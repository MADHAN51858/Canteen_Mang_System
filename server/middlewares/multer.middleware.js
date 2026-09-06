import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";

const tempDir = path.join(os.tmpdir(), "canteen-temp");
try {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
} catch (e) {
    // Silently ignore if creation fails on cold start
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
        } catch (e) {
            // fallback
        }
        cb(null, tempDir);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname || "");
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});