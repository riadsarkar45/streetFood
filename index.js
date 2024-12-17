const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { connectDB } = require('./database/config/db');
const userRoutes = require("./Routes/userRoutes");
const chatSocket =require('./socket/chat/socket');
const addItems = require('./Routes/addItems');
const update = require('./Routes/update');
const products = require('./Routes/products/products');
// Create express app and http server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(compression());
app.use(helmet());
app.use(express.json());

// Socket.IO server setup
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins, adjust as necessary
    methods: ["GET", "POST"]
  }
});

connectDB();
app.use("/api/users", userRoutes);
app.use("/api/addItems", addItems);
app.use("/api/update", update);
app.use("/api/products", products);

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);
  chatSocket(socket, io);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the WebSocket server!');
});

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
