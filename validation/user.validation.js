const Joi = require("joi");

const addUserValidation = Joi.object({
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
        .required() ,
    role: Joi.string()
        .valid("admin", "customer")
        .required()
}).unknown(false);


const updateUserValidation = Joi.object({
    username: Joi.string().min(3).max(30),

    phone: Joi.string(),

    role: Joi.string().valid("admin", "customer"),

    isVerified: Joi.boolean(),

    addresses: Joi.array().items(
        Joi.object({
            fullName: Joi.string().required(),
            phone: Joi.string().required(),
            country: Joi.string().required(),
            city: Joi.string().required(),
            address: Joi.string().required(),
            postalCode: Joi.string().allow("")
        })
    )

}).unknown(false);
module.exports = {
    addUserValidation,
    updateUserValidation,
};