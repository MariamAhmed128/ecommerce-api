const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectDB = require("./DB/mongoose");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const  productRoutes = require("./routes/product.routes")
const errorHandler = require("./middleware/error.middleware");


connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Ecommerce API Running"
    });

});

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Route not found"

    });

});



app.use(errorHandler);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});