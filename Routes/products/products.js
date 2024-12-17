const express = require("express");
const { getDB } = require("../../database/config/db");

const products = express.Router();

// Route 1: Get orders by storeId
products.get('/orders/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Find orders with the given storeId
        const orders = await getDB().collection('orders').find({ storeId: id }).toArray();

        // Check if any orders were found
        if (orders.length > 0) {
            res.send(orders);
        } else {
            res.status(404).send({ message: 'No orders found for this storeId.' });
        }
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).send({ message: 'An error occurred while fetching orders.' });
    }
});

// Route 2: Get products and restaurant info by storeId
products.get('/prods/:restId', async (req, res) => {
    try {
        const restId = req.params.restId;
        const findProd = await getDB().collection('products').find({ storeId: restId }).toArray();
        const restaurants1 = await getDB().collection('restaurants').findOne({ restId: restId });

        if (findProd && restaurants1) {
            res.send({
                product: findProd,
                restaurant: restaurants1
            });
        } else {
            res.status(404).send({ message: 'Nothing found here' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'An error occurred' });
    }

});

module.exports = products;
