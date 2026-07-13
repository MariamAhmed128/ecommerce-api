const Product = require("../models/Product.model");

const {
    uploadProductImages,
    deleteProductImages
} = require("../utils/productImageManager");

const {
    normalizeTags,
    validateDiscountPrice,
    checkSkuAvailability,
    buildProductFilter,
    buildProductSort
} = require("../utils/productHelpers");

const getPagination = require("../utils/pagination");
const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");

// 1-
const addProduct = async (req, res, next) => {

    const uploadedImagePublicIds = [];

    try {

        // Check SKU
        await checkSkuAvailability(req.body.sku);

        // Check Images
        if (!req.files?.length) {
            throw new AppError(
                MESSAGES.PRODUCT_IMAGE_REQUIRED,
                400
            );
        }

        // Normalize Tags
        req.body.tags = normalizeTags(req.body.tags);

        // Validate Discount Price
        validateDiscountPrice(
            req.body.price,
            req.body.discountPrice
        );

        // Upload Images
        const {
            uploadedImages,
            uploadedPublicIds
        } = await uploadProductImages(req.files);

        uploadedImagePublicIds.push(...uploadedPublicIds);

        // Create Product
        const product = await Product.create({
            ...req.body,
            images: uploadedImages,
            createdBy: req.user.id
        });

        return res.status(201).json({
            success: true,
            message: MESSAGES.PRODUCT_ADDED_SUCCESSFULLY,
            data: product
        });

    } catch (error) {

        // Rollback Uploaded Images
        await deleteProductImages(uploadedImagePublicIds);

        console.error(error);

        next(error);

    }

};

// ===
// 2-

const getProducts = async (req, res, next) => {

    try {

        const {
            page,
            limit,
            skip
        } = getPagination(req.query);

        const filter = buildProductFilter(req.query);
        const sort = buildProductSort(req.query.sort);

        const [products, totalProducts] = await Promise.all([

            Product.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit),

            Product.countDocuments(filter)

        ]);

        return res.status(200).json({
            success: true,
            message: MESSAGES.PRODUCTS_RETRIEVED_SUCCESSFULLY,
            data: products,
            pagination: {
                totalProducts,
                totalPages: Math.ceil(totalProducts / limit),
                currentPage: page,
                limit
            }
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};

// ====
// 3-

const getProductById = async (req, res, next) => {
    try {

        const id = req.params.id;

        const product = await Product.findById(id);
        if (!product || !product.isActive) {
            throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.PRODUCT_RETRIEVED_SUCCESSFULLY,
            data: product
        });

    } catch (error) {

    console.error(error);

    next(error);

}
};

// ====
//-4

const updateProduct = async (req, res, next) => {

    const uploadedImagePublicIds = [];
    const imagesToDelete = [];

    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            throw new AppError(
                MESSAGES.PRODUCT_NOT_FOUND,
                404
            );
        }

        const allowedFields = [
            "name",
            "shortDescription",
            "description",
            "price",
            "discountPrice",
            "stock",
            "sku",
            "category",
            "subcategory",
            "brand",
            "featured",
            "isActive"
        ];

        const updates = {};

        allowedFields.forEach(field => {

            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }

        });

        const hasNewImages = req.files?.length > 0;
        const hasDeletedImages = !!req.body.imagesToDelete;

        if (
            Object.keys(updates).length === 0 &&
            req.body.tags === undefined &&
            !hasNewImages &&
            !hasDeletedImages
        ) {
            throw new AppError(
                MESSAGES.NO_DATA_TO_UPDATE,
                400
            );
        }

        // Check SKU
        if (updates.sku && updates.sku !== product.sku) {

            await checkSkuAvailability(
                updates.sku,
                product._id
            );

        }

        // Normalize Tags
        if (req.body.tags !== undefined) {
            updates.tags = normalizeTags(req.body.tags);
        }

        // Validate Discount Price
        const currentPrice = updates.price ?? product.price;
        const currentDiscountPrice =
            updates.discountPrice ?? product.discountPrice;

        validateDiscountPrice(
            currentPrice,
            currentDiscountPrice
        );

        // Update Product Fields
        Object.assign(product, updates);

        // Upload New Images
        if (hasNewImages) {

            const {
                uploadedImages,
                uploadedPublicIds
            } = await uploadProductImages(req.files);

            uploadedImagePublicIds.push(...uploadedPublicIds);

            product.images.push(...uploadedImages);

        }

        // Delete Selected Images
        if (hasDeletedImages) {

            let idsToDelete;

            try {

                idsToDelete = JSON.parse(req.body.imagesToDelete);

            } catch {

                throw new AppError(
                    MESSAGES.INVALID_IMAGES_ARRAY,
                    400
                );

            }

            if (!Array.isArray(idsToDelete)) {

                throw new AppError(
                    MESSAGES.INVALID_IMAGES_ARRAY,
                    400
                );

            }

            const validIds = idsToDelete.filter(id =>
                product.images.some(image => image.publicId === id)
            );

            if (validIds.length !== idsToDelete.length) {

                throw new AppError(
                    MESSAGES.INVALID_IMAGES_ARRAY,
                    400
                );

            }

            imagesToDelete.push(...validIds);

            product.images = product.images.filter(
                image => !validIds.includes(image.publicId)
            );

        }

        // Validate Final Product
        await product.validate();

        // Product must have at least one image
        if (product.images.length === 0) {

            throw new AppError(
                MESSAGES.PRODUCT_IMAGE_REQUIRED,
                400
            );

        }

        await product.save();

        // Delete Images From Cloudinary
        await deleteProductImages(imagesToDelete);

        return res.status(200).json({
            success: true,
            message: MESSAGES.PRODUCT_UPDATED_SUCCESSFULLY,
            data: product
        });

    } catch (error) {

        // Rollback Uploaded Images
        await deleteProductImages(uploadedImagePublicIds);

        console.error(error);

        next(error);

    }

};

// ====
// 5-

const deleteProduct = async (req, res, next) => {

    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            throw new AppError(
                MESSAGES.PRODUCT_NOT_FOUND,
                404
            );
        }

        // Soft Delete Only
        product.isActive = false;

        await product.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.PRODUCT_DELETED_SUCCESSFULLY
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};

// ====

// 6-
const addReview = async (req, res, next) => {

    try {

        const product = await Product.findById(req.params.id);

        if (!product || !product.isActive) {
            throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
        }

        const { rating, comment } = req.body;

        const alreadyReviewed = product.reviews.some(
            (review) => review.user.toString() === req.user.id
        );

        if (alreadyReviewed) {
            throw new AppError(MESSAGES.ALREADY_REVIEWED, 400);
        }

        product.reviews.push({
            user: req.user.id,
            rating,
            comment
        });

        product.calculateAverageRating();

        await product.save();

        return res.status(201).json({
            success: true,
            message: MESSAGES.REVIEW_ADDED_SUCCESSFULLY,
            data: product.reviews[product.reviews.length - 1]
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};

// ====
// 7-

const deleteReview = async (req, res, next) => {

    try {

        const product = await Product.findById(req.params.id);

        if (!product || !product.isActive) {
            throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
        }

        const reviewIndex = product.reviews.findIndex(
            review => review._id.toString() === req.params.rid
        );

        if (reviewIndex === -1) {
            throw new AppError(MESSAGES.REVIEW_NOT_FOUND, 404);
        }

        const review = product.reviews[reviewIndex];

        const isOwner = review.user.toString() === req.user.id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            throw new AppError(
                MESSAGES.NOT_ALLOWED_DELETE_REVIEW,
                403
            );
        }

        product.reviews.splice(reviewIndex, 1);

        product.calculateAverageRating();

        await product.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.REVIEW_DELETED_SUCCESSFULLY
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};

// ====

// 8-
const getReviews = async (req, res, next) => {

    try {

        const product = await Product.findById(req.params.id)
            .populate("reviews.user", "username avatar");

        if (!product || !product.isActive) {
            throw new AppError(
                MESSAGES.PRODUCT_NOT_FOUND,
                404
            );
        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.REVIEWS_RETRIEVED_SUCCESSFULLY,
            totalReviews: product.reviews.length,
            averageRating: product.averageRating,
            data: product.reviews
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};


module.exports = {
    addProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    addReview,
    deleteReview,
    getReviews
};