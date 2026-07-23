const calculateOrderTotals = (cart) => {

    const subtotal = cart.subtotal;

    const discount = cart.discountAmount;

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

module.exports = {
    calculateOrderTotals,
    buildOrderFilter,
    getOrderSortField,
    updateOrderFields
};
