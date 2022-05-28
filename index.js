const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors')
require('dotenv').config()

const port = process.env.PORT || 5000;
const app = express()

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.psd49.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ massage: 'unauthorize' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ massage: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {

    try {
        await client.connect();
        const productsCollection = client.db('drill-products').collection('products');
        const ordersCollection = client.db('drill-products').collection('orders');
        const usersCollection = client.db('drill-products').collection('users');

        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })
            res.send({ result, token });
        })


        app.get('/users', verifyJWT, async (req, res) => {
            const cursor = usersCollection.find();
            const users = await cursor.toArray();
            res.send(users);
        });

        // make admin 
        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })

        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updateItems = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updateItems.Quantity
                }
            };
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            const answer = await productsCollection.findOne(filter);
            res.send(answer);
        })
        //order collection api
        app.post('/orders', async (req, res) => {
            const order = req.body
            const result = await ordersCollection.insertOne(order);
            res.send(result)
        })
        //get
        app.get('/orders', async (req, res) => {

            const query = {};
            const cursor = ordersCollection.find(query);
            const order = await cursor.toArray();
            res.send(order);
        });
        app.get('/order', verifyJWT, async (req, res) => {
            const customer = req.query.customer
            const authorization = req.headers.authorization
            const decodedEmail = req.decoded.email
            if (customer === decodedEmail) {
                const query = { customer: customer };
                const cursor = ordersCollection.find(query);
                const order = await cursor.toArray();
                return res.send(order);
            }
            else {
                return res.status(403).send({ massage: 'forbidden access' })
            }

        });
        //delete
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await itemsCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('warehouse server worked')
})
app.listen(port, () => console.log('port worked'));