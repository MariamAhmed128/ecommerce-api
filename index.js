const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
// const mongoSanitize = require("express-mongo-sanitize");

dotenv.config();

const connectDB = require("./DB/mongoose");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes")
const cartRoutes = require("./routes/cart.routes")
const errorHandler = require("./middleware/error.middleware");
const wishlistRoutes = require("./routes/wishlist.routes");
const orderRoutes = require("./routes/order.routes")
const adminOrderRoutes = require("./routes/adminOrder.routes")
const webhookRoutes = require("./routes/webhook.routes");
const dbConnection = require("./middleware/dbConnection.middleware");




const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://ecommerce-api-hjqu.vercel.app",
  "https://ecommerce-api-hjqu-1hnchxr1y-mariam-a-elbahys-projects.vercel.app",
  "https://ecommerce-api-hjqu-bt3kyad12-mariam-a-elbahys-projects.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(helmet());

app.use(hpp());

// app.use(mongoSanitize());
app.use("/api/stripe", webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(dbConnection);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/wishlists", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/orders", adminOrderRoutes);
app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Ecommerce API Running"
    });

});

app.use((req, res, next) => {

    const error = new Error("Route not found");
    error.statusCode = 404;

    next(error);

});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {

//     console.log(`Server running on port ${PORT}`);

// });


if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}


module.exports = app;