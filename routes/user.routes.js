const express = require("express");

const router = express.Router();

const userController = require("../controllers/user.controller");

const { auth, admin } = require("../middleware/auth.middleware");
const validate = require("../middleware/validation.middleware");
const upload = require("../middleware/upload.middleware");
const validateObjectId = require("../middleware/validateObjectId.middleware");

const {
    addUserValidation,
    updateUserValidation,
    changePasswordValidation
} = require("../validation/user.validation");

// Admin Routes
router.post(
    "/add",
    auth,
    admin,
    validate(addUserValidation),
    userController.addUser
);

router.get(
    "/all",
    auth,
    admin,
    userController.getUsers
);

router.get(
    "/:id",
    auth,
    admin,
    validateObjectId,
    userController.getUserById
);

router.delete(
    "/:id",
    auth,
    admin,
    validateObjectId,
    userController.deleteUser
);

// User Routes
router.patch(
    "/change-password",
    auth,
    validate(changePasswordValidation),
    userController.changePassword
);

router.patch(
    "/:id",
    auth,
    validateObjectId,
    upload.single("avatar"),
    validate(updateUserValidation),
    userController.updateUser
);

module.exports = router;