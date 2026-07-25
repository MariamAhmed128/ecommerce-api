const Joi = require("joi");

// = Common Fields

const password = Joi.string()
    .min(8)
    .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    );

const phone = Joi.string()
    .pattern(/^\+[1-9]\d{7,14}$/);

// = Register

const registerValidation = Joi.object({

    username: Joi.string()
        .min(3)
        .max(30)
        .required(),

    email: Joi.string()
        .email()
        .required(),

    password: password.required(),

    phone: phone.required()

}).unknown(false);

// = Verify OTP

const verifyOtpValidation = Joi.object({

    email: Joi.string()
        .email()
        .required(),

    otp: Joi.string()
        .length(6)
        .required()

});

// = Login

const loginValidation = Joi.object({

    email: Joi.string()
        .email()
        .required(),

    password: Joi.string()
        .required()

});


// = Forgot Password

const forgotPasswordValidation = Joi.object({

    email: Joi.string()
        .email()
        .required()

});

// = Reset Password

const resetPasswordValidation = Joi.object({

    resetToken: Joi.string()
        .required(),

    password: password.required()

});

// = Change Password

const changePasswordValidation = Joi.object({

    currentPassword: Joi.string().required(),

    newPassword: password.required()

}).unknown(false);

// = Change Role

const changeRoleValidation = Joi.object({

    role: Joi.string()
        .valid("customer", "admin")
        .required()

});

// = Exports

module.exports = {
    registerValidation,
    verifyOtpValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    changePasswordValidation,
    changeRoleValidation
};