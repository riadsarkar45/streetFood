const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = "mongodb+srv://social:UPb588IIi0WfjMqc@cluster0.lu7tyzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("social"); // Replace 'social' with your database name
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1); // Exit process if connection fails
  }
};

const getDB = () => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
};

module.exports = { connectDB, getDB };
