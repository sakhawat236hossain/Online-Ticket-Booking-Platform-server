const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 8000;
const admin = require("firebase-admin");


// middleware
app.use(express.json());
app.use(cors());

const serviceAccount = require("./online-ticket-booking-platform-firebase-adminsdk.json");

// firebase token 
const verifyFBToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

// URI and Client setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dlhwcmb.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});





async function run() {
  try {
    await client.connect();
    const db = client.db("Online_Ticket_Booking_Platform-DB");
    const ticketsCollection = db.collection("tickets");
    const ticketsBookingCollection = db.collection("ticketsBooking");
    const usersCollection = db.collection("users");



 

 

   




 




 

  
 
 
 
   
 

 
    // delete vendor ticket
    app.delete("/tickets/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await ticketsCollection.deleteOne(filter);
      res.send(result);
    });

    // REQUESTED TO USER FOR VENDOR TICKET

    app.get("/requested-tickets", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
      const query = { "vendor.VendorEmail": email };
      const result = await ticketsBookingCollection.find(query).toArray();
      res.send(result);
    });

    // rejected api for vendor
    app.patch("/reject-booking/:id", async (req, res) => {
      const id = req.params.id;

      const updateDoc = {
        $set: {
          status: "rejected",
        },
      };

      const filter = { _id: new ObjectId(id) };
      const result = await ticketsBookingCollection.updateOne(
        filter,
        updateDoc
      );

      res.send(result);
    });

    // accepted api for vendor
    app.patch("/accept-booking/:id", async (req, res) => {
      const id = req.params.id;

      const updateDoc = {
        $set: {
          status: "accepted",
        },
      };

      const filter = { _id: new ObjectId(id) };
      const result = await ticketsBookingCollection.updateOne(
        filter,
        updateDoc
      );

      res.send(result);
    });

    // =================== USER BOOKING APIS ========================
    // GET All Bookings email by a User
    app.get("/user-tickets", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
      const query = { "buyer.buyerEmail": email };
      const result = await ticketsBookingCollection.find(query).toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("online ticket booking platform backend is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
