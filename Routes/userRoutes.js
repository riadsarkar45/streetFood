const express = require("express");
const { getDB } = require("../database/config/db");

const router = express.Router();

router.get("/findOneUser/:uid", async (req, res) => {
  const { uid } = req.params; // Extract uid from the route parameter

  try {
    const db = getDB();
    if (!db) {
      return res.status(500).send({ message: "Database not connected" });
    }

    const users = db.collection("users");
    const visitor = await users.findOne({ uid });

    if (!visitor) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(200).send(visitor);
  } catch (error) {
    console.error("Error finding user:", error);
    res.status(500).send({ message: "Error retrieving user", error });
  }
});

router.post("/register", async (req, res) => {
  const dataToInsert = req.body; // Get data from request body

  try {
    if (!dataToInsert || Object.keys(dataToInsert).length === 0) {
      return res.status(400).send({ message: "No data provided" });
    }

    const db = getDB();
    if (!db) {
      return res.status(500).send({ message: "Database not connected" });
    }

    const users = db.collection("users");
    const insertResult = await users.insertOne(dataToInsert);

    res.status(201).send({
      message: "User registered successfully",
      insertedId: insertResult.insertedId,
    });
  } catch (error) {
    console.error("Error inserting user:", error);
    res.status(500).send({ message: "Failed to register user", error });
  }
});

module.exports = router;
