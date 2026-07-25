
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");



const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");



const auth = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {


            throw new AppError(MESSAGES.AUTHENTICATION_REQUIRED, 401);


        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);


        if (!user || !user.isActive) {
            throw new AppError(MESSAGES.UNAUTHORIZED, 401);
        }
    

        req.user = user;
        req.token = token;

        next();

    }catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return next(
                new AppError(MESSAGES.INVALID_ACCESS_TOKEN, 401)
            );
        }

        next(error);
    }

};

const admin = (req , res , next)=>{


    try{

        if(req.user.role !== "admin") {
            throw new AppError(
                MESSAGES.ADMIN_ACCESS_REQUIRED,
                403
            );
        }

        next();
   }
   
   catch(error){
        next(error);
   }
};





module.exports = {
    auth,
    admin  
}
;