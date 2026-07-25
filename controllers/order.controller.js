const mongoose = require("mongoose");
const connectDB = require("../DB/mongoose");

const stripe = require("../config/stripe");

const Order = require("../models/Order.model");
const Product = require("../models/Product.model");

const User = require("../models/User.model");

const sendEmail = require("../utils/emails/sendEmail");

const orderConfirmationEmail = require("../utils/emails/orderConfirmationEmail");


const {
    validateProduct
} = require("../utils/cart.helper");


const {
    buildOrderFromCart,
    completeStripeOrder,
    refundStripeOrder,
    markStripePaymentFailed
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


    try {

        session.startTransaction();

        const { shippingAddress } = req.body;

        const {
            cart,
            productsToUpdate,
            orderItems,
            subtotal,
            discount,
            shippingFee,
            tax,
            totalPrice
        } = await buildOrderFromCart(
            req.user.id,
            session
        );
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

        await Product.bulkWrite(
            productsToUpdate.map(item => ({
                updateOne: {
                    filter: { _id: item.product._id },
                    update: {
                        $inc: {
                            stock: -item.quantity
                        }
                    }
                }
            })),
            { session }
        );

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

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error(error);

        return next(error);

    } finally {

        await session.endSession();

    }
};



const createStripeOrder = async (req, res, next) => {

    const session = await mongoose.startSession();


    try {
        session.startTransaction();


        const { shippingAddress } = req.body;

        const {
            orderItems,
            subtotal,
            discount,
            shippingFee,
            tax,
            totalPrice
        } = await buildOrderFromCart(
            req.user.id,
            session
        );

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

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error(error);

        return next(error);

    } finally {

        await session.endSession();

    }

};



const stripeWebhook = async (req, res, next) => {

    try {

        await connectDB();
        

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
                await markStripePaymentFailed(
                    order,
                    session
                );

                await session.commitTransaction();

                return res.status(200).json({
                    received: true
                });

            } catch (error) {

                if (session.inTransaction()) {
                    await session.abortTransaction();
                }

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


                    await refundStripeOrder(
                        order,
                        paymentIntent,
                        stripe,
                        session
                    );

                    await session.commitTransaction();

                    return res.status(200).json({
                        received: true
                    });

                }

                await completeStripeOrder(
                    order,
                    paymentIntent,
                    session
                );
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

            }  catch (error) {

                if (session.inTransaction()) {
                    await session.abortTransaction();
                }

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



    try {

             session.startTransaction();

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

                await Product.bulkWrite(
                    productsToRestore.map(item => ({
                        updateOne: {
                            filter: { _id: item.product._id },
                            update: {
                                $inc: {
                                    stock: item.quantity
                                }
                            }
                        }
                    })),
                    { session }
                );

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

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

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
