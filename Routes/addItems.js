const express = require("express");
const { getDB } = require("../database/config/db");

const addItems = express.Router();

  addItems.get('/restaurants', async (req, res) => {
    try {
  
      const rest = await getDB().collection('products').find().toArray();
      if (rest) {
        res.send(rest)
      } else {
        res.send('No data found')
      }
    } catch (err) {
      console.log(err);
    }
  });

module.exports = addItems;
