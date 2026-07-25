const multer = require("multer");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(
            new AppError(
                MESSAGES.ONLY_IMAGE_FILES_ARE_ALLOWED,
                400
            ),
            false
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;