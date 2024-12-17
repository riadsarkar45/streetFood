const express = require("express");
const { getDB } = require("../database/config/db");
const { ObjectId } = require("mongodb");

const update = express.Router();
update.put('/confirm/order/:id', async (req, res) => {
  const orderId = req.params.id;
  const query = { _id: new ObjectId(orderId) }
  const update = {
    $set: { status: 'confirmed' }
  }
  const orderUpdate = await getDB().collection('orders').updateOne(query, update)
  if (orderUpdate) {
    res.send(orderUpdate)
  } else {
    res.send('Something went wrong.')
  }

})


module.exports = update;