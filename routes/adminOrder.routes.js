const express = require("express");
const router = express.Router();

const adminOrderController = require("../controllers/adminOrder.controller");

const { auth, admin } = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const {
    updateOrderStatusValidation
} = require("../validation/order.validation");


// == Admin Routes

// Dashboard
router.get(
    "/admin/dashboard",
    auth,
    admin,
    adminOrderController.getDashboard
);

// Get All Active Carts
router.get(
    "/admin/carts",
    auth,
    admin,
    adminOrderController.getActiveCarts
);

// Get All Orders
router.get(
    "/admin",
    auth,
    admin,
    adminOrderController.getAllOrders
);

// Get Any Order (Admin)
router.get(
    "/admin/:id",
    auth,
    admin,
    validateObjectId(),
    adminOrderController.getAdminOrderById
);

// Update Order Status (Admin)
router.patch(
    "/admin/:id/status",
    auth,
    admin,
    validateObjectId(),
    validate(updateOrderStatusValidation),
    adminOrderController.updateOrderStatus
);



module.exports = router;