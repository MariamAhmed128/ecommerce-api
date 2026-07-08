
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

        // const user = await User.findById(decoded.id);
        const user = await User.findById(decoded.id).select("+password");

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

const admin = (req , res , next)=>{


    try{
        if( req.user.role!== 'admin'){
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            })
        }
        next();
   }
   
   catch(error){
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"

        });
   }
};





module.exports = {
    auth,
    admin  
}
;