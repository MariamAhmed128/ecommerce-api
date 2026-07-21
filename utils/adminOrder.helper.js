const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");





const getCounts = async () => {

    const [
        totalCustomers,
        totalAdmins,
        totalProducts,
        totalOrders
    ] = await Promise.all([

        User.countDocuments({
            role: "customer"
        }),

        User.countDocuments({
            role: "admin"
        }),

        Product.countDocuments(),

        Order.countDocuments()

    ]);

    return {
        totalCustomers,
        totalAdmins,
        totalProducts,
        totalOrders
    };

};




const getRevenueStats = async () => {

    const now = new Date();

    const currentMonthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    const lastMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
    );

    const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
    );

    const [
        totalRevenueResult,
        currentMonthRevenueResult,
        lastMonthRevenueResult
    ] = await Promise.all([

        Order.aggregate([
            {
                $match: {
                    paymentStatus: "paid"
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$totalPrice"
                    }
                }
            }
        ]),

        Order.aggregate([
            {
                $match: {
                    paymentStatus: "paid",
                    createdAt: {
                        $gte: currentMonthStart
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$totalPrice"
                    }
                }
            }
        ]),

        Order.aggregate([
            {
                $match: {
                    paymentStatus: "paid",
                    createdAt: {
                        $gte: lastMonthStart,
                        $lte: lastMonthEnd
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$totalPrice"
                    }
                }
            }
        ])

    ]);

    const totalRevenue =
        totalRevenueResult[0]?.totalRevenue || 0;

    const currentMonthRevenue =
        currentMonthRevenueResult[0]?.totalRevenue || 0;

    const lastMonthRevenue =
        lastMonthRevenueResult[0]?.totalRevenue || 0;

    const revenueGrowth =
    lastMonthRevenue === 0
        ? 0
        : Number(
            (
                (
                    (currentMonthRevenue - lastMonthRevenue) /
                    lastMonthRevenue
                ) * 100
            ).toFixed(2)
        );
    return {
        totalRevenue,
        currentMonthRevenue,
        lastMonthRevenue,
        revenueGrowth
    };

};


const getOrdersStats = async () => {

    const totalOrders = await Order.countDocuments();

    const ordersByStatus = await Order.aggregate([
        {
            $group: {
                _id: "$status",
                count: {
                    $sum: 1
                }
            }
        },
        {
            $sort: {
                count: -1
            }
        }
    ]);

    const orders = {
        totalOrders,
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0
    };

    ordersByStatus.forEach(item => {

        orders[item._id] = item.count;

    });

    return {
        orders,
        ordersByStatus
    };

};


const getTopProducts = async () => {

    const topProducts = await Order.aggregate([

        {
            $match: {
                status: "delivered"
            }
        },

        {
            $unwind: "$items"
        },

        {
            $group: {

                _id: "$items.product",

                totalSold: {
                    $sum: "$items.quantity"
                },

                revenue: {
                    $sum: {
                        $multiply: [
                            "$items.price",
                            "$items.quantity"
                        ]
                    }
                }

            }
        },

        {
            $sort: {
                totalSold: -1
            }
        },

        {
            $limit: 5
        },

        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },

        {
            $unwind: "$product"
        },

        {
            $project: {

                _id: 1,

                name: "$product.name",

                image: {
                    $arrayElemAt: [
                        "$product.images.url",
                        0
                    ]
                },

                totalSold: 1,

                revenue: 1

            }
        }

    ]);

    return topProducts;

};




const getDailyRevenue = async () => {

    const sevenDaysAgo = new Date();

    sevenDaysAgo.setDate(
        sevenDaysAgo.getDate() - 6
    );

    sevenDaysAgo.setHours(
        0,
        0,
        0,
        0
    );

    const dailyRevenueResult = await Order.aggregate([

        {
            $match: {
                paymentStatus: "paid",
                deliveredAt: {
                    $gte: sevenDaysAgo
                }
            }
        },

        {
            $group: {

                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$deliveredAt",
                        timezone: "Africa/Cairo"
                    }
                },

                revenue: {
                    $sum: "$totalPrice"
                },

                orders: {
                    $sum: 1
                }

            }
        },

        {
            $sort: {
                _id: 1
            }
        }

    ]);

    const dailyRevenue = [];

    for (let i = 0; i < 7; i++) {

        const date = new Date(sevenDaysAgo);

        date.setDate(
            sevenDaysAgo.getDate() + i
        );

        const dateString = date.toLocaleDateString("en-CA");

        const foundDay = dailyRevenueResult.find(
            day => day._id === dateString
        );

        dailyRevenue.push(

            foundDay || {

                _id: dateString,

                revenue: 0,

                orders: 0

            }

        );

    }

    return dailyRevenue;

};



const getRecentOrders = async () => {

    const recentOrders = await Order.find()

        .populate(
            "user",
            "username email"
        )

        .sort({
            createdAt: -1
        })

        .limit(5);

    return recentOrders;

};


module.exports = {
    getCounts,
    getRevenueStats,
    getOrdersStats,
    getTopProducts,
    getDailyRevenue,
    getRecentOrders
};