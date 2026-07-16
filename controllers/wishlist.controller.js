const Wishlist = require("../models/Wishlist.model");
const Product = require("../models/Product.model");

const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");



const getOrCreateWishlist = async (userId) => {

    let wishlist = await Wishlist.findOne({
        user: userId
    });

    if (!wishlist) {

        wishlist = await Wishlist.create({
            user: userId,
            products: []
        });

    }

    return wishlist;

};




// ================= Get My Wishlist =================

const getMyWishlist = async (req, res, next) => {

    try {

        const wishlist = await getOrCreateWishlist(req.user.id);


        return res.status(200).json({
            success: true,
            message: MESSAGES.WISHLIST_RETRIEVED_SUCCESSFULLY,
            data: wishlist
        });


    } catch (error) {

        console.error(error);

        return next(error);

    }

};




// ================= Add Product =================

const addToWishlist = async (req, res, next) => {

    try {

        const { productId } = req.params;


        const product = await Product.findById(productId);


        if (!product) {

            throw new AppError(
                MESSAGES.PRODUCT_NOT_FOUND,
                404
            );

        }


        const wishlist = await getOrCreateWishlist(req.user.id);


        const productExists = wishlist.products.some(item =>
            (item._id || item).toString() === productId
        );

        if (productExists) {

            throw new AppError(
                MESSAGES.PRODUCT_ALREADY_IN_WISHLIST,
                400
            );

        }



        wishlist.products.push(productId);


        await wishlist.save();



        return res.status(200).json({

            success: true,

            message: MESSAGES.PRODUCT_ADDED_TO_WISHLIST_SUCCESSFULLY,

            data: wishlist

        });


    } catch (error) {

        console.error(error);

        return next(error);

    }

};




// ================= Remove Product =================

const removeFromWishlist = async (req, res, next) => {

    try {

        const { productId } = req.params;


        const wishlist = await getOrCreateWishlist(req.user.id);

        const productIndex = wishlist.products.findIndex(
            product => (product._id || product).toString() === productId
        );

        if (productIndex === -1) {

            throw new AppError(
                MESSAGES.PRODUCT_NOT_FOUND_IN_WISHLIST,
                404
            );

        }



        wishlist.products.splice(productIndex, 1);


        await wishlist.save();



        return res.status(200).json({

            success: true,

            message: MESSAGES.PRODUCT_REMOVED_FROM_WISHLIST_SUCCESSFULLY,

            data: wishlist

        });



    } catch (error) {

        console.error(error);

        return next(error);

    }

};




// ================= Clear Wishlist =================

const clearWishlist = async (req, res, next) => {

    try {


        const wishlist = await getOrCreateWishlist(req.user.id);


        wishlist.products = [];


        await wishlist.save();



        return res.status(200).json({

            success: true,

            message: MESSAGES.WISHLIST_CLEARED_SUCCESSFULLY,

            data: wishlist

        });


    } catch (error) {

        console.error(error);

        return next(error);

    }

};




module.exports = {

    getMyWishlist,

    addToWishlist,

    removeFromWishlist,

    clearWishlist

};