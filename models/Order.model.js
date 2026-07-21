const mongoose = require("mongoose");



const OrderItemSchema  = new mongoose.Schema({
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



const shippingAddressSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    }
}, { _id: false });



const OrderSchema = new mongoose.Schema({
user:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
},
items:{
   type:[OrderItemSchema],
    required: true,
    default: []
},
shippingAddress: {
    type: shippingAddressSchema,
    required: true
},
paymentMethod:{
    type: String,
    enum:["cash", "stripe", "paypal", "paymob"],
    default: "cash"
},
paymentStatus:{
    type: String,
    enum:["pending", "paid", "failed", "refunded"],
    default:"pending"
},
transactionId:{
    type: String,
    trim: true
},
subtotal:{
    type:Number,
    required: true,
    min: 0
},
shippingFee:{
    type:Number,
    default: 0,
    min:0
},
tax:{
    type:Number,
    default: 0,
    min:0
},
discount:{
    type:Number,
    default: 0,
    min:0
},
totalPrice:{
    type:Number,
    required: true,
    min: 0
},
status:{
    type: String,
    enum:[
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned"
    ],
    default:"pending"
},
paidAt:{
    type:Date
},
deliveredAt:{
    type:Date
},
cancelledAt:{
    type:Date
},
customerNote:{
    type: String,
    maxlength: 1000
},
adminNote:{
    type: String,
    maxlength: 1000
},
   
}, {
    timestamps: true
});




const Order = mongoose.model("Order", OrderSchema);


module.exports = Order;