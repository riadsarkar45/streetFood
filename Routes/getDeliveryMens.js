const express = require("express");
const { getDB } = require("../database/config/db");
const { ObjectId } = require("mongodb");

const deliveryMens = express.Router();



deliveryMens.put('/assign/dev/:id/:receiverId', async (req, res) => {
    try {
        const { id, receiverId } = req.params;
        console.log(id, receiverId, 'check up');
        // Check if the id and receiverId are valid ObjectIds
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: 'Invalid ID format.' });
        }

        const result = await getDB()
            .collection('users')
            .updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'assigned' } }
            );

        await getDB().collection('orders').updateOne(
            { uid: receiverId },
            { $set: { status: 'assigned' } }
        );

        if (result.matchedCount === 0) {

            return res.status(404).send({ message: 'User not found.' });
        }

        res.status(200).send({ message: 'Delivery man assigned successfully.' });
    } catch (err) {
        console.error("Error assigning delivery man:", err);
        res.status(500).send({ message: 'Internal server error', error: err });
    }
});




module.exports = deliveryMens;

