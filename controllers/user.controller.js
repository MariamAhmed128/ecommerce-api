
const User = require("../models/User.model")
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("../utils/uploadToCloudinary");
const bcrypt = require('bcryptjs');

const addUser = async (req, res) => {
    try{
        const { username, email, password, phone, role } = req.body;
        const existingUser = await User.findOne({ email });
        if(existingUser){
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            })
        }
        const user = await User.create({
            username,
            email,
            password,
            phone,
            role: role || "customer",
            isVerified: true
        });
        return res.status(201).json({
            success: true,
            message: "User added successfully",
            data: user
        });    
    }
catch(error){
      console.error(error);
       return res.status(500).json({
            success: false,
            message: "Internal server error"

        });

    }
}



const getUsers = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.role) {
            filter.role = req.query.role;
        }

       if (req.query.isVerified !== undefined) {
            filter.isVerified = req.query.isVerified === "true";
        }

        if (req.query.search) {

            const searchRegex = new RegExp(req.query.search, "i");

            filter.$or = [
                { username: searchRegex },
                { email: searchRegex }
            ];

        }

        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            User.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: users,
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
                currentPage: page,
                limit
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};



const getUserById = async(req, res)=>{
    try{
        const id = req.params.id;
        const user = await User.findById(id);
        if(!user){
            return res.status(404).json({
            success: false,
            message:"User not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: user
        }); 
    }
    catch(error){
       console.error(error);
       return res.status(500).json({
            success: false,
            message: "Internal server error"

        });

    }

}


const updateUser = async (req, res) => {
    try {

        const id = req.params.id;

        const isOwner = req.user.id === id;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to update this user."
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        let allowedUpdates = ["username","phone", "addresses"];

        if (isAdmin) {
            allowedUpdates.push("role", "isVerified");
        }

        const updates = Object.keys(req.body);

        if (updates.length === 0 && !req.file) {
            return res.status(400).json({
                success: false,
                message: "No data provided to update."
            });
        }

        const isValidOperation = updates.every((field) =>
            allowedUpdates.includes(field)
        );

        if (!isValidOperation) {
            return res.status(400).json({
                success: false,
                message: "Some fields are not allowed to be updated."
            });
        }

        updates.forEach((field) => {
            user[field] = req.body[field];
        });

        // Upload new avatar if provided
        if (req.file) {

            // Delete old avatar from Cloudinary
            if (user.avatar && user.avatar.publicId) {
                await deleteFromCloudinary(user.avatar.publicId);
            }

            // Upload new avatar
            const uploaded = await uploadToCloudinary(
                req.file.buffer,
                "ecommerce/users"
            );

            user.avatar = {
                url: uploaded.secure_url,
                publicId: uploaded.public_id
            };
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: user
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }
};









const changePassword = async(req,res)=>{
    try{
        const{currentPassword, newPassword }= req.body;
        const isMatch = await bcrypt.compare(currentPassword, req.user.password)

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }
        const samePassword = await bcrypt.compare(
            newPassword,
            req.user.password
        );
        if (samePassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from the current password."
            });
        }
        req.user.password = newPassword;
        await req.user.save();
         return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });    
    }
    catch(error){
       console.error(error);
       return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }
};

const deleteUser = async(req, res)=>{
    try{
        const id = req.params.id;
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        }); 
    }
    catch(error){
       console.error(error);
       return res.status(500).json({
            success: false,
            message: "Internal server error"

        });

    }

}



module.exports={
    addUser,
    getUsers,
    getUserById,
    updateUser,
    changePassword,
    deleteUser
}