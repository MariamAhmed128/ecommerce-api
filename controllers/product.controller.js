const Product = require("../models/Product.model");
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../utils/uploadToCloudinary");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");

// 1-
const addProduct = async (req, res, next) => {

    let images = [];
    const uploadedImages = [];

    try {

        const existSku = await Product.findOne({
            sku: req.body.sku
        });
        // Check SKU مينفعش منتجين بنفس sku
        if (existSku) {
            throw new AppError(MESSAGES.SKU_ALREADY_EXISTS, 409);
        }

        if (!req.files || req.files.length === 0) {
            throw new AppError(MESSAGES.PRODUCT_IMAGE_REQUIRED, 400);
        }
        // Check discount price // طمني الاول فعلا ان الديسكونت ال انت عامله ده مش صفر ولا حتي اكبر من السعر الحقيقي
        if (
            req.body.discountPrice > 0 &&
            Number(req.body.discountPrice) >= Number(req.body.price)
        ) {
            throw new AppError(MESSAGES.INVALID_DISCOUNT_PRICE, 400);
        }
        // مونجوديبي مستنيه ارراي من اسماء التاجس ال المستخدم هيبعتلها فالاتشيك ده ضروري علشان حتي لو بعت استرج
// نحولها لاراي كل ال فيها قيم فعلا مفيش حاجه فيهم بتطلع الفلتر بولين بفولس
        if (typeof req.body.tags === "string") {
            req.body.tags = req.body.tags
                .split(",") //بتقسم الاسترينج عند كل فصلة(بس لسه فيه مسافات )
                .map((tag) => tag.trim())   // هتخلص من المسافات الزيادة
                .filter(Boolean);
        }

        try {

            images = await Promise.all(
                req.files.map(async (file) => {

                    const uploaded = await uploadToCloudinary(
                        file.buffer,
                        "ecommerce/products"
                    );

                    uploadedImages.push(uploaded.public_id);

                    return {
                        url: uploaded.secure_url,
                        publicId: uploaded.public_id
                    };
                })
            );

        } catch (error) {

            await Promise.all(
                uploadedImages.map((publicId) =>
                    deleteFromCloudinary(publicId)
                )
            );

            uploadedImages.length = 0;

            throw error;
        }

        const product = await Product.create({
            ...req.body,
            images,
            createdBy: req.user.id
        });

        return res.status(201).json({
            success: true,
            message: MESSAGES.PRODUCT_ADDED_SUCCESSFULLY,
            data: product
        });

    } catch (error) {

    if (uploadedImages.length > 0) {
        await Promise.all(
            uploadedImages.map((publicId) =>
                deleteFromCloudinary(publicId)
            )
        );
    }

    console.error(error);

    next(error);

}
};

// ===========================================================
// 2-
const getProducts = async (req, res, next) => {
    try {

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filter = {
            isActive: true
        };

        if (req.query.category) {
            filter.category = req.query.category.toLowerCase();
        }

        if (req.query.brand) {
            filter.brand = req.query.brand;
        }

        if (req.query.tag) {
            filter.tags = req.query.tag;
        }

        if (req.query.subcategory) {
            filter.subcategory = req.query.subcategory;
        }

        if (req.query.featured !== undefined) {
            filter.featured = req.query.featured === "true";
        }

        if (req.query.minPrice || req.query.maxPrice) {

            filter.price = {};

            if (req.query.minPrice) {
                filter.price.$gte = Number(req.query.minPrice);
            }

            if (req.query.maxPrice) {
                filter.price.$lte = Number(req.query.maxPrice);
            }

        }

        const keyword = req.query.keyword?.trim();

        if (keyword) {
            filter.$text = {
                $search: keyword
            };
        }

        let sort = { createdAt: -1 };

        switch (req.query.sort) {

            case "price":
                sort = { price: 1 };
                break;

            case "-price":
                sort = { price: -1 };
                break;

            case "rating":
                sort = { averageRating: -1 };
                break;

            case "newest":
                sort = { createdAt: -1 };
                break;

            case "oldest":
                sort = { createdAt: 1 };
                break;
        }

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
        // ده كمان بيعتبر أفضل من ناحية الأمان، لأنك مبتكشفش للمستخدم إن فيه منتج موجود لكنه مخفي.
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
// 4-
const updateProduct = async (req, res, next) => {

    const uploadedImages = [];

    try {

        const id = req.params.id;

        const product = await Product.findById(id);

        if (!product) {
            throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
        }

        const updates = Object.keys(req.body);

        if (updates.length === 0 && (!req.files || req.files.length === 0)) {
            throw new AppError(MESSAGES.NO_DATA_TO_UPDATE, 400);
        }
            // لازم اطمن ع (SKU,discount price, tags to array) برضو فالتعديل
        // Check SKU if updated
        if (req.body.sku && req.body.sku !== product.sku) {

            const existSku = await Product.findOne({
                sku: req.body.sku
            });

            if (existSku) {
                throw new AppError(MESSAGES.SKU_ALREADY_EXISTS, 409);
            }
        }

        // Check discount price
        const price = req.body.price ?? product.price;
        const discountPrice = req.body.discountPrice ?? product.discountPrice;

        if (
            discountPrice > 0 &&
            Number(discountPrice) >= Number(price)
        ) {
            throw new AppError(MESSAGES.INVALID_DISCOUNT_PRICE, 400);
        }

        // Convert tags to array
        if (typeof req.body.tags === "string") {
            req.body.tags = req.body.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);
        }

        // Update fields
        updates.forEach((field) => {
            product[field] = req.body[field];
        });

        // Upload new images
        if (req.files && req.files.length > 0) {

            let images = [];

            try {

                images = await Promise.all(
                    req.files.map(async (file) => {

                        const uploaded = await uploadToCloudinary(
                            file.buffer,
                            "ecommerce/products"
                        );

                        uploadedImages.push(uploaded.public_id);

                        return {
                            url: uploaded.secure_url,
                            publicId: uploaded.public_id
                        };
                    })
                );

            } catch (error) {

                await Promise.all(
                    uploadedImages.map((publicId) =>
                        deleteFromCloudinary(publicId)
                    )
                );

                uploadedImages.length = 0;

                throw error;
            }

            // Delete old images after successful upload
            if (product.images.length > 0) {
                await Promise.all(
                    product.images.map((image) =>
                        deleteFromCloudinary(image.publicId)
                    )
                );
            }

            product.images = images;
        }

        await product.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.PRODUCT_UPDATED_SUCCESSFULLY,
            data: product
        });

    } catch (error) {

    if (uploadedImages.length > 0) {
        await Promise.all(
            uploadedImages.map((publicId) =>
                deleteFromCloudinary(publicId)
            )
        );

        uploadedImages.length = 0;
    }

    console.error(error);

    next(error);

}
};
// ====
// 5-
// الليدر قالت الصح نغير الاكتف لفولس لكن مش نمسحه فعلا من الداتا بيز
const deleteProduct = async (req, res, next) => {
    try {

        const id = req.params.id;

        const product = await Product.findById(id);

        if (!product) {
            throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
        }
            // بس برضو البدي اف طالب نمسح كل الصور بتاعة المنتج من كلاودناري برضو ده
// افضل مش هشغل مساحه تخزين عالفاضي المنتج خلاص بطل يظهر للناس
        // Delete all images from Cloudinary
        if (product.images.length > 0) {
            await Promise.all(
                product.images.map((image) =>
                    deleteFromCloudinary(image.publicId)
                )
            );
        }

        // Soft Delete
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

        const id = req.params.id;

        const product = await Product.findById(id);

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

        const id = req.params.id;
        const reviewId = req.params.rid;

        const product = await Product.findById(id);

        if (!product || !product.isActive) {
            throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
        }

        const reviewIndex = product.reviews.findIndex(
            (review) => review._id.toString() === reviewId
        );

        if (reviewIndex === -1) {
            throw new AppError(MESSAGES.REVIEW_NOT_FOUND, 404);
        }

        const review = product.reviews[reviewIndex];

        const isOwner = review.user.toString() === req.user.id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            throw new AppError(MESSAGES.NOT_ALLOWED_DELETE_REVIEW, 403);
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

        const id = req.params.id;

        const product = await Product.findById(id)
            .populate("reviews.user", "username avatar");   //كويس برضو علشان يجي مع الريفيو صاحب الريفيو ال كتبها

        if (!product || !product.isActive) {
            throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
        }
                //مش محتاجه اعمل حالة اف ان لو مفيش ريفيوهات لسه لان ده مش خطأ ده عادي
// ارراي الريفيو لسه فاضية وتوصل فالريسبونس فاضية وخلاص
        return res.status(200).json({
            success: true,
            message: MESSAGES.REVIEWS_RETRIEVED_SUCCESSFULLY,
            data: product.reviews,
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