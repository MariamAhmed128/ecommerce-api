const mongoose = require('mongoose')
const bcryptjs = require('bcryptjs');



const addressSchema = new mongoose.Schema({
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


const userSchema = new mongoose.Schema({

    username: {
        type : String ,
        required : true ,
        trim : true 
    },
    email:{
        type : String ,
        required:true ,
        unique : true ,
        trim: true,
        lowercase: true
    },
    password:{
		type: String,
        required:true,
        select:false
    },
    phone:{
        type:String,
    },
   avatar: {
        url: {
            type: String,
            default: "https://api.dicebear.com/9.x/initials/svg?seed=User"
        },
        publicId: {
            type: String,
            default: null
        }
    },
    role:{
        type:String,
        enum:[ 'customer' , 'admin'],
        default:'customer'
    },

    addresses:[addressSchema],

    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
    isVerified:{
        type:Boolean,
        default:false
    },
    resetPasswordToken: String,
	resetPasswordExpires: Date,
},{timestamps: true});
// -------------------------------------------------------------------------
// Hash password before saving
userSchema.pre("save", async function () {

    if (!this.isModified("password")) return;

    this.password = await bcryptjs.hash(this.password, 10);

});
// -------------------------------------------------------------------------
// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {

    return await bcryptjs.compare(enteredPassword, this.password);

};
// -------------------------------------------------------------------------
// Remove sensitive fields when returning user
userSchema.methods.toJSON = function () {

    const userObject = this.toObject();

    delete userObject.password;

    return userObject;

};


const User = mongoose.model("User", userSchema);

module.exports = User;



