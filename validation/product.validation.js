const Joi = require("joi");

const createProductValidation = Joi.object({

    name: Joi.string()
        .trim()
        .max(200)
        .required(),

    shortDescription: Joi.string()
        .trim()
        .max(500)
        .required(),

    description: Joi.string()
        .trim()
        .required(),

    price: Joi.number()
        .min(0)
        .required(),

    discountPrice: Joi.number()
        .min(0)
        .optional(),

    stock: Joi.number()
        .integer()
        .min(0)
        .required(),

    sku: Joi.string()
        .trim()
        .required(),

    category: Joi.string()
        .trim()
        .required(),

    subcategory: Joi.string()
        .trim()
        .optional(),

    brand: Joi.string()
        .trim()
        .optional(),

    tags: Joi.alternatives().try(
        Joi.array().items(Joi.string().trim()),
        Joi.string().trim()
    ),

    featured: Joi.boolean().optional()

});


const updateProductValidation = Joi.object({

    name: Joi.string()
        .trim()
        .max(200),

    shortDescription: Joi.string()
        .trim()
        .max(500),

    description: Joi.string()
        .trim(),

    price: Joi.number()
        .min(0),

    discountPrice: Joi.number()
        .min(0),

    stock: Joi.number()
        .integer()
        .min(0),

    sku: Joi.string()
        .trim(),

    category: Joi.string()
        .trim(),

    subcategory: Joi.string()
        .trim(),

    brand: Joi.string()
        .trim(),

    tags: Joi.alternatives().try(
        Joi.array().items(Joi.string().trim()),
        Joi.string().trim()
    ),

    featured: Joi.boolean() ,
    
    imagesToDelete: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
    )

}).min(1);

const reviewValidation = Joi.object({

    rating: Joi.number()
        .min(1)
        .max(5)
        .required(),

    comment: Joi.string()
        .trim()
        .allow("")
        .optional()

});

module.exports = {

    createProductValidation,

    updateProductValidation,

    reviewValidation

};


// ==========