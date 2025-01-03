const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { connectDB } = require('./database/config/db');

// Route Handlers
const userRoutes = require("./Routes/userRoutes");
const chatSocket = require('./socket/chat/socket');
const addItems = require('./Routes/addItems');
const update = require('./Routes/update');
const products = require('./Routes/products/products');
const chatHistory = require('./socket/chat/chatHistory');
const userChattedHistory = require('./socket/chat/userChatHistory');
const delivery = require('./Routes/getDeliveryMens')
// Create Express App and HTTP Server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: "*", // Allow all origins for development. Restrict in production!
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(compression());
app.use(helmet());
app.use(express.json()); // Parse JSON body

// Connect to MongoDB
const startServer = async () => {
  try {
    await connectDB(); // Ensure DB connection before starting the server
    console.log("Database connected successfully.");

    // Routes
    app.use("/api/users", userRoutes);
    app.use("/api/addItems", addItems);
    app.use("/api/update", update);
    app.use("/api/products", products);
    app.use("/api/chat-history", chatHistory);
    app.use("/api/history", userChattedHistory);
    app.use("/api/delivery", delivery);

    // Root Route
    app.get('/', (req, res) => {
      res.send('Welcome to the WebSocket server!');
    });

    // Socket.IO Setup
    const io = socketIo(server, {
      cors: {
        origin: "*", // Adjust this for production security
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log(`New client connected: ${socket.id}`);

      // Chat socket handler
      chatSocket(socket, io);

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    // Start Server
    const PORT = process.env.PORT || 3001; // Use environment variable for production
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

startServer();
