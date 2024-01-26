const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcryptjs');

const app = express();

const port = 8000;

const cors = require('cors');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

const jwt = require('jsonwebtoken');

mongoose.connect(
    'mongodb+srv://adarsh:adarsh@cluster0.vv4cmod.mongodb.net/',
    { useNewUrlParser: true ,
    useUnifiedTopology: true }
).then(() => console.log('MongoDB Connected'))
.catch((err) => {console.log("Error in mnogoDB connection",err)});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

const User = require("./models/user");
const Message = require("./models/message");

//Endpoint for user registration

// Endpoint for user registration
app.post("/register", (req, res) => {
    const { name, email, password, image } = req.body;

    // Check if the email already exists in the database
    User.findOne({ email })
        .then((existingUser) => {
            if (existingUser) {
                return res.status(400).json({ message: "Email already exists" });
            }

            // Hash the password
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    console.log("Error hashing password:", err);
                    return res.status(500).json({ message: "Error registering the user!" });
                }

                // Create a new User object with hashed password
                const newUser = new User({ name, email, password: hashedPassword, image });

                // Save user in the database
                newUser.save()
                    .then(() => {
                        res.status(200).json({ message: "User registered Successfully" })
                    })
                    .catch((err) => {
                        console.log("Error registering User", err);
                        res.status(500).json({ message: "Error registering the user!" });
                    });
            });
        })
        .catch((error) => {
            console.log("Error finding the user", error);
            res.status(500).json({ message: "Internal server Error!" });
        });
});


//function to create a token for the user
const createToken = (userId) => {
    // Set the token payload
    const payload = {
      userId: userId,
    };
  
    // Generate the token with a secret key and expiration time
    const token = jwt.sign(payload, "Q$r2K6W8n!jCW%Zk", { expiresIn: "1h" });
  
    return token;
  };
  
  //endpoint for logging in of that particular user
 
  app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Check if the email and password are provided
    if (!email || !password) {
        return res.status(404).json({ message: "Email and the password are required" });
    }

    // Check for that user in the database
    User.findOne({ email })
        .then((user) => {
            if (!user) {
                // User not found
                return res.status(404).json({ message: "User not found" });
            }

            // Compare the provided password with the hashed password in the database
            bcrypt.compare(password, user.password, (err, result) => {
                if (err || !result) {
                    return res.status(404).json({ message: "Invalid Email or Password!" });
                }

                // Passwords match, create and return a token
                const token = createToken(user._id);
                res.status(200).json({ token });
            });
        })
        .catch((error) => {
            console.log("Error finding the user", error);
            res.status(500).json({ message: "Internal server Error!" });
        });
});