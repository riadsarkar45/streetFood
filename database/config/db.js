// config/db.js
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = "mongodb+srv://social:UPb588IIi0WfjMqc@cluster0.lu7tyzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("social");
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

const getDB = () => db;

module.exports = { connectDB, getDB };
