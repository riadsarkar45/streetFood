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

                    // Insert the chat message into the "chats" collection
                    await getDB().collection('chats').insertOne({
                        message: msg,
                        senderId,
                        receiverId,
                        name,
                        createdAt: new Date().getTime(),
                    });

                    // Update or create a record in the "users" collection
                    await getDB().collection('users').findOneAndUpdate(
                        {
                            $or: [
                                { senderId, receiverId },
                                { senderId: receiverId, receiverId: senderId },
                            ],
                        },
                        {
                            $set: {
                                lastMessage: msg,
                                updatedAt: new Date(),
                                senderId,
                                receiverId,
                                name,
                            },
                        },
                        { upsert: true } // Create if not exists
                    );

                    // Update or create a record in the "chattedUsers" collection
                    await getDB().collection('chattedUsers').findOneAndUpdate(
                        {
                            $or: [
                                { senderId, receiverId },
                                { senderId: receiverId, receiverId: senderId },
                            ],
                        },
                        {
                            $set: {
                                lastMessage: msg,
                                createdAt: new Date().getTime(),
                                senderId,
                                receiverId,
                                name,
                            },
                        },
                        { upsert: true } // Create if not exists
                    );
                } else {
                    io.to(socket.id).emit('confirmation', { message: 'User offline', type: 'error' });
                }
            } catch (err) {
                console.error('Error handling chat:', err);
                io.to(socket.id).emit('confirmation', { message: 'Error sending message', type: 'error' });
            }
        }
    });


    socket.on('order', async (data) => {
        const { uid: receiverId, senderId, devNames, contactNo, type } = data;
        console.log(data);
        if (type === 'orderConfirmation') {
            try {
                if (isConnected.has(receiverId)) {
                    const receiverSocket = isConnected.get(receiverId);
                    io.to(receiverSocket).emit('confirmation', { message: 'Order Confirmed', type: 'message' });
                    io.to(receiverSocket).emit('order', { devName: devNames, senderId: senderId, contactNo: contactNo, });
                    const findOrderStatus = await getDB()
                        .collection('orderStatus')
                        .findOne({
                            $or: [
                                { receiverId: receiverId },
                                { senderId: senderId }
                            ]
                        });
                    if (findOrderStatus) {
                        await getDB().collection('orderStatus').updateOne(
                            {
                                receiverId: receiverId
                            },
                            {
                                $set: {
                                    receiverId: receiverId,
                                    senderId: senderId,
                                    contactNo: contactNo,
                                }
                            }
                        )
                    } else {
                        await getDB().collection('orderStatus').insertOne({ receiverId: receiverId, senderId: senderId, contactNo, devNames })
                    }
                } else {
                    io.to(socket.id).emit('confirmation', { message: 'User offline', type: 'error' });
                }
            } catch (err) {
                console.error('Error handling chat:', err);
                io.to(socket.id).emit('confirmation', { message: 'Error sending message', type: 'error' });
            }
        }
    });

    socket.on('isTyping', async (status) => {
        const { isTyping, senderId, receiverId } = status;
        console.log(receiverId);
        if (isConnected.has(receiverId)) {
            io.to(isConnected.get(receiverId)).emit('isTyping', { senderId: senderId, isTyping, receiverId })
        } else {
            console.log('receiver is not found.');
        }
    });

    socket.on("start-live", (data) => {
        const { roomId, stream } = data;
        // Broadcast the stream to other users in the same room
        socket.to(roomId).emit("receive-live", stream);
    });

    socket.on("stop-live", (data) => {
        const { roomId } = data;
        // Handle stopping the stream, maybe notify others
        socket.to(roomId).emit("stop-live");
    });

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
    });


};

module.exports = chatSocket;
