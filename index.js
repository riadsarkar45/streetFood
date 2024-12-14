const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const WebSocket = require('ws');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(compression());
app.use(helmet());
app.use(express.json());

// HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// MongoDB connection
const uri = "mongodb+srv://social:UPb588IIi0WfjMqc@cluster0.lu7tyzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});
const database = client.db('social');
const users = database.collection("users");
const restaurants = database.collection("restaurants");
const products = database.collection("products");
const orders = database.collection("orders");

app.get('/findOneUser/:uid', async (req, res) => {
  const id = req.params.uid; // Extract uid from the route parameter
  try {
    const visitor = await users.findOne({ uid: id }); // Search user by uid
    if (!visitor) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send(visitor);
  } catch (error) {
    res.status(500).send({ message: 'Error retrieving user', error });
  }
});

app.post('/register', async (req, res) => {
  const dataToInsert = req.body;
  try {
    const insertData = await users.insertOne(dataToInsert);
    res.send(insertData)
  } catch (err) {
    console.log(err);
  }
});

app.post('/add-items', async (req, res) => {
  const itemsToInsert = req.body;
  try {
    if (itemsToInsert) {
      const insert = await restaurants.insertOne(itemsToInsert);
      res.send(insert)
    } else {
      res.send("Something went wrong. Please don't try again later.")
    }
  } catch (err) {
    console.log(err);
  }
});

app.get('/restaurants', async (req, res) => {
  try {

    const rest = await restaurants.find().toArray();
    if (rest) {
      res.send(rest)
    } else {
      res.send('No data found')
    }
  } catch (err) {
    console.log(err);
  }
});

app.put('/confirm/order/:id', async (req, res) => {
  const orderId = req.params.id;
  const query = { _id: new ObjectId(orderId) }
  const update = {
    $set: { status: 'confirmed' }
  }
  const orderUpdate = await orders.updateOne(query, update)
  if (orderUpdate) {
    res.send(orderUpdate)
  } else {
    res.send('Something went wrong.')
  }

})

app.get('/orders/:id', async (req, res) => {
  try {
    const id = req.params.id
    const order = await orders.findOne({ storeId: id });
    if (order) {
      let toArray = [];
      toArray.push(order)
      res.send(toArray)
    } else {
      res.send('No data found')
    }
  } catch (err) {
    console.log(err);
  }
})

app.get('/products/:restId', async (req, res) => {
  try {
    const restId = req.params.restId;
    const findProd = await products.find({ storeId: restId }).toArray();
    const restaurants1 = await restaurants.findOne({ restId: restId });

    if (findProd && restaurants1) {
      res.send({
        product: findProd,
        restaurant: restaurants1
      });
    } else {
      res.status(404).send({ message: 'Nothing found here' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'An error occurred' });
  }
});


// Maps for tracking connections and last known locations
let orderConnections = new Map(); // Tracks WebSocket connections per order

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(message);
      const { uid, role, orderId, storeId, name, msg } = message;
      console.log(msg, 'line 133');
      if (message.type === 'register') {
        // Store WebSocket connection with the user id (uid)
        orderConnections.set(uid, ws);
        console.log('User connected:', uid);

      } else if (message.type === 'confirmation') {
        // Check if the user is connected
        if (orderConnections.has(uid)) {
          const userWs = orderConnections.get(uid);

          // Send order confirmation to the specific user
          userWs.send(JSON.stringify({
            type: 'confirmation',
            message: 'Your order confirmed',
            storeId: storeId
          }));
        } else {
          console.log(`User with UID ${uid} is not connected`);
        }

        // Send confirmation to the sender
        ws.send(JSON.stringify({ type: 'confirmation', message: 'You can have a chat with customer.' }));
      } else if (message.type === 'chat') {
        if (orderConnections.has(uid)) {
          const userWs = orderConnections.get(uid);
          userWs.send(JSON.stringify({
            type: 'chat',
            message: msg,
            senderName: name
          }));
        } else {
          console.log('no id found');
        }

        ws.send(JSON.stringify({ type: 'confirmation', message: 'Message sent' }));
      }
    } catch (err) {
      console.error('Error processing message:', err.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  // Cleanup when WebSocket connection is closed
  ws.on('close', () => {
    orderConnections.forEach((connection, uid) => {
      if (connection === ws) {
        orderConnections.delete(uid);
        console.log(`Connection for user ${uid} removed`);
      }
    });
  });

  ws.send(JSON.stringify({ message: 'Welcome to the WebSocket server!' }));
});

// Heartbeat check to terminate stale connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// MongoDB connection initialization
client.connect().then(() => {
  console.log('Connected to MongoDB');
}).catch(console.error);

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the WebSocket server!');
});
