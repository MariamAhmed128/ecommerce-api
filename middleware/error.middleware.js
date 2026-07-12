const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");

module.exports = (err, req, res, next) => {

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    console.error(err);

    return res.status(500).json({
        success: false,
        message: MESSAGES.INTERNAL_SERVER_ERROR
    });

};