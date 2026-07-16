const mongoose = require('mongoose')




const cartItemSchema = new mongoose.Schema({
    // لأن دي بيانات Snapshot. أنا بخزن نسخة من بيانات المنتج وقت إضافته للكارت، بحيث لو اسم المنتج أو سعره أو صورته اتغيرت بعد كده،
    //  الكارت يفضل يعرض نفس البيانات اللي كانت موجودة وقت الإضافة، ومش أضطر أعمل 
    // Populate في كل مرة علشان أجيب الاسم أو الصورة أو السعر
    product :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    } ,

    name :{
        type:String,
        required:true,
        trim:true,
        maxlength:200

    },
    image:{
        type: String,
        required: true
    }, 

    price:{
        type:Number,
        required:true,
        min:0
    }, 

    quantity :{
        type:Number,
        required:true,
        min:1
    }
},{
   _id:false
})




const cartSchema = new mongoose.Schema({

   user :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: true,
        required: true
   } ,
    items: {
        type: [cartItemSchema],
        default: []
    }, 
    coupon: {
        type: {
            _id: false,

            code: {
                type: String,
                trim: true,
                uppercase: true
            },

            discountType: {
                type: String,
                enum: ["percentage", "fixed"]
            },

            discountValue: Number
        },
        default: {}
    },
},{ 
timestamps: true,
toJSON: { virtuals: true },
toObject: { virtuals: true }
});





// ================= Virtuals =================




// 1- subtotal

cartSchema.virtual("subtotal").get(function () {

    return this.items.reduce((sum, item) => {

        return sum  + (item.price * item.quantity);

    }, 0);

});



// 2- itemCount

cartSchema.virtual("itemCount").get(function () {

    return this.items.reduce((sum, item) => {

        return sum + item.quantity;

    }, 0);

});


// 3- discountAmount

cartSchema.virtual("discountAmount").get(function () {

    if (!this.coupon?.code) {
        return 0;
    }

    if (this.coupon.discountType === "percentage") {

        return (this.subtotal * this.coupon.discountValue) / 100;

    }

    return this.coupon.discountValue;

});


// 4- total

cartSchema.virtual("total").get(function () {

    return Math.max(0, this.subtotal - this.discountAmount);

});


const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;





// subtotal = إجمالي الأسعار قبل الخصم.
// discountAmount = قيمة الخصم.
// total = المبلغ النهائي بعد الخصم.
// itemCount = مجموع الكميات الموجودة في الكارت.