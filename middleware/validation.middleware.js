

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");


const validate = (schema, property = "body") => {

    return (req, res, next) => {

        const { error, value } = schema.validate(req[property], {
            abortEarly: false
        });

        if (error) {
            return next(
                new AppError(
                    MESSAGES.VALIDATION_FAILED,
                    400,
                    error.details.map(err => ({
                        field: err.path.join("."),
                        message: err.message.replace(/"/g, "")
                    }))
                )
            );
        }

        req[property] = value;

        next();

    };

};

module.exports = validate;