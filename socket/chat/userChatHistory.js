const express = require("express");
const { getDB } = require("../../database/config/db");
const userChatHistory = express.Router();

userChatHistory.get('/chatted-users/:id', async (req, res) => {
    const { id } = req.params;  // Extract the user ID from the request parameters

    try {
        // Fetch the chat history where the user is either the sender or receiver
        const chats = await getDB().collection('chattedUsers').find({
            $or: [
                { senderId: id },
                { receiverId: id }
            ]
        }).sort({ createdAt: -1 }).toArray();

        // Collect all results in an array
        const results = await Promise.all(
            chats?.map(async (user) => {
                let userData = null;

                // If the logged-in user is the sender, fetch the receiver's data
                if (id === user.senderId) {
                    userData = await getDB().collection('users').find({ uid: user.receiverId }).toArray();
                }
                // If the logged-in user is the receiver, fetch the sender's data
                else if (id === user.receiverId) {
                    userData = await getDB().collection('users').find({ uid: user.senderId }).toArray();
                }

                return userData; // Return the data to collect
            })
        );

        // Filter out null or undefined results
        const filteredResults = results.filter((result) => result !== null && result !== undefined).flat();

        // Send the collected data in a single response
        res.json(filteredResults);

    } catch (error) {
        console.error('Error fetching chat list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = userChatHistory;
