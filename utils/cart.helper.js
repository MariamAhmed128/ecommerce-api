const Cart = require("../models/Cart.model");

const AppError = require("./appError");
const MESSAGES = require("./messages");



const getOrCreateCart = async (userId) => {

    let cart = await Cart.findOne({
        user: userId
    });

    if (!cart) {

        cart = await Cart.create({
            user: userId
        });

    }

    return cart;

};



const validateProduct = (
    product,
    quantity = null
) => {

    if (!product) {
        throw new AppError(
            MESSAGES.PRODUCT_NOT_FOUND,
            404
        );
    }

    if (!product.isActive) {
        throw new AppError(
            MESSAGES.PRODUCT_NOT_AVAILABLE,
            400
        );
    }

    if (
        quantity !== null &&
        product.stock < quantity
    ) {
        throw new AppError(
            MESSAGES.INSUFFICIENT_STOCK,
            400
        );
    }

};



module.exports = {
    getOrCreateCart,
    validateProduct
};