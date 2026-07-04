const crypto = require("crypto");
const User = require("../models/User.model");
const OTP = require("../models/OTP.model");

const generateOTP = require("../utils/generateOTP");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");



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

        const user = await User.create({

            ...otpRecord.userData,

            isVerified: true

        });

        await OTP.deleteOne({ email });

        const token = generateToken(user._id);

        res.cookie("token", token, {

            httpOnly: true,

            secure: process.env.NODE_ENV === "production",

            sameSite: "strict",

            maxAge: 7 * 24 * 60 * 60 * 1000

        });

        res.status(201).json({

            success: true,

            message: "Account verified successfully",

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

        const token = generateToken(user._id);

        res.cookie("token", token, {

            httpOnly: true,

            secure: process.env.NODE_ENV === "production",

            sameSite: "strict",

            maxAge: 7 * 24 * 60 * 60 * 1000

        });

        res.status(200).json({

            success: true,

            message: "Login successful",

            user

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};







const logout = async (req, res) => {

    res.clearCookie("token");

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

        await sendEmail(

            email,

            "Reset Password OTP",

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

    logout,

    sendForgotPasswordOtp,

    verifyForgotPasswordOtp,

    resetPassword,

    getMe

};