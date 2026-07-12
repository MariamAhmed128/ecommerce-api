
const User = require("../models/User.model");
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../utils/uploadToCloudinary");
const bcrypt = require("bcryptjs");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");


const addUser = async (req, res, next) => {
    try {

        const { username, email, password, phone, role } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new AppError(MESSAGES.EMAIL_ALREADY_EXISTS, 409);
        }

        const user = await User.create({
            username,
            email,
            password,
            phone,
            role: role || "customer",
            isVerified: true
        });

        return res.status(201).json({
            success: true,
            message: MESSAGES.USER_ADDED_SUCCESSFULLY,
            data: user
        });

    
    } catch (error) {

    console.error(error);

    next(error);

}
};



const getUsers = async (req, res, next) => {
    try {

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.role) {
            filter.role = req.query.role;
        }

        if (req.query.isVerified !== undefined) {
            filter.isVerified = req.query.isVerified === "true";
        }

        if (req.query.search) {

            const searchRegex = new RegExp(req.query.search, "i");

            filter.$or = [
                { username: searchRegex },
                { email: searchRegex }
            ];

        }

        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            User.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: MESSAGES.USERS_RETRIEVED_SUCCESSFULLY,
            data: users,
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
                currentPage: page,
                limit
            }
        });

    } catch (error) {

    console.error(error);

    next(error);

}
};



const getUserById = async (req, res, next) => {
    try {

        const id = req.params.id;

        const user = await User.findById(id);

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.USER_RETRIEVED_SUCCESSFULLY,
            data: user
        });

    } catch (error) {

    console.error(error);

    next(error);

}
};


// const updateUser = async (req, res, next) => {
//     try {

//         const id = req.params.id;

//         const isOwner = req.user.id === id;
//         const isAdmin = req.user.role === "admin";

//         if (!isOwner && !isAdmin) {
//             throw new AppError(MESSAGES.NOT_ALLOWED_UPDATE_USER, 403);
//         }

//         const user = await User.findById(id);

//         if (!user) {
//             throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
//         }

//         let allowedUpdates = ["username", "phone", "addresses"];

//         if (isAdmin) {
//             allowedUpdates.push("role", "isVerified");
//         }

//         const updates = Object.keys(req.body);

//         if (updates.length === 0 && !req.file) {
//             throw new AppError(MESSAGES.NO_DATA_TO_UPDATE, 400);
//         }

//         const isValidOperation = updates.every((field) =>
//             allowedUpdates.includes(field)
//         );

//         if (!isValidOperation) {
//             throw new AppError(MESSAGES.INVALID_UPDATE_FIELDS, 400);
//         }

//         updates.forEach((field) => {
//             user[field] = req.body[field];
//         });

//         if (req.file) {

//             const uploaded = await uploadToCloudinary(
//                 req.file.buffer,
//                 "ecommerce/users"
//             );

//             if (user.avatar && user.avatar.publicId) {
//                 await deleteFromCloudinary(user.avatar.publicId);
//             }

//             user.avatar = {
//                 url: uploaded.secure_url,
//                 publicId: uploaded.public_id
//             };
//         }

//         await user.save();

//         return res.status(200).json({
//             success: true,
//             message: MESSAGES.USER_UPDATED_SUCCESSFULLY,
//             data: user
//         });

//     } catch (error) {

//     console.error(error);

//     next(error);

// }
// };
const updateUser = async (req, res, next) => {

    let user;
    let oldPublicId;
    let newPublicId;

    try {

        const id = req.params.id;

        const isOwner = req.user.id === id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            throw new AppError(MESSAGES.NOT_ALLOWED_UPDATE_USER, 403);
        }

        user = await User.findById(id);

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
        }

        oldPublicId = user.avatar?.publicId;

        let allowedUpdates = ["username", "phone", "addresses"];

        if (isAdmin) {
            allowedUpdates.push("role", "isVerified");
        }

        const updates = Object.keys(req.body);

        if (updates.length === 0 && !req.file) {
            throw new AppError(MESSAGES.NO_DATA_TO_UPDATE, 400);
        }

        const isValidOperation = updates.every((field) =>
            allowedUpdates.includes(field)
        );

        if (!isValidOperation) {
            throw new AppError(MESSAGES.INVALID_UPDATE_FIELDS, 400);
        }

        updates.forEach((field) => {
            user[field] = req.body[field];
        });

        if (req.file) {

            // ارفع الصورة الجديدة الأول
            const uploaded = await uploadToCloudinary(
                req.file.buffer,
                "ecommerce/users"
            );

            newPublicId = uploaded.public_id;

            // خزن بيانات الصورة الجديدة
            user.avatar = {
                url: uploaded.secure_url,
                publicId: uploaded.public_id
            };
        }

        // احفظ البيانات أولاً
        await user.save();

        // بعد نجاح الحفظ احذف الصورة القديمة
        if (req.file && oldPublicId) {
            try {
                await deleteFromCloudinary(oldPublicId);
            } catch (err) {
                console.error("Failed to delete old avatar:", err);
            }
        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.USER_UPDATED_SUCCESSFULLY,
            data: user
        });

    } catch (error) {

        // لو رفعنا صورة جديدة لكن الحفظ فشل، امسح الصورة الجديدة
        if (newPublicId) {
            try {
                await deleteFromCloudinary(newPublicId);
            } catch (err) {
                console.error("Failed to delete new avatar:", err);
            }
        }

        console.error(error);

        return next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {

        const id = req.params.id;

        const user = await User.findById(id);

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
        }

        if (user.avatar && user.avatar.publicId) {
            await deleteFromCloudinary(user.avatar.publicId);
        }

        await user.deleteOne();

        return res.status(200).json({
            success: true,
            message: MESSAGES.USER_DELETED_SUCCESSFULLY
        });

    } catch (error) {

    console.error(error);

    next(error);

}
};




module.exports = {
    addUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser
};
































































