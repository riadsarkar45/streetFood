const { setInterval } = require("timers/promises");
const { getDB } = require("../../database/config/db");
const os = require('os');
let isConnected = new Map();
let connectedRoles = new Map()
const chatSocket = (socket, io) => {
    socket.on('register', (data) => {
        const { uid, role } = data;

        // Store the socket ID for the user
        isConnected.set(uid, socket.id);

        // Add the socket ID to the corresponding role
        if (!connectedRoles.has(role)) {
            connectedRoles.set(role, new Set());
        }
        connectedRoles.get(role).add(socket.id);
        // Send the updated list of connected users to all clients
        const connectedUsers = Array.from(isConnected.keys()); // Only send uids, not socket IDs
        io.emit('register', { connectedUsers });
        console.log(`User registered: ${uid}, Socket ID: ${socket.id}, Role: ${role}`);
    });

    socket.on('chat', async (data) => {
        const { uid: receiverId, senderId, name, msg, lastMessage, type } = data;

        if (type === 'chat') {
            try {
                if (isConnected.has(receiverId)) {
                    // Emit chat messages to both participants
                    const receiverSocket = isConnected.get(receiverId);
                    const senderSocket = isConnected.get(senderId);

                    io.to(receiverSocket).emit('chat', { message: msg, senderId, receiverId, name, lastMessage });
                    io.to(receiverSocket).emit('confirmation', { message: 'New Message', type: 'notify', name });
                    io.to(senderSocket).emit('chat', { message: msg, senderId, receiverId, name, lastMessage });
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

    socket.on('newOrder', async (data) => {
        const { senderId, receiverId, type, productId } = data;
        console.log(data, 'cat');
        if (type === 'newOrder') {
            if (isConnected.has(receiverId)) {
                io.to(isConnected.get(receiverId)).emit('newOrder', data)
                await getDB().collection('orders').insertOne(data)
                await getDB().collection('users').updateOne(
                    {
                        uid: senderId
                    },
                    {
                        $addToSet: {
                            productId: productId
                        }
                    }
                )
                io.to(isConnected.get(receiverId)).emit('confirmation', { message: 'Order submission failed successfully.', type: 'success' })
            } else {
                io.to(isConnected.get(senderId)).emit('confirmation', { message: 'Receiver is not connected', type: 'error' })
            }
        } else {
            io.to(isConnected.get(senderId).emit('confirmation', { message: 'Something went wrong.', type: 'error' }))
        }

    })

    socket.on('isTyping', async (status) => {
        const { isTyping, senderId, receiverId } = status;
        console.log(receiverId);
        if (isConnected.has(receiverId)) {
            io.to(isConnected.get(receiverId)).emit('isTyping', { senderId: senderId, isTyping, receiverId })
        } else {
            console.log('receiver is not found.');
        }
    });

    const getServerStats = () => {
        return {
            uptime: os.uptime(), // Server uptime in seconds
            loadAverage: os.loadavg(), // Load average over 1, 5, 15 minutes
            freeMemory: os.freemem(), // Free memory in bytes
            totalMemory: os.totalmem(), // Total memory in bytes
            cpuUsage: os.cpus().map(cpu => cpu.times), // Per CPU usage
        };
    };

    socket.on('server-performance', () => {
        if (connectedRoles.has('delivery') && connectedRoles.get('delivery').has(socket.id)) {
            io.to(socket.id).emit('server-performance', getServerStats());
        } else {
            console.log('Something went wrong or role is not "delivery".');
        }
    });

    socket.on('disconnect', () => {
        // Find the user associated with the disconnected socket
        const uid = Array.from(isConnected.keys()).find((key) => isConnected.get(key) === socket.id);
        if (uid) {
            // Remove the user from isConnected
            isConnected.delete(uid);
    
            // Remove the socket ID from connectedRoles
            for (const [role, sockets] of connectedRoles) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    connectedRoles.delete(role); 
                }
            }

            console.log(`User disconnected: ${uid}, Socket ID: ${socket.id}`);
    
            // Notify all other users about the updated user list
            const connectedUsers = Array.from(isConnected.keys());
            io.emit('register', { connectedUsers });
        }
    });
    



};

module.exports = chatSocket;
