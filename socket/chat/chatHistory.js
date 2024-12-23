const express = require("express");
const { getDB } = require("../../database/config/db");
const chatHistory = express.Router();

chatHistory.get("/:senderId/:receiverId", async (req, res) => {
    const { senderId, receiverId } = req.params;
    const { page = 1, limit = 20 } = req.query; // Default to 20 messages per page, page 1 if not specified

    try {
        const db = await getDB();  // Get database connection
        const collection = db.collection("chats"); // Assuming 'chats' is the name of your collection

        // Query for messages where senderId and receiverId match
        const messages = await collection
            .find({
                $or: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            })
            .sort({ timestamp: -1 })  // Sort by timestamp in descending order
            .skip((page - 1) * limit) // Skip messages for previous pages
            .limit(parseInt(limit))   // Limit the number of messages returned
            .toArray();  // Make sure to convert the cursor to an array

        // Return only the necessary data (chat messages)
        res.status(200).json(messages);
    } catch (err) {
        console.error("Error fetching chat history: ", err);
        res.status(500).json({ error: "Internal server error" });
    }
});





module.exports = chatHistory;
