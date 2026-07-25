const Joi = require("joi");

// = Common Fields 

const password = Joi.string()
    .min(8)
    .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    );
const requiredPassword = password.required();

const phone = Joi.string()
    .pattern(/^\+[1-9]\d{7,14}$/);

const requiredPhone = phone.required();

// = Add User

const addUserValidation = Joi.object({

    username: Joi.string()
        .min(3)
        .max(30)
        .required(),

    email: Joi.string()
        .email()
        .required(),

    password: requiredPassword,

    phone: requiredPhone,

    role: Joi.string()
        .valid("admin", "customer")
        .required()

}).unknown(false);

// = Update User 

const updateUserValidation = Joi.object({

    username: Joi.string()
        .min(3)
        .max(30),

    phone,

    role: Joi.string()
        .valid("admin", "customer"),

    isVerified: Joi.boolean(),

    addresses: Joi.array().items(
        Joi.object({

            fullName: Joi.string()
                .required(),

            phone: requiredPhone,

            country: Joi.string()
                .required(),

            city: Joi.string()
                .required(),

            address: Joi.string()
                .required(),

            postalCode: Joi.string()
                .allow("")

        })
    )

}).unknown(false);

module.exports = {
    addUserValidation,
    updateUserValidation
};