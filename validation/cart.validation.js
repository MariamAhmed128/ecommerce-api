const Joi = require("joi");



// ================= Common Fields =================

const productId = Joi.string()
    .hex()
    .length(24)
    .required();

const quantity = Joi.number()
    .integer()
    .min(1)
    .required();


// ================= Add Item =================

const addItemValidation = Joi.object({

    productId,

    quantity

});


// ================= Update Item Quantity =================

const updateItemValidation = Joi.object({

    productId,

    quantity

});


// ================= Remove Item =========================

const removeItemValidation = Joi.object({
    productId
});


// ================= Apply Coupon =================

const applyCouponValidation = Joi.object({

    code: Joi.string()
        .trim()
        .uppercase()
        .required()

});


module.exports = {
    addItemValidation,

    updateItemValidation,

    removeItemValidation,

    applyCouponValidation
};