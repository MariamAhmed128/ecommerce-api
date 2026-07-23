const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: ["returned"],
    cancelled: [],
    returned: []
};

module.exports = allowedTransitions;