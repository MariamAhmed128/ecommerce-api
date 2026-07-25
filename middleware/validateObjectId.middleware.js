const mongoose = require("mongoose");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");

const validateObjectId = (paramName = "id") => {
    return (req, res, next) => {

        const id = req.params[paramName];

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(
                new AppError(MESSAGES.INVALID_ID, 400)
            );
        }

        next();
    };
};

module.exports = validateObjectId;