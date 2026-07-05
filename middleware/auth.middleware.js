























const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const auth = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {

            return res.status(401).json({

                success: false,
                message: "Authentication required"

            });

        }

        const token = authHeader.replace("Bearer ", "").trim();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {

            return res.status(401).json({

                success: false,
                message: "User not found"

            });

        }

        req.user = user;
        req.token = token;

        next();

    } catch (error) {

        return res.status(401).json({

            success: false,
            message: "Invalid or expired access token"

        });

    }

};

module.exports = auth;