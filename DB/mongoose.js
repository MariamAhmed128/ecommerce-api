



// const mongoose = require("mongoose");

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("MongoDB Connected Successfully");
//     console.log("Connected DB:", mongoose.connection.name);
//   } catch (error) {
//     console.error("MongoDB Connection Error:", error.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;












const mongoose = require("mongoose");

const connectDB = async () => {
    try {

        if (
            mongoose.connection.readyState === 1 ||
            mongoose.connection.readyState === 2
        ) {
            return;
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected Successfully");
        console.log("Connected DB:", mongoose.connection.name);

    } catch (error) {

        console.error("MongoDB Connection Error:", error.message);

        throw error;
    }
};

module.exports = connectDB;