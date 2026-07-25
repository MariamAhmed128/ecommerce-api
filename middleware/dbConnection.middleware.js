const connectDB = require("../DB/mongoose");

const dbConnection = async (req, res, next) => {
    try {

        await connectDB();
        next();

    } catch (error) {

        next(error);

    }
};

module.exports = dbConnection;