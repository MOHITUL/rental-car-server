const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000
require("dotenv").config()

// middleware
app.use(cors())
app.use(express.json())


// mongodb

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.tyr9ovk.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        //await client.connect();(comment)

        const db = client.db('car-rental-db')
        const carCollection = db.collection('cars')

        

        // get all cars
        app.get('/cars', async (req, res) => {
            const cars = await carCollection.find().toArray();
            res.send(cars);
        })

        // add a car
        app.post('/cars', async (req, res) => {
            const newCar = req.body

            console.log(newCar)
            const result = await carCollection.insertOne(newCar);
            res.send({
                success: true,
                result
            })
        })

        // get single car
        app.get('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const car = await carCollection.findOne({ _id: new ObjectId(id) });
            res.send(car)
        })


        // BOOK CAR 
        app.patch("/cars/:id/book", async (req, res) => {
            const { id } = req.params;
            const { userEmail, userName } = req.body;

            if (!userEmail) {
                return res.status(400).json({ error: "userEmail is required" });
            }

            try {
                const result = await carCollection.updateOne(
                    {
                        _id: new ObjectId(id),
                        status: "available"
                    },
                    {
                        $set: {
                            status: "unavailable",
                            bookedBy: userEmail,
                            bookedByName: userName || "Guest",
                            bookedAt: new Date()
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: "Car not available or already booked" });
                }

                res.json({ success: true, message: "Car booked!" });
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Server error" });
            }
        });

        // get all cars added by a specific provider
        app.get('/my-listings', async (req, res) => {
            const email = req.query.email;
            const query = { providerEmail: email };
            const result = await carCollection.find(query).toArray();
            res.send(result);
        })

        // featured car
        app.get("/featured", async (req, res) => {
            const cars = await carCollection.find().sort({ _id: -1 }).limit(6).toArray();
            res.send(cars);
        });

        // search
        app.get("/search", async (req, res) => {
            const { name } = req.query;
            const query = { carName: { $regex: name, $options: "i" } };
            const cars = await db.collection("cars").find(query).toArray();
            res.send(cars);

        })

        // Get bookings for a specific user
        app.get('/bookings', async (req, res) => {
            try {
                const email = req.query.email;
                if (!email) {
                    return res.status(400).send({ message: "Email is required" });
                }
                const bookings = await carCollection.find({ bookedBy: email }).toArray();
                res.send(bookings);
            } catch (error) {
                console.error("Error fetching bookings:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });



        // delete car
        app.delete('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await carCollection.deleteOne(query);
            res.send(result);
        })

        // update car
        app.put('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const updatedCar = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    carName: updatedCar.carName,
                    category: updatedCar.category,
                    rentPrice: updatedCar.rentPrice,
                    description: updatedCar.description,
                    location: updatedCar.location,
                    imageUrl: updatedCar.imageUrl,
                    status: updatedCar.status,
                },

            };
            const result = await carCollection.updateOne(query, updateDoc);
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        //await client.db("admin").command({ ping: 1 });(comment)
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

// home
app.get("/", (req, res) => {
    res.send("Server is running fine");
});


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
