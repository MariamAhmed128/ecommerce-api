const mongoose = require("mongoose");


const slugify = require("slugify");


const imageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        }
    },
    {
        _id: false
    }
);



const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },

        comment: {
            type: String,
            trim: true
        }

    },
    {
        timestamps: true
    }
);


const productSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true,
        trim:true,
        maxlength:200
    },
//ده ال محتجاه يكون يونيك مش الاسم علشان ممكن يكون موجود منه منتجين عادي عالاقل بنفسم الاسم
    slug:{
        type:String,
        unique:true
    },

    shortDescription:{
        type:String,
        required:true,
        maxlength:500
    },

    description:{
        type:String,
        required:true
    },

    price:{
        type:Number,
        required:true,
        min:0
    },

    discountPrice:{
        type:Number,
        default:0,
        min:0
    },

    stock:{
        type:Number,
        required:true,
        min:0
    },
    // الكود الداخلي.
// SAM-S25-256-BLK
    sku:{
        type:String,
        unique:true
    },

    images:[imageSchema],

    category:{
        type:String,
        required:true,
        lowercase:true
    },

    subcategory:String,

    brand:String,

    tags:[String],

    reviews:[reviewSchema],

    averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
    },

    numReviews:{
        type:Number,
        default:0
    },

    featured:{
        type:Boolean,
        default:false
    },

    isActive:{
        type:Boolean,
        default:true
    },

    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    }

},{
    timestamps:true
});


productSchema.methods.calculateAverageRating = function () {

    this.numReviews = this.reviews.length;

    if (this.numReviews === 0) {

        this.averageRating = 0;

    } else {

        const total = this.reviews.reduce((sum, review) => {

            return sum + review.rating;

        }, 0);  
        this.averageRating = Number((total / this.numReviews).toFixed(1));
    }

};


// pre("save") Hook
productSchema.pre("save", function () {

    if (this.isModified("name")) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true
        });
    }

});


productSchema.index({
    name: "text",
    description: "text",
    brand: "text"
});


module.exports = mongoose.model("Product", productSchema);

// Image Schema 

// Review Schema 

// Product Schema 

// Method 

// Pre Save Hook 

// Text Index 









// ....................