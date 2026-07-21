const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User.model");
const OTP = require("../models/OTP.model");

const generateOTP = require("../utils/generateOTP");
const sendEmail = require("../utils/emails/sendEmail");

const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/generateToken");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");

const sendRegisterOtp = async (req, res, next) => {

    try {

        const { username, email, password, phone } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new AppError(MESSAGES.EMAIL_ALREADY_EXISTS, 400);
        }

        const otp = generateOTP();
        

        await OTP.findOneAndDelete({ email });
        
        await OTP.create({

            email,

            otp,

            expiresAt: new Date(Date.now() + 10 * 60 * 1000),

            userData: {
                username,
                email,
                password,
                phone
            }

        });
        
        await sendEmail(

            email,

            "Verify Your Account",

            `<h2>Your OTP is: ${otp}</h2>`

        );

        res.status(200).json({

            success: true,

            message: MESSAGES.OTP_SENT_SUCCESSFULLY

        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};


const verifyOtp = async (req, res, next) => {

    try {

        const { email, otp } = req.body;

        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {
            throw new AppError(MESSAGES.OTP_NOT_FOUND, 400);
        }

        if (otpRecord.otp !== otp) {
            throw new AppError(MESSAGES.INVALID_OTP, 400);
        }

        if (otpRecord.expiresAt < new Date()) {

            await OTP.deleteOne({ email });

            throw new AppError(MESSAGES.OTP_EXPIRED, 400);
        }

        const user = await User.create({
            ...otpRecord.userData,
            isVerified: true
        });

        await OTP.deleteOne({ email });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: MESSAGES.ACCOUNT_VERIFIED_SUCCESSFULLY,
            accessToken,
            user
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};



const login = async (req, res, next) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            throw new AppError(MESSAGES.INVALID_EMAIL_OR_PASSWORD, 400);
        }

        if (!user.isVerified) {
            throw new AppError(MESSAGES.ACCOUNT_NOT_VERIFIED, 400);
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            throw new AppError(MESSAGES.INVALID_EMAIL_OR_PASSWORD, 400);
        }

        // Generate Tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Save Refresh Token in Cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Send Access Token
        res.status(200).json({
            success: true,
            message: MESSAGES.LOGIN_SUCCESSFUL,
            accessToken,
            user
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};


  const refreshToken = async (req, res, next) => {

    try {

        const token = req.cookies.refreshToken;

        if (!token) {
            throw new AppError(MESSAGES.REFRESH_TOKEN_REQUIRED, 401);
        }

        const decoded = jwt.verify(
            token,
            process.env.REFRESH_SECRET
        );

        const user = await User.findById(decoded.id);

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 401);
        }

        // Generate New Tokens
        const accessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        // Replace Old Refresh Token
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            accessToken
        });

    } catch (error) {

        if (!(error instanceof AppError)) {
            error = new AppError(
                MESSAGES.INVALID_REFRESH_TOKEN,
                401
            );
        }

        console.error(error);

        next(error);

    }

};     



const changeRole = async (req, res, next) => {

    try {

        const { id } = req.params;
        const { role } = req.body;

        const user = await User.findById(id);

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
        }

        user.role = role;

        await user.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.USER_ROLE_UPDATED_SUCCESSFULLY,
            data: user
        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};
const logout = async (req, res, next) => {

    try {

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        res.status(200).json({

            success: true,

            message: MESSAGES.LOGGED_OUT_SUCCESSFULLY

        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};

const forgotPassword = async (req, res, next) => {

    try {

        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
        }

        // Generate Original Reset Token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Hash Token before saving in DB
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Save Hashed Token
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        // Reset Link
        const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        await sendEmail(

            email,

            "Reset Your Password",

            `
            <h2>Password Reset Request</h2>

            <p>Click the link below to reset your password:</p>

            <a href="${resetURL}">${resetURL}</a>

            <p>This link expires in 10 minutes.</p>
            `

        );

        res.status(200).json({

            success: true,
            message: MESSAGES.PASSWORD_RESET_LINK_SENT

        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};



const resetPassword = async (req, res, next) => {

    try {

        const { resetToken, password } = req.body;

        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const user = await User.findOne({

            resetPasswordToken: hashedToken,

            resetPasswordExpires: { $gt: Date.now() }

        }).select("+password");

        if (!user) {
            throw new AppError(MESSAGES.INVALID_RESET_TOKEN, 400);
        }

        user.password = password;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({

            success: true,
            message: MESSAGES.PASSWORD_RESET_SUCCESSFULLY

        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};


const changePassword = async (req, res, next) => {
    try {

        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select("+password");

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
        }

        const isMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isMatch) {
            throw new AppError(MESSAGES.CURRENT_PASSWORD_INCORRECT, 400);
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (samePassword) {
            throw new AppError(MESSAGES.SAME_PASSWORD, 400);
        }

        user.password = newPassword;

        await user.save();

        return res.status(200).json({
            success: true,
            message: MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY
        });

    } catch (error) {

    console.error(error);

    next(error);

}
};



const getMe = async (req, res, next) => {

    try {

        const user = await User.findById(req.user.id);

        if (!user) {
            throw new AppError(MESSAGES.USER_NOT_FOUND, 404);
        }

        res.status(200).json({

            success: true,

            data: user

        });

    } catch (error) {

        console.error(error);

        next(error);

    }

};


module.exports = {

    sendRegisterOtp,

    verifyOtp,

    login,

    refreshToken,

    changeRole,

    logout,

    forgotPassword,

    resetPassword,

    changePassword,

    getMe

};