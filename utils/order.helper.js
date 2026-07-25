const Cart = require("../models/Cart.model");
const Product = require("../models/Product.model");

const { validateProduct } = require("./cart.helper");

const AppError = require("./appError");
const MESSAGES = require("./messages");




const calculateOrderTotals = (items, coupon = {}) => {

    const subtotal = items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);

    let discount = 0;

    if (coupon.code) {

        if (coupon.discountType === "percentage") {

            discount = subtotal * (coupon.discountValue / 100);

        } else {

            discount = coupon.discountValue;

        }

    }

    const shippingFee =
        subtotal >= 1000
            ? 0
            : 50;

    const tax = subtotal * 0.14;

    const totalPrice =
        subtotal +
        shippingFee +
        tax -
        discount;

    return {
        subtotal,
        discount,
        shippingFee,
        tax,
        totalPrice
    };

};


const buildOrderFilter = (query) => {

    const {
        status,
        paymentStatus,
        paymentMethod,
        startDate,
        endDate
    } = query;

    const filter = {};

    if (status) {
        filter.status = status;
    }

    if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
        filter.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {

        filter.createdAt = {};

        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
            filter.createdAt.$lte = new Date(endDate);
        }

    }

    return filter;

};




const getOrderSortField = (sort) => {

    const allowedSortFields = [
        "createdAt",
        "totalPrice",
        "subtotal",
        "status",
        "paymentStatus"
    ];

    return allowedSortFields.includes(sort)
        ? sort
        : "createdAt";

};

const updateOrderFields = (
    order,
    status,
    adminNote
) => {

    order.status = status;

    if (adminNote !== undefined) {
        order.adminNote = adminNote;
    }

    if (status === "delivered") {

        order.deliveredAt = new Date();

        if (order.paymentMethod === "cash") {
            order.paymentStatus = "paid";
            order.paidAt = new Date();
        }

    }

    if (status === "cancelled") {
        order.cancelledAt = new Date();
    }

};





const buildOrderFromCart = async (
    userId,
    session
) => {

    const cart = await Cart.findOne({
        user: userId
    }).session(session);

    if (!cart || !cart.items.length) {
        throw new AppError(
            MESSAGES.CART_NOT_FOUND_OR_NO_ITEMS_TO_ORDER,
            404
        );
    }

    const productsToUpdate = [];
    const orderItems = [];

    for (const item of cart.items) {

        const product = await Product.findById(item.product)
            .session(session);

        validateProduct(product, item.quantity);

        productsToUpdate.push({
            product,
            quantity: item.quantity
        });

        orderItems.push({
            product: product._id,
            name: product.name,
            image: product.images?.[0]?.url,
            price: product.price,
            quantity: item.quantity
        });

    }

    const {
        subtotal,
        discount,
        shippingFee,
        tax,
        totalPrice
    } = calculateOrderTotals(
        orderItems,
        cart.coupon
    );

    return {
        cart,
        productsToUpdate,
        orderItems,
        subtotal,
        discount,
        shippingFee,
        tax,
        totalPrice
    };

};

const completeStripeOrder = async (
    order,
    paymentIntent,
    session
) => {

    await Product.bulkWrite(
        order.items.map(item => ({
            updateOne: {
                filter: {
                    _id: item.product
                },
                update: {
                    $inc: {
                        stock: -item.quantity
                    }
                }
            }
        })),
        { session }
    );

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

};


const refundStripeOrder = async (
    order,
    paymentIntent,
    stripe,
    session
) => {

    await stripe.refunds.create({
        payment_intent: paymentIntent.id
    });

    order.status = "cancelled";
    order.paymentStatus = "refunded";
    order.cancelledAt = new Date();

    await order.save({ session });

};


const markStripePaymentFailed = async (
    order,
    session
) => {

    order.paymentStatus = "failed";
    order.status = "cancelled";
    order.cancelledAt = new Date();

    await order.save({ session });

};


module.exports = {
    calculateOrderTotals,
    buildOrderFilter,
    getOrderSortField,
    updateOrderFields,
    buildOrderFromCart,
    completeStripeOrder,
    refundStripeOrder,
    markStripePaymentFailed
};
