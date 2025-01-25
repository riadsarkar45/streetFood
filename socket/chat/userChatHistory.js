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

        // Collect all results in an array, including the last message
        const results = await Promise.all(
            chats?.map(async (chat) => {
                let userData = null;

                // If the logged-in user is the sender, fetch the receiver's data
                if (id === chat.senderId) {
                    userData = await getDB().collection('users').findOne({ uid: chat.receiverId });
                }
                // If the logged-in user is the receiver, fetch the sender's data
                else if (id === chat.receiverId) {
                    userData = await getDB().collection('users').findOne({ uid: chat.senderId });
                }

                // Get the last message from the current chat
                const lastMessage = chat.lastMessage;
                const senderId = chat.senderId;

                // Combine user data with the last message
                return {
                    userData,  // The other user's data
                    lastMessage,  // Last message in the conversation
                    senderId,
                    createdAt: chat.createdAt // The timestamp of the last message
                };
            })
        );

        // Filter out null or undefined results and flatten the array
        const filteredResults = results.filter((result) => result !== null && result !== undefined);

        // Send the collected data with the last message in a single response
        res.json(filteredResults);

    } catch (error) {
        console.error('Error fetching chat list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = userChatHistory;
