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



//Refresh-token

router.post("/refresh-token", authController.refreshToken);




// Logout
router.post(
    "/logout",
    auth,
    authController.logout
);

// Forgot Password
router.post(
    "/forgot-password",
    validate(forgotPasswordValidation),
    authController.forgotPassword
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