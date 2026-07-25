const User = require("../models/User.model");

const getPagination = require("../utils/pagination");

const {
    buildUserFilter,
    getAllowedUserUpdates,
    validateAllowedFields
} = require("../utils/userHelpers");

const {
    uploadUserAvatar,
    deleteUserAvatar,
    safeDeleteUserAvatar
} = require("../utils/userImageManager");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");


// 1- Add User

const addUser = async (req, res, next) => {

    let newPublicId;

    try {

        const { username, email, password, phone, role } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new AppError(
                MESSAGES.EMAIL_ALREADY_EXISTS,
                409
            );
        }

        const userData = {
            username,
            email,
            password,
            phone,
            role: role || "customer",
            isVerified: true
        };

        if (req.file) {

            const avatar = await uploadUserAvatar(req.file);

            newPublicId = avatar.publicId;

            userData.avatar = avatar;

        }

        const user = await User.create(userData);

        return res.status(201).json({
            success: true,
            message: MESSAGES.USER_ADDED_SUCCESSFULLY,
            data: user
        });

    } catch (error) {

        if (newPublicId) {
            await deleteUserAvatarSafely(newPublicId);
        }

        console.error(error);

        next(error);

    }

};

// 2-
const getUsers = async (req, res, next) => {
    try {

        const {
            page,
            limit,
            skip
        } = getPagination(req.query);

        const filter = buildUserFilter(req.query);

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


// 3-
const getUserById = async (req, res, next) => {
    try {

        const id = req.params.id;

        const user = await User.findOne({
            _id: id,
            isActive: true
        });

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

// 4-
const updateUser = async (req, res, next) => {

    let user;
    let oldPublicId;
    let newPublicId;

    try {

        const id = req.params.id;

        const isOwner = req.user.id === id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            throw new AppError(
                MESSAGES.NOT_ALLOWED_UPDATE_USER,
                403
            );
        }

        user = await User.findOne({
            _id: id,
            isActive: true
        });

        if (!user) {
            throw new AppError(
                MESSAGES.USER_NOT_FOUND,
                404
            );
        }

        oldPublicId = user.avatar?.publicId;

        const allowedUpdates = getAllowedUserUpdates(isAdmin);

        const updates = Object.keys(req.body);

        if (updates.length === 0 && !req.file) {
            throw new AppError(
                MESSAGES.NO_DATA_TO_UPDATE,
                400
            );
        }

        const isValidOperation = validateAllowedFields(
            updates,
            allowedUpdates
        );

        if (!isValidOperation) {
            throw new AppError(
                MESSAGES.INVALID_UPDATE_FIELDS,
                400
            );
        }

        updates.forEach(field => {
            user[field] = req.body[field];
        });

        if (req.file) {

            const avatar = await uploadUserAvatar(req.file);

            newPublicId = avatar.publicId;

            user.avatar = avatar;

        }

        await user.save();

        if (req.file && oldPublicId) {

            try {

                await deleteUserAvatar(oldPublicId);

            } catch (error) {

                console.error(
                    "Failed to delete old avatar:",
                    error
                );

            }

        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.USER_UPDATED_SUCCESSFULLY,
            data: user
        });

    } catch (error) {

        if (newPublicId) {
            await deleteUserAvatarSafely(newPublicId);
        }

        console.error(error);

        next(error);

    }

};
// 5- Delete User (Soft Delete)

const deleteUser = async (req, res, next) => {

    try {

        const { id } = req.params;

        const user = await User.findOne({
            _id: id,
            isActive: true
        });

        if (!user) {
            throw new AppError(
                MESSAGES.USER_NOT_FOUND,
                404
            );
        }

        user.isActive = false;

        await user.save();

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





























































