import multer from "multer";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

// Memory storage: we validate the buffer and hand it to the OCR provider
// and receiptStorage.js ourselves, rather than letting multer write directly
// to disk — keeps file-type/size enforcement and the eventual storage
// backend (local disk today, S3 later) fully under our control.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error(
        "Unsupported file type. Only JPEG, PNG, and WEBP images are accepted.",
      ),
    );
  }
  cb(null, true);
};

const uploadReceiptImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single("receipt");

/**
 * Wraps multer's callback-style middleware so multer/file-filter errors flow
 * through a clean 400 response instead of an unhandled exception.
 */
export const handleReceiptUpload = (req, res, next) => {
  uploadReceiptImage(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ message: "Receipt image must be smaller than 8MB." });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No receipt image uploaded." });
    }
    next();
  });
};
