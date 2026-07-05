const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectDB = require("./DB/mongoose");
const authRoutes = require("./routes/auth.routes");

connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use("/api/auth", authRoutes);

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

app.use((err, req, res, next) => {

    res.status(err.status || 500).json({

        success: false,

        message: err.message || "Internal Server Error"

    });

});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});