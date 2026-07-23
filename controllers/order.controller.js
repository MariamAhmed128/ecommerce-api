const mongoose = require("mongoose");

const stripe = require("../config/stripe");

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
               totalPages : Math.ceil(totalItems / limit),
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



const createCashOrder = async (req, res, next) => {

    const session = await mongoose.startSession();

    session.startTransaction();

    try {

        const cart = await Cart.findOne({
            user: req.user.id
        }).session(session);

        if (!cart || !cart.items.length) {
            throw new AppError(
                MESSAGES.CART_NOT_FOUND_OR_NO_ITEMS_TO_ORDER,
                404
            );
        }

        const { shippingAddress } = req.body;

        const {
            subtotal,
            discount,
            shippingFee,
            tax,
            totalPrice
        } = calculateOrderTotals(cart);

        const productsToUpdate = [];

        for (const item of cart.items) {

            const product = await Product.findById(item.product)
                .session(session);

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
                paymentMethod: "cash",
                paymentStatus: "pending",
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



const createStripeOrder = async (req, res, next) => {

    const session = await mongoose.startSession();

    session.startTransaction();

    try {

         const cart = await Cart.findOne({
            user: req.user.id
        }).session(session);

        if (!cart || !cart.items.length) {
            throw new AppError(
                MESSAGES.CART_NOT_FOUND_OR_NO_ITEMS_TO_ORDER,
                404
            );
        }

        const { shippingAddress } = req.body;
        
        const {
            subtotal,
            discount,
            shippingFee,
            tax,
            totalPrice
        } = calculateOrderTotals(cart);

        for (const item of cart.items) {

            const product = await Product.findById(item.product)
                .session(session);

            validateProduct(product, item.quantity);

        }

        const orderItems = [...cart.items];

        const order = await Order.create(
            [{
                user: req.user.id,
                items: orderItems,
                shippingAddress,
                paymentMethod:"stripe",
                paymentStatus:"pending",
                status:"pending",
                subtotal,
                shippingFee,
                tax,
                discount,
                totalPrice
            }],
            { session }
        );
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(totalPrice * 100),
                currency: "egp",
                metadata: {
                    orderId: order[0]._id.toString()
                }
            });

            order[0].transactionId = paymentIntent.id;

            await order[0].save({ session });

            await session.commitTransaction();

            return res.status(201).json({
                success: true,
                message: MESSAGES.ORDER_CREATED_SUCCESSFULLY,
                data: {
                    orderId: order[0]._id,
                    clientSecret: paymentIntent.client_secret
                }
            });

    
    } catch (error) {

        await session.abortTransaction();

        console.error(error);

        return next(error);

    } finally {

        await session.endSession();

    }

};



const stripeWebhook = async (req, res, next) => {

    try {

        const signature = req.headers["stripe-signature"];

        const event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        if (event.type === "payment_intent.payment_failed") {

            const paymentIntent = event.data.object;

            const session = await mongoose.startSession();
        try {

            session.startTransaction();

            const order = await Order.findById(
                paymentIntent.metadata.orderId
            ).session(session);

            if (!order) {
                await session.commitTransaction();
                return res.status(200).json({
                    received: true
                });
            }

            if (
                order.paymentStatus === "paid" ||
                order.paymentStatus === "refunded"
            ) {
                await session.commitTransaction();
                return res.status(200).json({
                    received: true
                });
            }

                order.paymentStatus = "failed";
                order.status = "cancelled";
                order.cancelledAt = new Date();

                await order.save({ session });

                await session.commitTransaction();

                return res.status(200).json({
                    received: true
                });

            } catch (error) {

                await session.abortTransaction();
                throw error;

            } finally {

                await session.endSession();

            }
        }

        if (event.type === "payment_intent.succeeded") {

            const paymentIntent = event.data.object;

            const session = await mongoose.startSession();

            try {

                session.startTransaction();

                const order = await Order.findById(
                    paymentIntent.metadata.orderId
                ).session(session);

                if (!order) {

                    await session.commitTransaction();
                    return res.status(200).json({
                        received: true
                    });

                }

                if (
                    order.paymentStatus === "paid" ||
                    order.paymentStatus === "refunded"
                ) {

                    await session.commitTransaction();
                    return res.status(200).json({
                        received: true
                    });

                }

               let outOfStock = false;

                for (const item of order.items) {

                    const product = await Product.findById(item.product)
                        .session(session);
                    try {

                        validateProduct(product, item.quantity);

                    } catch (error) {

                        if (error instanceof AppError) {
                            outOfStock = true;
                            break;
                        }

                        throw error;

                    }

                }

                if (outOfStock) {

                    await stripe.refunds.create({
                        payment_intent: paymentIntent.id
                    });

                    order.status = "cancelled";
                    order.paymentStatus = "refunded";
                    order.cancelledAt = new Date();
                    order.refundReason = "Out of stock";

                    await order.save();

                    return res.status(200).json({
                        received: true
                    });

                }

                for (const item of order.items) {

                    await Product.findByIdAndUpdate(
                        item.product,
                        {
                            $inc: {
                                stock: -item.quantity
                            }
                        },
                        {
                            session
                        }
                    );

                }
                const cart = await Cart.findOne({
                    user: order.user
                }).session(session);

                if (cart) {

                    cart.items = [];
                    cart.coupon = undefined;

                    await cart.save({ session });

                }

                order.paymentStatus = "paid";
                order.status = "confirmed";
                order.paidAt = new Date();
                order.transactionId = paymentIntent.id;

                await order.save({ session });

                await session.commitTransaction();

                const user = await User.findById(order.user);

                if (user) {

                    try {

                        await sendEmail(
                            user.email,
                            "Order Confirmation",
                            orderConfirmationEmail(order, user)
                        );

                    } catch (emailError) {

                        console.error(
                            "Failed to send order confirmation email:",
                            emailError
                        );

                    }

                }

                return res.status(200).json({
                    received: true
                });

            } catch (error) {

                await session.abortTransaction();
                throw error;

            } finally {

                await session.endSession();

            }

        }

        return res.status(200).json({
            received: true
        });

    } catch (error) {

        next(error);

    }

};

const createOrder = async (req, res, next) => {
    try {

        const { paymentMethod } = req.body;

        if (paymentMethod === "cash") {
            return await createCashOrder(req, res, next);
        }

        if (paymentMethod === "stripe") {
            return await createStripeOrder(req, res, next);
        }

        return next(new AppError(MESSAGES.INVALID_PAYMENT_METHOD, 400));

    } catch (error) {
        next(error);
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
            

            const shouldRestoreStock =
                order.paymentMethod === "cash" ||
                order.paymentStatus === "paid";

            if (
                order.paymentMethod === "stripe" &&
                order.paymentStatus === "paid"
            ) {

                await stripe.refunds.create({
                    payment_intent: order.transactionId
                });

                order.paymentStatus = "refunded";

            }

            if (shouldRestoreStock) {

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
    stripeWebhook,
    createOrder,
    cancelOrder
};
