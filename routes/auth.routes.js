const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");

const auth = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");

const {
    registerValidation,
    verifyOtpValidation,
    loginValidation,
    forgotPasswordValidation,
    verifyForgotPasswordOtpValidation,
    resetPasswordValidation
} = require("../validation/auth.validation");



// Register
router.post(
    "/register/send-otp",
    validate(registerValidation),
    authController.sendRegisterOtp
);

router.post(
    "/register/verify-otp",
    validate(verifyOtpValidation),
    authController.verifyOtp
);


// Login
router.post(
    "/login",
    validate(loginValidation),
    authController.login
);


// Logout
router.post(
    "/logout",
    auth,
    authController.logout
);


// Forgot Password
router.post(
    "/forgot-password/send-otp",
    validate(forgotPasswordValidation),
    authController.sendForgotPasswordOtp
);

router.post(
    "/forgot-password/verify-otp",
    validate(verifyForgotPasswordOtpValidation),
    authController.verifyForgotPasswordOtp
);

router.post(
    "/reset-password",
    validate(resetPasswordValidation),
    authController.resetPassword
);


// Current User
router.get(
    "/me",
    auth,
    authController.getMe
);


module.exports = router;