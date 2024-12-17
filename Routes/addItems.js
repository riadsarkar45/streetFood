const express = require("express");
const { getDB } = require("../database/config/db");

const addItems = express.Router();

addItems.post('/add-items', async (req, res) => {
    const itemsToInsert = req.body;
    try {
      if (itemsToInsert) {
        const insert = await getDB().collection('restaurants').insertOne(itemsToInsert);
        res.send(insert)
      } else {
        res.send("Something went wrong. Please don't try again later.")
      }
    } catch (err) {
      console.log(err);
    }
  });

  addItems.get('/restaurants', async (req, res) => {
    try {
  
      const rest = await getDB().collection('restaurants').find().toArray();
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
