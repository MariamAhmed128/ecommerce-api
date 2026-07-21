const mongoose = require("mongoose");

const Order = require("../models/Order.model");
const Cart = require("../models/Cart.model");
const Product = require("../models/Product.model");

const User = require("../models/User.model");

const sendEmail = require("../utils/emails/sendEmail");

const orderConfirmationEmail = require("../utils/emails/orderConfirmationEmail");


const {
    validateProduct
} = require("../utils/cart.helper");

const {
    calculateOrderTotals
} = require("../utils/order.helper");


const getPagination = require("../utils/pagination");
const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");



const getMyOrders = async (req, res, next) => {

    try {

        const {
            page,
            limit,
            skip
        } = getPagination(req.query);

        const status = req.query.status;

        const filter = {
            user: req.user.id    //"هات أوردراتي أنا."
        };

        if (status) {
            filter.status = status;
        }

        const [orders, totalItems] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Order.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: MESSAGES.ORDERS_RETRIEVED_SUCCESSFULLY,
            data: orders,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit
            }
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};


const getMyOrderById = async (req, res, next) => {

    try {

        const id = req.params.id;
        
        const order = await Order.findOne({
            _id: id,
            user: req.user.id
        });

        if (!order) {
            throw new AppError(MESSAGES.ORDER_NOT_FOUND, 404);
        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.ORDER_RETRIEVED_SUCCESSFULLY,
            data: order
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};



const createOrder = async (req, res, next) => {

        const session = await mongoose.startSession();

        session.startTransaction();

    try {

        
        const cart = await Cart.findOne({
            user: req.user.id
        }).session(session);
        if(!cart || !cart.items.length){
            throw new AppError(MESSAGES.CART_NOT_FOUND_OR_NO_ITEMS_TO_ORDER, 404);
        }
        const { shippingAddress, paymentMethod } = req.body;
        
        const {
            subtotal,
            discount,
            shippingFee,
            tax,
            totalPrice
        } = calculateOrderTotals(cart);

        const productsToUpdate = [];

        for (const item of cart.items) {

            const product = await Product.findById(item.product).session(session);

            validateProduct(product, item.quantity);

            productsToUpdate.push({
                product,
                quantity: item.quantity
            });

        }

        const orderItems = [...cart.items];

        const order = await Order.create(
            [{
                user: req.user.id,
                items: orderItems,
                shippingAddress,
                paymentMethod,
                subtotal,
                shippingFee,
                tax,
                discount,
                totalPrice
            }],
            { session }
        );


        for (const productData of productsToUpdate) {

            productData.product.stock -= productData.quantity;

            await productData.product.save({ session });

        }

        cart.items = [];
        cart.coupon = undefined;

        await cart.save({ session });
        await session.commitTransaction();
        
        const user = await User.findById(req.user.id);

        try {

            await sendEmail(
                user.email,
                "Order Confirmation",
                orderConfirmationEmail(order[0], user)
            );

        } catch (emailError) {

            console.error(
                "Failed to send order confirmation email:",
                emailError
            );

        }

        return res.status(201).json({
            success: true,
            message: MESSAGES.ORDER_CREATED_SUCCESSFULLY,
            data: order[0]
        });
    } catch (error) {

        await session.abortTransaction();

        console.error(error);

        return next(error);

    } finally {

        await session.endSession();

    }
};


const cancelOrder = async (req, res, next) => {

    const session = await mongoose.startSession();

    session.startTransaction();

    try {
            const id = req.params.id;
            const order = await Order.findOne({
                _id: id,
                user: req.user.id
            }).session(session);
            if (!order) {
                throw new AppError(MESSAGES.ORDER_NOT_FOUND, 404);
            }
            if (!["pending", "confirmed"].includes(order.status)) {
                throw new AppError(
                    MESSAGES.ORDER_CANNOT_BE_CANCELLED,
                    400
                );
            }
        
            const productsToRestore = [];

            for (const item of order.items) {

                const product = await Product.findById(item.product).session(session);

                if (!product) {
                    throw new AppError(
                        MESSAGES.PRODUCT_NOT_FOUND,
                        404
                    );
                }

                productsToRestore.push({
                    product,
                    quantity: item.quantity
                });

            }

            for (const productData of productsToRestore) {

                productData.product.stock += productData.quantity;

                await productData.product.save({ session });

            }
            order.status = "cancelled";

            order.cancelledAt = new Date();

            await order.save({ session });
                    
            await session.commitTransaction();

            return res.status(200).json({
                success: true,
                message: MESSAGES.ORDER_CANCELLED_SUCCESSFULLY,
                data: order
            });

    } catch (error) {

        await session.abortTransaction();

        console.error(error);

        return next(error);

    } finally {

        await session.endSession();

    }

};





module.exports = {
    getMyOrders,
    getMyOrderById,
    createOrder,
    cancelOrder
};