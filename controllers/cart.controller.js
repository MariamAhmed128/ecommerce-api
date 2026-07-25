const Product = require("../models/Product.model");

const {
    getOrCreateCart,
    validateProduct
} = require("../utils/cart.helper");

const COUPONS = require("../utils/coupons");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");  



const getCart = async (req, res, next) => {

    try {

        const cart = await getOrCreateCart(req.user.id);

        return res.status(200).json({
            success: true,
            message: MESSAGES.CART_RETRIEVED_SUCCESSFULLY,
            data: cart
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};

const addItem = async (req, res, next) => {

    try {

        const { productId, quantity } = req.body;

        const cart = await getOrCreateCart(req.user.id);

        const product = await Product.findById(productId);

        const existingItem = cart.items.find(
            item => item.product.toString() === productId
        );

        const requestedQuantity = existingItem
            ? existingItem.quantity + quantity
            : quantity;

        validateProduct(product, requestedQuantity);

        if (existingItem) {

            existingItem.quantity += quantity;

        } else {

            cart.items.push({
                product: product._id,
                name: product.name,
                image: product.images?.[0]?.url,
                price: product.price,
                quantity
            });

        }

        await cart.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.ITEM_ADDED_TO_CART_SUCCESSFULLY,
            data: cart
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};

const updateItemQuantity = async (req, res, next) => {

    try {

        const { productId, quantity } = req.body;

        const cart = await getOrCreateCart(req.user.id);

        const product = await Product.findById(productId);

        const existingItem = cart.items.find(
            item => item.product.toString() === productId
        );

        if (!existingItem) {
            throw new AppError(
                MESSAGES.ITEM_NOT_FOUND_IN_CART,
                404
            );
        }

        validateProduct(product, quantity);

        existingItem.quantity = quantity;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.ITEM_QUANTITY_UPDATED_SUCCESSFULLY,
            data: cart
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};


const removeItem = async (req, res, next) => {

    try {

        const { productId } = req.params;

        const cart = await getOrCreateCart(req.user.id);
        const itemIndex = cart.items.findIndex(
            item => (item.product._id || item.product).toString() === productId
        );

        if (itemIndex === -1) {
            throw new AppError(
                MESSAGES.ITEM_NOT_FOUND_IN_CART,
                404
            );
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.ITEM_REMOVED_FROM_CART_SUCCESSFULLY,
            data: cart
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};


const applyCoupon = async (req, res, next) => {

    try {

        const code = req.body.code.trim().toUpperCase();

        const cart = await getOrCreateCart(req.user.id);

        const coupon = COUPONS[code];

        if (!cart.items.length) {
            throw new AppError(
                MESSAGES.CANNOT_APPLY_COUPON_TO_EMPTY_CART,
                400
            );
        }

        if (!coupon) {
            throw new AppError(
                MESSAGES.INVALID_COUPON,
                400
            );
        }

        cart.coupon = {
            code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
        };

        await cart.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.COUPON_APPLIED_SUCCESSFULLY,
            data: cart
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};



const removeCoupon = async (req, res, next) => {

    try {

        const cart = await getOrCreateCart(req.user.id);

        cart.coupon = undefined;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.COUPON_REMOVED_SUCCESSFULLY,
            data: cart
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};



const clearCart = async (req, res, next) => {

    try {

        const cart = await getOrCreateCart(req.user.id);

        cart.items = [];
        cart.coupon = undefined;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.CART_CLEARED_SUCCESSFULLY,
            data: cart
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};



module.exports = {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    clearCart
};