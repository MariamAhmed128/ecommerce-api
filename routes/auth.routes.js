const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");
const {
    authLimiter,
    securityLimiter
} = require("../middleware/rateLimit.middleware");
const validate = require("../middleware/validation.middleware");
const { auth, admin } = require("../middleware/auth.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const {
    registerValidation,
    verifyOtpValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    changePasswordValidation,
    changeRoleValidation
} = require("../validation/auth.validation");

// Register
router.post(
    "/register/send-otp",
    securityLimiter,
    validate(registerValidation),
    authController.sendRegisterOtp
);

router.post(
    "/register/verify-otp",
    securityLimiter,
    validate(verifyOtpValidation),
    authController.verifyOtp
);


// Login
router.post(
    "/login",
    authLimiter,
    validate(loginValidation),
    authController.login
);



//Refresh-token

router.post("/refresh-token", authController.refreshToken);

// Admin update role
router.patch(
    "/change-role/:id",
    auth,
    admin,
    validateObjectId(),
    validate(changeRoleValidation),
    authController.changeRole
);

// Logout
router.post(
    "/logout",
    auth,
    authController.logout
);

// Forgot Password
router.post(
    "/forgot-password",
    securityLimiter,
    validate(forgotPasswordValidation),
    authController.forgotPassword
);

router.post(
    "/reset-password",
    securityLimiter,
    validate(resetPasswordValidation),
    authController.resetPassword
);

//change password
router.patch(
    "/change-password",
    auth,
    validate(changePasswordValidation),
    authController.changePassword
    
);

// Current User
router.get(
    "/me",
    auth,
    authController.getMe
);


module.exports = router;