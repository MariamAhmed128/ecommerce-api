const express = require("express");

const router = express.Router();

const orderController = require("../controllers/order.controller");

const { auth } = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const {
    createOrderValidation
} = require("../validation/order.validation");


// == User Routes

// Get My Orders
router.get(
    "/my",
    auth,
    orderController.getMyOrders
);

// Get Single Order
router.get(
    "/my/:id",
    auth,
    validateObjectId(),
    orderController.getMyOrderById
);

// Create Order
router.post(
    "/",
    auth,
    validate(createOrderValidation),
    orderController.createOrder
);

// Cancel Order
router.patch(
    "/my/:id/cancel",
    auth,
    validateObjectId(),
    orderController.cancelOrder
);

module.exports = router;