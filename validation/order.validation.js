const Joi = require("joi");

const createOrderValidation = Joi.object({

    shippingAddress: Joi.object({

        fullName: Joi.string()
            .trim()
            .required(),

        phone: Joi.string()
            .trim()
            .required(),

        country: Joi.string()
            .trim()
            .required(),

        city: Joi.string()
            .trim()
            .required(),

        address: Joi.string()
            .trim()
            .required(),

        postalCode: Joi.string()
            .trim()
            .allow("")

    }).required(),

    paymentMethod: Joi.string()
        .valid(
            "cash",
            "stripe",
            "paypal",
            "paymob"
        )
        .required()

});



const updateOrderStatusValidation = Joi.object({

    status: Joi.string()
        .valid(
            "cash",
            "stripe"
        )
        .required(),

    adminNote: Joi.string()
        .trim()
        .max(500)
        .allow("")

});


module.exports = {
    createOrderValidation,
    updateOrderStatusValidation
};
