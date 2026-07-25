const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");

module.exports = (err, req, res, next) => {

    if (err.name === "CastError") {
        err = new AppError(
            MESSAGES.INVALID_ID_FORMAT,
            400
        );
    }

    if (err.name === "ValidationError") {
        err = new AppError(
            Object.values(err.errors)
                .map(error => error.message)
                .join(", "),
            400
        );
    }

    if (err.code === 11000) {
        err = new AppError(
            `${MESSAGES.DUPLICATE_VALUE}: ${Object.keys(err.keyValue).join(", ")}`,
            409
        );
    }

    if (err.name === "JsonWebTokenError") {
        err = new AppError(
            MESSAGES.INVALID_TOKEN,
            401
        );
    }

    if (err.name === "TokenExpiredError") {
        err = new AppError(
            MESSAGES.TOKEN_EXPIRED,
            401
        );
    }

    if (err.name === "MulterError") {
        err = new AppError(err.message, 400);
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.errors?.length && {
                errors: err.errors
            }),
            ...(process.env.NODE_ENV === "development" && {
                stack: err.stack
            })
        });
    }

    console.error(err);

    return res.status(500).json({
        success: false,
        message: MESSAGES.INTERNAL_SERVER_ERROR,
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack
        })
    });

};