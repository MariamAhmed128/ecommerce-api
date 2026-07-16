const Joi = require("joi");


// ================= Common Fields =================

const productId = Joi.string()
    .hex()
    .length(24)
    .required();


// ================= Add Product =================

const addToWishlistValidation = Joi.object({
    productId
});


// ================= Remove Product =================

const removeFromWishlistValidation = Joi.object({
    productId
});


module.exports = {

    addToWishlistValidation,

    removeFromWishlistValidation

};