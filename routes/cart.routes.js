const express = require("express");

const router = express.Router();

const cartController = require("../controllers/cart.controller");

const { auth } = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");

const {
    addItemValidation,
    updateItemValidation,
    removeItemValidation,
    applyCouponValidation
} = require("../validation/cart.validation");
// ==================== User Routes ====================

// Get Cart
router.get(
    "/",
    auth,
    cartController.getCart
);

// Add Item
router.post(
    "/items",
    auth,
    validate(addItemValidation),
    cartController.addItem
);

// Update Item Quantity
router.patch(
    "/items",
    auth,
    validate(updateItemValidation),
    cartController.updateItemQuantity
);

// Remove Item
router.delete(
    "/items/:productId",
    auth,
    validate(removeItemValidation, "params"),
    cartController.removeItem
);

// Apply Coupon
router.post(
    "/coupon",
    auth,
    validate(applyCouponValidation),
    cartController.applyCoupon
);

// Remove Coupon
router.delete(
    "/coupon",
    auth,
    cartController.removeCoupon
);

// Clear Cart
router.delete(
    "/clear",
    auth,
    cartController.clearCart
);

module.exports = router;