const express = require("express");
const secure = express.Router();
const jwt = require('jsonwebtoken');
const { getDB } = require("../../database/config/db");

const ACCESS_TOKEN = "2d9a2f725e4af65f1b9b6f2ffd67e11064a0cbb63daa81687c6d50f6f6f0c76b971f7285bc672791dde63aed54e5e3ec782b3006a6fca1abd6a44059b64b2315";

secure.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, ACCESS_TOKEN, { expiresIn: '1h' });
    res.send({ token })
})



const verifyToken = (req, res, next) => {
    // console.log('verify token', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorize Access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' });
        }
        req.decoded = decoded;
        next();
    });
}

const getUserRole = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await getDB().collection('users').findOne(query);

    if (user) {
        req.userRole = user.role;
        next();
    } else {
        res.status(403).send({ message: 'Forbidden access' });
    }
};

secure.get('/users/users-role/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
    }

    try {
        const user = await getDB().collection('users').findOne({ email });
        let delivery = false;
        let receiver = false;

        if (user) {
            delivery = user.role === 'delivery';
            receiver = user.role === 'receiver';
        }
        res.send({ delivery, receiver });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Internal server error' });
    }
});


secure.post('/add-items', verifyToken, getUserRole, async (req, res) => { // function for verify the token
    const itemsToInsert = req.body;
    const { productCategory, restId } = req.body;
    console.log(productCategory, 'check category');
    try {
        if (itemsToInsert) {
            const insert = await getDB().collection('products').insertOne(itemsToInsert);
            if (!productCategory) {
                return res.status(404).send({ message: 'Category not found.' })
            }
            await getDB().collection('categories').insertOne({ productCategory, restId })
            res.send(insert)

        } else {
            res.send("Something went wrong. Please don't try again later.")
        }
    } catch (err) {
        console.log(err);
    }
});

secure.get('/delivery-mens/:adminId', verifyToken, getUserRole, async (req, res) => {
    try {
        const { adminId } = req.params;
        if (!adminId) {
            return res.status(401).send({ message: 'You are not authorized.' })
        }
        const getMens = await getDB().collection('users').find({ addedBy: adminId }).toArray();
        if (getMens.length > 0) {
            return res.send(getMens)
        } else {
            return res.status(404).send({ message: 'No delivery men found or something went wrong.' })
        }
    } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).send({ message: "Error retrieving user", error });
    }
});

secure.post('/change-cover-photo/:restId', verifyToken, getUserRole, async (req, res) => {
    try {
        const { img: imageToChange } = req.body;
        const { restId: whereToChange } = req.params;
        const findRest = await getDB().collection('restaurants').findOne({ restId: whereToChange })
        if (findRest) {
            console.log('got it');
            await getDB().collection('restaurants').updateOne(
                {
                    restId: whereToChange,
                },

                { $set: { img: imageToChange } }
            )
            res.status(200).send({ message: 'Updated.' })
        } else {
            res.status(400).send({ message: 'Internal Server problem. Try again later.' })
        }
    } catch (e) {
        console.log(e);
    }
})

secure.get('/restaurant-detail/:restId', verifyToken, getUserRole, async (req, res) => {
    const restId = req.params.restId;
    try {
        if (!restId) {
            return res.status(502).send({ message: 'Bad get way.' })
        }
        const rest = await getDB().collection('restaurants').findOne({ restId: restId })
        if (!rest) {
            return res.status(404).send({ message: 'No data found. Or something went wrong.' })
        }
        res.send(rest)

    } catch (e) {
        console.log(e);
    }
})

module.exports = secure;
