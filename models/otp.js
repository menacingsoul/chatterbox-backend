const mongoose = require("mongoose");

const otpVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
});

const OTPVerification = mongoose.model('OTPVerification', otpVerificationSchema);

module.exports = OTPVerification;