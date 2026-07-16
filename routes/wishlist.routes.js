const express = require("express");

const router = express.Router();

const wishlistController = require("../controllers/wishlist.controller");

const { auth } = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");

const {
    addToWishlistValidation,
    removeFromWishlistValidation
} = require("../validation/wishlist.validation");


// ================= User Routes =================


// Get My Wishlist

router.get(
    "/my",
    auth,
    wishlistController.getMyWishlist
);


// Add Product

router.post(
    "/add/:productId",
    auth,
    validate(addToWishlistValidation, "params"),
    wishlistController.addToWishlist
);

// Remove Product

router.delete(
    "/remove/:productId",
    auth,
    validate(removeFromWishlistValidation, "params"),
    wishlistController.removeFromWishlist
);

// Clear Wishlist

router.delete(
    "/clear",
    auth,
    wishlistController.clearWishlist
);


module.exports = router;