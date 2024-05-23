const jwt = require('jsonwebtoken');

function createToken(userId) {
    const payload = {
        userId: userId,
    };

    const secretKey = process.env.JWT_SECRET || "your_default_secret_key"; // Get from environment variable
    const token = jwt.sign(payload, secretKey, { expiresIn: "1h" }); 

    return token;
}

module.exports = { createToken };