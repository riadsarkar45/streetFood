const { setInterval } = require("timers/promises");
const { getDB } = require("../../database/config/db");
const os = require('os');
const calculateApiResponses = require("../../utils/apiResCount");
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

        console.log(`User registered: ${uid}, Socket ID: ${socket.id}, Role: ${role}`);
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
    
    

};

module.exports = chatSocket;
