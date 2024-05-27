const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path"); // Add this line to work with file paths
const nodemailer = require("nodemailer");
const app = express();
const PORT = 3000;
const cors = require("cors");
const otpGenerator = require("otp-generator");
const server = http.createServer(app);
const io = socketIo(server);
const dotenv = require("dotenv");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use("/files", express.static(path.join(__dirname, "files"))); // Serve uploaded files

const jwt = require("jsonwebtoken");
dotenv.config();




mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const connectedUsers = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("setUser", (userId) => {
    connectedUsers[userId] = socket;
    console.log("User set:", userId);
  });

  socket.on("disconnect", () => {
    for (let userId in connectedUsers) {
      if (connectedUsers[userId] === socket) {
        delete connectedUsers[userId];
        console.log("User disconnected:", userId);
        break;
      }
    }
  });
});

//transporter for mail

const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com", // Outlook SMTP server
  port: 587, // Outlook port
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER1, // Replace with your Outlook email
    pass: process.env.EMAIL_PASS, // Replace with your Outlook password or app password
  },
  tls: {
    ciphers: "SSLv3",
  },
});

const otpTransporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com", // Outlook SMTP server
  port: 587, // Outlook port
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER2, // Replace with your Outlook email
    pass: process.env.EMAIL_PASS, // Replace with your Outlook password or app password
  },
  tls: {
    ciphers: "SSLv3",
  },
});

const User = require("./models/user");
const Message = require("./models/message");
const OTPVerification = require("./models/otp");

app.get("/", (req, res) => res.send("Express on Vercel"));



app.post("/send-otp", async (req, res) => {

  
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    // 1. Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    // 2. Find or create an OTP verification record
    let otpVerificationRecord = await OTPVerification.findOneAndUpdate(
      { email },
      {
        otp: otpGenerator.generate(6, {
          upperCaseAlphabets: false,
          specialChars: false,
        }),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      },
      { new: true, upsert: true } // Create if not found
    );


    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER2,
      to: email,
      subject: "Verify your Email for ChatterBox",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @font-face {
                    font-family: 'Poppins';
                    src: url('https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJbecmNE.woff2') format('woff2'),
                         url('https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJbedg.woff') format('woff'),
                         url('https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrFdd.ttf') format('truetype');
                    font-weight: 400;
                    font-style: normal;
                }
        
                body {
                    font-family: 'Poppins', Tahoma, Geneva, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
        
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Add subtle shadow */
                }
        
                .header {
                    background-color: #4A57A2; /* ChatterBox Lavender */
                    color: #fff;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }
        
                .main-body {
                    padding: 30px 20px; /* Increased padding for better visual spacing */
                    font-size: 16px;
                    line-height: 1.5; /* Improve line spacing for readability */
                    color: #333; /* Darker text for better contrast */
                }
        
                .otp-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 30px;
                    gap: 20px; /* Increase gap for better separation */
                }
        
                .otp {
                    font-size: 32px; /* Larger OTP for emphasis */
                    font-weight: bold;
                    text-align: center;
                    padding: 20px 30px; /* Increase padding for better visual appearance */
                    background-color: #f0f8ff; /* Light blue background */
                    border-radius: 8px;
                    letter-spacing: 5px; /* Add spacing between digits */
                }
        
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 14px;
                    color: #777; /* Lighter gray for footer text */
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to ChatterBox!</h1>
                </div>
                <div class="main-body">
                    <p>Hello,</p>
                    <p>Thank you for choosing ChatterBox. To complete your registration, please verify your email address (<b>${email}</b>) by entering the following One-Time Password (OTP):</p>
                </div>
                <div class="otp-container">
                    <div class="otp">${otpVerificationRecord.otp}</div>
                </div>
                <div class="main-body">
                    <p>This OTP is valid for 1 hour.</p>
                    <p>If you did not request this verification, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>Best regards,</p>
                    <p>The ChatterBox Team</p>
                </div>
            </div>
        </body>
        </html>
            `,
    };

    otpTransporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.status(200).json({ message: "Verification OTP email sent." });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Endpoint for OTP verification
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find the OTP verification record
    const otpVerificationRecord = await OTPVerification.findOne({ email });
    if (!otpVerificationRecord) {
      return res.status(404).json({ error: "Invalid email or OTP." });
    }

    // Check if OTP is valid and not expired
    if (
      otpVerificationRecord.otp === otp &&
      otpVerificationRecord.expiresAt > new Date()
    ) {
      // OTP is valid, allow registration
      res.status(200).json({ message: "OTP verified successfully." });
    } else {
      res.status(400).json({ error: "Invalid or expired OTP." });
      console.log("Invalid or expired OTP");
    }
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
          return res
            .status(500)
            .json({ message: "Error registering the user!" });
        }

        // Create a new User object with hashed password
        const newUser = new User({
          name,
          email,
          password: hashedPassword,
          image,
        });

        // Save user in the database
        newUser
          .save()
          .then(() => {
            const mailOptions = {
              from: process.env.EMAIL_USER2,
              to: email,
              subject: "Welcome to ChatterBox",
              html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');

        body {
            font-family: 'Poppins', sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
            color: #333; 
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 30px;
            background-color: #fff;
            border-radius: 10px; 
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .header {
            background-color: #4A57A2;
            color: #fff;
            padding: 25px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }

        .header h1 {
            font-size: 28px;
            margin: 0;
        }

        .main-body {
            padding: 30px 20px;
            font-size: 16px;
            line-height: 1.6; 
            color: #333;
        }

        .button {
            display: inline-block;
            background-color: #007bff;
            color: #fff;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: background-color 0.3s ease;
        }

        .button:hover {
            background-color: #0056b3;
        }

        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ChatterBox, ${name}!</h1>
        </div>
        <div class="main-body">
            <p>We're thrilled to have you join our community. ChatterBox is your new go-to platform for connecting with friends, sharing stories, and staying in touch.</p>
            <p>Start chatting now and discover all the exciting features we have to offer:</p>
            <ul>
                <li>Instant messaging with friends</li>
                <li>Share photos and videos</li>
                <li>And much more features upcoming!</li>
            </ul>
            <p>We hope you enjoy using ChatterBox!</p>
            <a href="https://github.com" class="button">Start Chatting</a>
        </div>
        <div class="footer">
            <p>&copy; 2024 ChatterBox. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

                            `,
            };

            otpTransporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error("Error sending email:", error);
              } else {
                console.log("Email sent:", info.response);
              }
            });

            res.status(200).json({ message: "User registered Successfully" });
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
    return res
      .status(404)
      .json({ message: "Email and the password are required" });
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
          return res
            .status(404)
            .json({ message: "Invalid Email or Password!" });
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

//endpoint to access all the users except the user who's is currently logged in!
app.get("/users/:userId", (req, res) => {
  const loggedInUserId = req.params.userId;

  User.find({ _id: { $ne: loggedInUserId } })
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      console.log("Error retrieving users", err);
      res.status(500).json({ message: "Error retrieving users" });
    });
});

//endpoint to send a friend request to a particular user

app.post('/friend-request', async (req, res) => {
  const { currentUserId, selectedUserId } = req.body;

  // Input validation: Check if required fields are present
  if (!currentUserId || !selectedUserId) {
      return res
          .status(400)
          .json({ error: "Both currentUserId and selectedUserId are required" });
  }

  try {
      // Check if users exist
      const currentUser = await User.findById(currentUserId);
      const selectedUser = await User.findById(selectedUserId); // Fetch selectedUser

      if (!currentUser || !selectedUser) {
          return res.status(404).json({ error: "One or both users not found" });
      }

      // Check if a friend request already exists
      const existingRequest = await User.findOne({
          _id: selectedUserId, // Check in recipient's friendRequests
          friendRequests: currentUserId 
      });

      // Check if users are already friends
      const areFriends = currentUser.friends.includes(selectedUserId);
      const hasSentRequest = currentUser.sentFriendRequests.includes(selectedUserId); // Check if current user has already sent a request

      if (existingRequest || areFriends || hasSentRequest) {
          return res.status(400).json({ error: 'Friend request already exists or users are already friends.' });
      }

      // Update the recipient's friendRequests array
      await User.findByIdAndUpdate(selectedUserId, {
          $push: { friendRequests: currentUserId },
      });

      // Update the sender's sentFriendRequests array
      await User.findByIdAndUpdate(currentUserId, {
          $push: { sentFriendRequests: selectedUserId },
      });

      // Create newFriendRequest object to send to the recipient
      const newFriendRequest = {
          _id: currentUser._id, // Or generate a unique ID
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
      };

      // Emit the newFriendRequest event to the recipient
      const recipientSocket = connectedUsers[selectedUserId];
      if (recipientSocket) {
          recipientSocket.emit("newFriendRequest", newFriendRequest);
      }

      // Emit the sentFriendRequest event to the sender
      const senderSocket = connectedUsers[currentUserId];
      if (senderSocket) {
          senderSocket.emit("sentFriendRequest", selectedUser);
      }

      // Send email notification to the recipient (using the fetched selectedUser)
      const mailOptions = {
        from: process.env.EMAIL_USER1, 
        to: selectedUser.email,
        subject: "New Friend Request on ChatterBox", // More specific subject
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                /* Import Poppins font */
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap'); 
    
                /* Global styles */
                body {
                    font-family: 'Poppins', sans-serif;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 0;
                    color: #333; 
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    padding: 30px;
                    background-color: #fff;
                    border-radius: 10px; 
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); 
                }
    
                /* Header styles */
                .header {
                    background-color: #4A57A2; 
                    color: #fff;
                    padding: 25px; 
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }
                .header h1 {
                    font-size: 28px;
                    margin: 0;
                }
    
                /* Main content styles */
                .main-body {
                    padding: 30px 20px; 
                    font-size: 16px;
                    line-height: 1.6; 
                }
                .sender-name {
                    font-weight: bold;
                }
    
                /* Button styles */
                .button {
                    display: inline-block;
                    background-color: #007bff; 
                    color: #fff;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    transition: background-color 0.3s ease;
                }
                .button:hover {
                    background-color: #0056b3;
                }
    
                /* Footer styles */
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    font-size: 14px;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>You've got a new friend request!</h1>
                </div>
                <div class="main-body">
                    <p><span class="sender-name">${currentUser.name}</span> wants to connect with you on ChatterBox.</p>
                    <p>Don't miss out on the fun – accept the request and start chatting!</p>
                    <a href="https://www.github.com" class="button">Accept</a>
                </div>
                <div class="footer">
                    <p>&copy; 2024 ChatterBox. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `,
    };
    

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error("Error sending email:", error);
          } else {
              console.log("Email sent:", info.response);
          }
      });

      res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
      console.error("Error sending friend request:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


//endpoint to show all the friend-requests of a particular user

app.get("/friend-request/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    //fetch the user document based on the User id
    const user = await User.findById(userId)
      .populate("friendRequests", "name email image")
      .lean();

    const friendRequests = user.friendRequests;

    res.json(friendRequests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint to get the user's friends with populated details
app.get('/user-friends/:userId', async (req, res) => {
  try {
      const { userId } = req.params;

      const user = await User.findById(userId).populate('friends', 'name email image'); 

      if (!user) {
          return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json(user.friends); 
  } catch (error) {
      console.error("Error fetching user friends:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to remove a friend
app.post('/remove-friend', async (req, res) => {
    const { userId, friendId } = req.body;

    // Input validation: Check if required fields are present
    if (!userId || !friendId) {
        return res.status(400).json({ error: 'Both userId and friendId are required' });
    }

    try {
        // Update both users' friend lists
        await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

        // Emit events to notify both users about the friend removal
        const userSocket = connectedUsers[userId];
        const friendSocket = connectedUsers[friendId];

        if (userSocket) {
            userSocket.emit('friendRemoved', friendId); // Send friendId to remove from the user's list
        }
        if (friendSocket) {
            friendSocket.emit('friendRemoved', userId); // Send userId to remove from the friend's list
        }

        res.status(200).json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Endpoint to accept a friend request
app.post('/friend-request/accept', async (req, res) => {
  const { senderId, recipientId } = req.body;

  if (!senderId || !recipientId) {
      return res.status(400).json({ error: 'Both senderId and recipientId are required' });
  }

  try {
      const sender = await User.findById(senderId);
      const recipient = await User.findById(recipientId);

      if (!sender || !recipient) {
          return res.status(404).json({ error: 'One or both users not found' });
      }

      // Add each other to friends list
      sender.friends.push(recipientId);
      recipient.friends.push(senderId);

      // Remove the request from pending lists
      sender.sentFriendRequests = sender.sentFriendRequests.filter(id => id.toString() !== recipientId.toString());
      recipient.friendRequests = recipient.friendRequests.filter(id => id.toString() !== senderId.toString());

      await sender.save();
      await recipient.save();

      // Emit the friendRequestAccepted event to both users in real-time
      const senderSocket = connectedUsers[senderId];
      const recipientSocket = connectedUsers[recipientId];

      if (senderSocket) {
          senderSocket.emit('friendRequestAccepted', { _id: senderId, status: 'accepted' }); 
      }
      if (recipientSocket) {
          recipientSocket.emit('friendRequestAccepted', { _id: senderId, status: 'accepted' }); 
      }

      res.status(200).json({ message: 'Friend request accepted successfully' });
  } catch (error) {
      console.error('Error accepting friend request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to decline a friend request
app.post('/friend-request/decline', async (req, res) => {
  const { senderId, recipientId } = req.body;

  if (!senderId || !recipientId) {
      return res.status(400).json({ error: 'Both senderId and recipientId are required' });
  }

  try {
      const recipient = await User.findById(recipientId);
      recipient.friendRequests = recipient.friendRequests.filter(
          (request) => request.toString() !== senderId.toString()
      );
      await recipient.save();

      const sender = await User.findById(senderId);
      sender.sentFriendRequests = sender.sentFriendRequests.filter(
          (request) => request.toString() !== recipientId.toString()
      );
      await sender.save();

      // Emit the friendRequestDeclined event to both users in real-time
      const senderSocket = connectedUsers[senderId];
      const recipientSocket = connectedUsers[recipientId];

      if (senderSocket) {
          senderSocket.emit('friendRequestDeclined', { _id: senderId, status: 'declined' }); 
      }
      if (recipientSocket) {
          recipientSocket.emit('friendRequestDeclined', { _id: senderId, status: 'declined' }); 
      }

      res.status(200).json({ message: 'Friend request declined successfully' });
  } catch (error) {
      console.error('Error declining friend request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

//endpoint to access all the friends of the logged in user!
app.get("/accepted-friends/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate(
      "friends",
      "name email image"
    );
    const acceptedFriends = user.friends;
    res.json(acceptedFriends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "files/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

//endpoint to post Messages and store it in the backend
app.post("/messages", upload.single("imageFile"), async (req, res) => {
  try {
    const senderId = req.body.senderId;
    const recepientId = req.body.recepientId;
    const messageType = req.body.messageType;
    const messageText = req.body.messageText;

    const newMessage = new Message({
      senderId,
      recepientId,
      messageType,
      message: messageText,
      timestamp: new Date(),
      imageUrl: messageType === "image" ? req.file.path : null,
    });

    await newMessage.save();
    // Populate sender details for the message
    await newMessage.populate("senderId", "_id name");

    // Emit new message event to both sender and recipient
    const senderSocket = connectedUsers[senderId];
    if (senderSocket) {
      senderSocket.emit("newMessage", newMessage);
    }

    const recipientSocket = connectedUsers[recepientId];
    if (recipientSocket) {
      recipientSocket.emit("newMessage", newMessage);
    }

    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
///endpoint to get the userDetails to design the chat Room header
app.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    //fetch the user data from the user ID
    const recepientId = await User.findById(userId);

    res.json(recepientId);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch the messages between two users in the chatRoom
app.get("/messages/:senderId/:recepientId", async (req, res) => {
  try {
    const { senderId, recepientId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: senderId, recepientId: recepientId },
        { senderId: recepientId, recepientId: senderId },
      ],
    }).populate("senderId", "_id name");

    res.json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to delete the messages!
app.post("/deleteMessages", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "invalid req body!" });
    }

    await Message.deleteMany({ _id: { $in: messages } });

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server" });
  }
});

app.get("/friend-requests/sent/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate("sentFriendRequests", "name email image")
      .lean();

    const sentFriendRequests = user.sentFriendRequests;

    res.json(sentFriendRequests);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: "Internal Server" });
  }
});

app.get("/friends/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    User.findById(userId)
      .populate("friends")
      .then((user) => {
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const friendIds = user.friends.map((friend) => friend._id);

        res.status(200).json(friendIds);
      });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "internal server error" });
  }
});

//endpoint to update user details
app.put('/update-profile/:userId', async (req, res) => {
  const { name,image } = req.body;
  const userId = req.params.userId;

  try {
      const updatedUser = await User.findByIdAndUpdate(userId, { name,image }, { new: true }); // { new: true } returns the updated document

      res.status(200).json(updatedUser);
  } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});
