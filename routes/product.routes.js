const express = require("express");

const router = express.Router();

const productController = require("../controllers/product.controller");

const { auth, admin } = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const upload = require("../middleware/upload.middleware");

const {
    createProductValidation,
    updateProductValidation,
    reviewValidation
} = require("../validation/product.validation");

// ==================== Public Routes ====================

// Get all products
router.get(
    "/",
    productController.getProducts
);

// Advanced search
router.get(
    "/search",
    productController.getProducts
);

// Get single product
router.get(
    "/:id",
    validateObjectId(),
    productController.getProductById
);

// Get product reviews
router.get(
    "/:id/reviews",
    validateObjectId(),
    productController.getReviews
);

// ==================== Admin Routes ====================

// Create product
router.post(
    "/",
    auth,
    admin,
    upload.array("images", 5),
    validate(createProductValidation),
    productController.addProduct
);

// Update product
router.put(
    "/update/:id",
    auth,
    admin,
    validateObjectId(),
    upload.array("images", 5),
    validate(updateProductValidation),
    productController.updateProduct
);

// Delete product
router.delete(
    "/:id",
    auth,
    admin,
    validateObjectId(),
    productController.deleteProduct
);

// ==================== User Routes ====================

// Add review
router.post(
    "/:id/reviews",
    auth,
    validateObjectId(),
    validate(reviewValidation),
    productController.addReview
);

// Delete review (Owner or Admin)
router.delete(
    "/:id/reviews/:rid",
    auth,
    validateObjectId("id"),
    validateObjectId("rid"),
    productController.deleteReview
);

module.exports = router;