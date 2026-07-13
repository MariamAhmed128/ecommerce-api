const Product = require("../models/Product.model");
const AppError = require("./appError");
const MESSAGES = require("./messages");


// ================= Normalize Tags =================
const normalizeTags = (tags) => {

    if (typeof tags !== "string") {
        return tags;
    }

    return tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

};


// ================= Validate Discount Price =================
const validateDiscountPrice = (price, discountPrice) => {

    if (
        Number(discountPrice) > 0 &&
        Number(discountPrice) >= Number(price)
    ) {
        throw new AppError(
            MESSAGES.INVALID_DISCOUNT_PRICE,
            400
        );
    }

};


// ================= Check SKU =================
const checkSkuAvailability = async (sku, productId = null) => {

    const query = { sku };

    if (productId) {
        query._id = { $ne: productId };
    }

    const existSku = await Product.findOne(query);

    if (existSku) {
        throw new AppError(
            MESSAGES.SKU_ALREADY_EXISTS,
            409
        );
    }

};


// ================= Build Product Filter =================
const buildProductFilter = (query) => {

    const filter = {
        isActive: true
    };

    if (query.category) {
        filter.category = query.category.toLowerCase();
    }

    if (query.brand) {
        filter.brand = query.brand;
    }

    if (query.tag) {
        filter.tags = query.tag;
    }

    if (query.subcategory) {
        filter.subcategory = query.subcategory;
    }

    if (query.featured !== undefined) {
        filter.featured = query.featured === "true";
    }

    if (query.minPrice || query.maxPrice) {

        filter.price = {};

        if (query.minPrice) {
            filter.price.$gte = Number(query.minPrice);
        }

        if (query.maxPrice) {
            filter.price.$lte = Number(query.maxPrice);
        }

    }

    const keyword = query.keyword?.trim();

    if (keyword) {
        filter.$text = {
            $search: keyword
        };
    }

    return filter;

};


// ================= Build Product Sort =================
const buildProductSort = (sortBy) => {

    switch (sortBy) {

        case "price":
            return { price: 1 };

        case "-price":
            return { price: -1 };

        case "rating":
            return { averageRating: -1 };

        case "oldest":
            return { createdAt: 1 };

        case "newest":
        default:
            return { createdAt: -1 };

    }

};


module.exports = {
    normalizeTags,
    validateDiscountPrice,
    checkSkuAvailability,
    buildProductFilter,
    buildProductSort
};