const express = require("express");
const { getDB } = require("../database/config/db");
const { ObjectId } = require("mongodb");

const deliveryMens = express.Router();

deliveryMens.put('/delivery-mens-info', async (req, res) => {
    try {
        const dataToInsert = req.body;
        const { uid: receiverId, senderId } = req.body;

        // Using .find() to check if a document exists
        const findIfExist = await getDB().collection('deliveryInfo').find(
            {
                $or: [
                    { receiverId: receiverId },
                    { senderId: senderId }
                ]
            }
        ).toArray();

        // Check if the array is empty (no matching documents)
        if (findIfExist.length < 1) {
            await getDB().collection('deliveryInfo').insertOne(dataToInsert);
            res.send({ message: 'Inserted successfully' });
        } else {
            res.status(409).send({ message: 'Record already exists' }); // Use 409 for conflict
        }
    } catch (err) {
        res.status(500).send({ message: 'Internal Server Error', err });
    }
});

module.exports = deliveryMens;
