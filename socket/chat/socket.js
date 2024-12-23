const { getDB } = require("../../database/config/db");

let isConnected = new Map();

const chatSocket = (socket, io) => {
    socket.on('register', (data) => {
        const { uid } = data;
        isConnected.set(uid, socket.id);
        console.log(`User registered: ${uid}, Socket ID: ${socket.id}`);
    });

    socket.on('chat', async (data) => {
        const { uid: receiverId, senderId, name, msg, type } = data;

        if (type === 'chat') {
            try {
                if (isConnected.has(receiverId)) {
                    // Emit chat messages to both participants
                    const receiverSocket = isConnected.get(receiverId);
                    const senderSocket = isConnected.get(senderId);

                    io.to(receiverSocket).emit('chat', { message: msg, senderId, receiverId, name });
                    io.to(receiverSocket).emit('confirmation', { message: 'New Message', type: 'notify', name });
                    io.to(senderSocket).emit('chat', { message: msg, senderId, receiverId, name });
                    io.to(socket.id).emit('confirmation', { message: 'Message Sent.' });

                } else {
                    io.to(socket.id).emit('confirmation', { message: 'User offline', type: 'error' });
                }
            } catch (err) {
                console.error('Error handling chat:', err);
                io.to(socket.id).emit('confirmation', { message: 'Error sending message', type: 'error' });
            }
        }
    });


};

module.exports = chatSocket;
