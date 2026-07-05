const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const OTP = require("../models/OTP.model");

const generateOTP = require("../utils/generateOTP");
const sendEmail = require("../utils/sendEmail");


const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/generateToken");

const sendRegisterOtp = async (req, res) => {

    try {

        const { username, email, password, phone } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
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

            message: "OTP sent successfully"

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};




const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP not found"
            });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        if (otpRecord.expiresAt < new Date()) {
            await OTP.deleteOne({ email });

            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        // 1) Create user
        const user = await User.create({
            ...otpRecord.userData,
            isVerified: true
        });

        await OTP.deleteOne({ email });

        // 2) Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // 3) Set refresh token in cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // 4) Send response
        res.status(201).json({
            success: true,
            message: "Account verified successfully",
            accessToken,
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};





const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your account first"
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
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
            message: "Login successful",
            accessToken,
            user
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};



const refreshToken = async (req, res) => {
    try {

        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is required"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.REFRESH_SECRET
        );

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        const accessToken = generateAccessToken(user);

        return res.status(200).json({
            success: true,
            accessToken
        });

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token"
        });

    }
};


const logout = async (req, res) => {

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

    res.status(200).json({

        success: true,

        message: "Logged out successfully"

    });

};


const sendForgotPasswordOtp = async (req, res) => {

    try {

        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found"

            });

        }

        const otp = generateOTP();

        await OTP.findOneAndDelete({ email });

        await OTP.create({

            email,

            otp,

            expiresAt: new Date(Date.now() + 10 * 60 * 1000),

            userData: {}

        });

        try {

            await sendEmail(

                email,

                "Reset Password OTP",

                `<h2>Your OTP is: ${otp}</h2>`

            );

        } catch (err) {

            console.log("Send Email Error:", err);

            throw err;

        }

        res.status(200).json({

            success: true,

            message: "OTP sent successfully"

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};




const verifyForgotPasswordOtp = async (req, res) => {

    try {

        const { email, otp } = req.body;

        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {

            return res.status(400).json({

                success: false,

                message: "OTP not found"

            });

        }

        if (otpRecord.otp !== otp) {

            return res.status(400).json({

                success: false,

                message: "Invalid OTP"

            });

        }

        if (otpRecord.expiresAt < new Date()) {

            await OTP.deleteOne({ email });

            return res.status(400).json({

                success: false,

                message: "OTP expired"

            });

        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        const user = await User.findOne({ email });

        user.resetPasswordToken = resetToken;

        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

        await OTP.deleteOne({ email });

        res.status(200).json({

            success: true,

            message: "OTP verified successfully",

            resetToken

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};







const resetPassword = async (req, res) => {

    try {

        const { resetToken, password } = req.body;

        const user = await User.findOne({

            resetPasswordToken: resetToken,

            resetPasswordExpires: { $gt: Date.now() }

        }).select("+password");

        if (!user) {

            return res.status(400).json({

                success: false,

                message: "Invalid or expired reset token"

            });

        }

        user.password = password;

        user.resetPasswordToken = undefined;

        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({

            success: true,

            message: "Password reset successfully"

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};







const getMe = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        res.status(200).json({

            success: true,

            user

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};







module.exports = {

    sendRegisterOtp,

    verifyOtp,

    login,

    refreshToken,

    logout,

    sendForgotPasswordOtp,

    verifyForgotPasswordOtp,

    resetPassword,

    getMe

};