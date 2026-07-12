const Joi = require("joi");
const registerValidation = Joi.object({

    username: Joi.string()
        .min(3)
        .max(30)
        .required(),

    email: Joi.string()
        .email()
        .required(),

    password: Joi.string()
        .min(6)
        .required(),

    phone: Joi.string()
        .required()

}).unknown(false);

const verifyOtpValidation = Joi.object({

    email: Joi.string()
        .email()
        .required(),

    otp: Joi.string()
        .length(6)
        .required()

});

const loginValidation = Joi.object({

    email: Joi.string()
        .email()
        .required(),

    password: Joi.string()
        .required()

});


const forgotPasswordValidation = Joi.object({

    email: Joi.string()
        .email()
        .required()

});

const resetPasswordValidation = Joi.object({

    resetToken: Joi.string()
        .required(),

    password: Joi.string()
        .min(6)
        .required()

});

const changePasswordValidation = Joi.object({
    currentPassword: Joi.string()
        .required(),

    newPassword: Joi.string()
        .min(6)
        .required()
}).unknown(false);

const changeRoleValidation = Joi.object({
    role: Joi.string()
        .valid("customer", "admin")
        .required()
});


module.exports = {
    registerValidation,
    verifyOtpValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    changePasswordValidation,
    changeRoleValidation
};