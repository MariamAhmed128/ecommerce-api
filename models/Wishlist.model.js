const mongoose = require("mongoose");


const wishlistSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: true,
        required: true
    },

    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        }
    ]

}, {
    timestamps: true
});



// Auto populate products details
wishlistSchema.pre(/^find/, function () {

    this.populate({
        path: "products"
    });

});


const Wishlist = mongoose.model("Wishlist", wishlistSchema);


module.exports = Wishlist;