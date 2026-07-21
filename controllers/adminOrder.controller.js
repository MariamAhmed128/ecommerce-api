
// Models
const Order = require("../models/Order.model");
const Cart = require("../models/Cart.model");

// Helpers
const {
    getCounts,
    getRevenueStats,
    getOrdersStats,
    getTopProducts,
    getDailyRevenue,
    getRecentOrders
} = require("../utils/adminOrder.helper");

const {
    buildOrderFilter,
    getOrderSortField,
    updateOrderFields
} = require("../utils/order.helper");


// Emails
const sendEmail = require("../utils/emails/sendEmail");
const orderStatusEmail = require("../utils/emails/orderStatusEmail");

// Utils
const getPagination = require("../utils/pagination");
const AppError = require("../utils/appError");
const MESSAGES = require("../utils/messages");



const getAllOrders = async (req, res, next) => {

    try {

        const {
            page,
            limit,
            skip
        } = getPagination(req.query);


        
        const filter = buildOrderFilter(req.query);

        const sortField = getOrderSortField(req.query.sort);
            
        const [orders, totalItems] = await Promise.all([

            Order.find(filter)
                .populate("user", "username email")
                .sort({ [sortField]: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Order.countDocuments(filter)

        ]);



        return res.status(200).json({
            success: true,
            message: MESSAGES.ORDERS_RETRIEVED_SUCCESSFULLY,
            data: orders,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit
            }
        });

            
    } catch (error) {


        console.error(error);

        return next(error);

    } 

};


const getDashboard = async (req, res, next) => {

    try {

        const [
            counts,
            revenue,
            ordersStats,
            topProducts,
            dailyRevenue,
            recentOrders
        ] = await Promise.all([

            getCounts(),

            getRevenueStats(),

            getOrdersStats(),

            getTopProducts(),

            getDailyRevenue(),

            getRecentOrders()

        ]);

        return res.status(200).json({

            success: true,

            message: MESSAGES.DASHBOARD_RETRIEVED_SUCCESSFULLY,

            data: {

                totalCustomers: counts.totalCustomers,

                totalAdmins: counts.totalAdmins,

                totalProducts: counts.totalProducts,

                orders: ordersStats.orders,

                revenue,

                ordersByStatus: ordersStats.ordersByStatus,

                topProducts,

                dailyRevenue,

                recentOrders

            }

        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};


const getActiveCarts = async (req, res, next) => {

    try {

        const {
            page,
            limit,
            skip
        } = getPagination(req.query);

        const filter = {
            "items.0": {
                $exists: true
            }
        };

        const [carts, totalItems] = await Promise.all([

            Cart.find(filter)
                .populate(
                    "user",
                    "username email"
                )
                .sort({
                    updatedAt: -1
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            Cart.countDocuments(filter)

        ]);

        return res.status(200).json({
            success: true,
            message: MESSAGES.CARTS_RETRIEVED_SUCCESSFULLY,
            data: carts,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit
            }
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};



const getAdminOrderById = async (req, res, next) => {

    try {

        const id = req.params.id;

        const order = await Order.findById(id)
            .populate(
                "user",
                "username email"
            )
            .lean();

        if (!order) {
            throw new AppError(
                MESSAGES.ORDER_NOT_FOUND,
                404
            );
        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.ORDER_RETRIEVED_SUCCESSFULLY,
            data: order
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};


const updateOrderStatus = async (req, res, next) => {

    try {

        const id = req.params.id;

        const {
            status,
            adminNote
        } = req.body;

        const order = await Order.findById(id)
            .populate(
                "user",
                "username email"
            );

        if (!order) {
            throw new AppError(
                MESSAGES.ORDER_NOT_FOUND,
                404
            );
        }

        if (order.status === status) {
            throw new AppError(
                MESSAGES.ORDER_ALREADY_HAS_THIS_STATUS,
                400
            );
        }

        updateOrderFields(
            order,
            status,
            adminNote
        );

        await order.save();

        try {

            await sendEmail(
                order.user.email,
                "Order Status Updated",
                orderStatusEmail(order)
            );

        } catch (emailError) {

            console.error("Failed to send order status email:", emailError);

        }

        return res.status(200).json({
            success: true,
            message: MESSAGES.ORDER_STATUS_UPDATED_SUCCESSFULLY,
            data: order
        });

    } catch (error) {

        console.error(error);

        return next(error);

    }

};


module.exports = {
    getDashboard,
    getAllOrders,
    getActiveCarts,
    getAdminOrderById,
    updateOrderStatus
};









