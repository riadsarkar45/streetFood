let isConnected = new Map();

const chatSocket = (socket, io) => {
  socket.on('register', (data) => {
    const { uid } = data;
    isConnected.set(uid, socket.id);
    console.log(`User registered: ${uid}, Socket ID: ${socket.id}`);
  });

  socket.on('chat', (data) => {
    const { uid: receiverId, senderId, name, msg, type } = data;
    if (type === 'chat') {
      if (isConnected.has(receiverId)) {
        io.to(isConnected.get(receiverId)).emit('chat', { message: msg, senderId, receiverId, name });
        io.to(socket.id).emit('confirmation', { message: 'Message Sent.' });
      } else {
        console.log('Receiver not connected.', 'head shoted');
      }
    }
  });
};

module.exports = chatSocket;
