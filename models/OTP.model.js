const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema({

    email:{
        type : String ,
        required:true ,
        trim: true,
        lowercase: true
    },
    otp:{
        type : String ,
        required:true 
        
    },
    expiresAt:{
        type:Date,
        required:true 
    },
    userData:{
        type:Object,
        required:true 
    },
},{timestamps: true});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Otp = mongoose.model('Otp' , otpSchema);


module.exports = Otp;