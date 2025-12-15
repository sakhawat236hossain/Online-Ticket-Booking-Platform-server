const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 8000;

// middleware
app.use(express.json());
app.use(cors());

const serviceAccount = require("./online-ticket-booking-platform-firebase-adminsdk.json");

const admin = require('firebase-admin')
admin.initializeApp({
  credential:admin.credential.cert(serviceAccount)
})

// firebase token
const verifyFBToken = async (req, res, next) => {
    const token = req.headers.authorization;
    console.log(token,req.headers);
    // console.log(token);

    if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    try {
        const idToken = token.split(" ")[1];
        const decoded = await admin.auth().verifyIdToken(idToken);

        req.decoded_email = decoded.email;
        next();
    } catch (error) {
      console.log(error);
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
        // await client.connect();
        const db = client.db("Online_Ticket_Booking_Platform-DB");
        const ticketsCollection = db.collection("tickets");
        const ticketsBookingCollection = db.collection("ticketsBooking");
        const usersCollection = db.collection("users");
        const transactionCollection = db.collection("transactionData");
        const feedbackCollection = db.collection("feedback");


        //======================================feedback================================

        // post 
        app.post("/feedback", async (req, res) => {
            const feedback = req.body;
            const result = await feedbackCollection.insertOne(feedback);
            res.status(201).send(result);
        });

        // get 
        app.get("/feedback",async (req,res)=>{
          const cursor =feedbackCollection.find()
          const feedback =await cursor.toArray()
          res.send(feedback)
        })


        // ====================USERS APIS=========================
        // POST User
        app.post("/users", async (req, res) => {
            const userData = req.body;
            userData.role = "user";
            userData.createdAt = new Date();
            const email = userData.email;
            const existingUser = await usersCollection.findOne({ email: email });
            if (existingUser) {
                return res
                    .status(409)
                    .send({ message: "User with this email already exists." });
            }
            const result = await usersCollection.insertOne(userData);
            res.send(result);
        });

        // GET All Users
        app.get("/users",verifyFBToken, async (req, res) => {
            const cursor = usersCollection.find();
            const users = await cursor.toArray();
            res.send(users);
        });

        // get a user's role
        app.get("/user/role/:email",verifyFBToken, async (req, res) => {
            const email = req.params.email
            const result = await usersCollection.findOne({ email })
            res.send({ role: result?.role })
        })

        // get all transactions by buyer email
        app.get("/transactions",verifyFBToken, async (req, res) => {
            try {
                const email = req.query.email;

                if (!email) {
                    return res.status(400).send({ message: "Email is required" });
                }

                const transactions = await transactionCollection.find({ buyerEmail: email })
                    .sort({ paymentDate: -1 })
                    .toArray();

                res.send(transactions);
            } catch (error) {
                console.error("Get Transactions Error:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });


        // ====================================================ADMIN APIS============================================================
        // ROLE UPDATE TO ADMIN

        // get all tickets for admin
        app.get("/ticketsAdmin",async (req, res) => {
            const result = await ticketsCollection.find().sort({ departure: -1 }).toArray();
            res.send(result);
        });


        // delete vendor ticket (Admin)
        app.delete("/ticketsAdmin/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await ticketsCollection.deleteOne(filter);
            res.send(result);
        });

        // approve ticket
        app.patch("/approve/:id", async (req, res) => {
            const id = req.params.id;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { status: "approved", isHiddenByAdmin: false },
            };

            const result = await ticketsCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        //  reject ticket
        app.patch("/reject/:id", async (req, res) => {
            const id = req.params.id;

            const updateDoc = {
                $set: {
                    status: "rejected",
                    isHiddenByAdmin: true, 
                },
            };

            const filter = { _id: new ObjectId(id) };
            const result = await ticketsCollection.updateOne(filter, updateDoc);

            res.send(result);
        });

        // make vendor
        app.patch("/makeVendor/:id", async (req, res) => {
            const id = req.params.id;

            const updateDoc = {
                $set: {
                    role: "vendor",
                },
            };

            const filter = { _id: new ObjectId(id) };
            const result = await usersCollection.updateOne(filter, updateDoc);

            res.send(result);
        });

        // make admin
        app.patch("/makeAdmin/:id", async (req, res) => {
            const id = req.params.id;

            const updateDoc = {
                $set: {
                    role: "admin",
                },
            };

            const filter = { _id: new ObjectId(id) };
            const result = await usersCollection.updateOne(filter, updateDoc);

            res.send(result);
        });

        // make fraud
        app.patch("/makeFraud/:id", async (req, res) => {
            const id = req.params.id;

            const filter = { _id: new ObjectId(id) };

            // 1. Find the user to get their email (Vendor Email)
            const userToMarkFraud = await usersCollection.findOne(filter);

            if (!userToMarkFraud || userToMarkFraud.role !== "vendor") {
                return res.status(404).send({ message: "User not found or is not a vendor." });
            }

            const vendorEmail = userToMarkFraud.email;

            // 2. Update the user role to 'fraud'
            const userUpdateDoc = {
                $set: {
                    role: "fraud",
                },
            };
            const userResult = await usersCollection.updateOne(filter, userUpdateDoc);

            // 3. Hide ALL tickets added by this vendor from the platform
            const ticketUpdateDoc = {
                $set: {
                    isHiddenByAdmin: true, 
                    status: "rejected" 
                },
            };

            const ticketsResult = await ticketsCollection.updateMany(
                { "Vendor.VendorEmail": vendorEmail },
                ticketUpdateDoc
            );

            res.send({
                userUpdate: userResult,
                ticketsHidden: ticketsResult,
                message: `Vendor ${vendorEmail} marked as fraud, and ${ticketsResult.modifiedCount} tickets hidden.`,
            });
        });

        // advertise
        app.patch("/ticketsAdvertise/:id", async (req, res) => {
            const id = req.params.id;
            const { advertised } = req.body;

            try {
                if (advertised) {
                    const ticket = await ticketsCollection.findOne({ _id: new ObjectId(id) });
                    if (ticket && ticket.isHiddenByAdmin === true) {
                        return res.status(400).send({
                            message: "Cannot advertise a hidden/fraud ticket.",
                        });
                    }

                    const advertisedCount = await ticketsCollection.countDocuments({
                        advertised: true,
                    });

                    if (advertisedCount >= 7) {
                        return res.status(400).send({
                            message: "Maximum 6 tickets can be advertised at a time",
                        });
                    }
                }

                const result = await ticketsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { advertised } }
                );

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: "Something went wrong" });
            }
        });

        //  get only advertisement tickets (Exactly 6)
        app.get("/ticketsAdvertised", async (req, res) => {
            const query = { 
                advertised: true,
                status: "approved", 
                $or: [
                    { isHiddenByAdmin: { $exists: false } },
                    { isHiddenByAdmin: false }
                ]
            };
            
            const result = await ticketsCollection
                .find(query)
                .limit(6)
                .toArray();

            res.send(result);
        });

        // ====================TICKETS APIS=========================
        //  POST Ticket
        app.post("/tickets", async (req, res) => {
            const ticketData = req.body;
            const newTicket = {
                ...ticketData,
                status: "pending", 
                isHiddenByAdmin: false, 
            };
            const result = await ticketsCollection.insertOne(newTicket);
            res.send(result);
        });

        // latest tickets
        app.get("/latest-tickets", async (req, res) => {
            const query = { 
                status: "approved",
                $or: [
                    { isHiddenByAdmin: { $exists: false } },
                    { isHiddenByAdmin: false }
                ]
            };
            const cursor = ticketsCollection.find(query).sort({ departure: -1 }).limit(8);
            const tickets = await cursor.toArray();
            res.send(tickets);
        });

        // get Only Approved Tickets All
        app.get("/approved-tickets", async (req, res) => {
            const query = { 
                status: "approved",
                $or: [
                    { isHiddenByAdmin: { $exists: false } }, 
                    { isHiddenByAdmin: false }
                ]
            };
            const cursor = ticketsCollection.find(query).sort({ _id: -1 });
            const approvedTickets = await cursor.toArray();
            res.send(approvedTickets);
        });

        // get Single Ticket by ID
        app.get("/tickets/:id", async (req, res) => {
            const id = req.params.id;
            try {
                const query = { 
                    _id: new ObjectId(id),
                    $or: [
                        { isHiddenByAdmin: { $exists: false } },
                        { isHiddenByAdmin: false }
                    ]
                };
                const ticket = await ticketsCollection.findOne(query);

                if (!ticket) {
                    return res.status(404).send({ message: "Ticket not found or is currently unavailable." });
                }

                res.send(ticket);
            } catch (error) {
                console.log(error);
                res.status(500).send({ message: "Server Error" });
            }
        });

        // ====================TICKETS APIS VENDOR=========================

        // POST Ticket Booking
        app.post("/tickets-booking", async (req, res) => {
            try {
                const bookingData = req.body;
                const bookingResult = await ticketsBookingCollection.insertOne(
                    bookingData
                );
                res.send({
                    success: true,
                    bookingResult,
                });
            } catch (err) {
                console.log(err);
                res.status(500).send({ message: "Internal Server Error", error: err });
            }
        });

        // VendorRevenue api

        app.get("/vendor-overview/:email",verifyFBToken, async (req, res) => {
            const email = req.params.email;

            //  Total Tickets Added (vendor added tickets)
            const totalTicketsAdded = await ticketsCollection.countDocuments({
                "Vendor.VendorEmail": email,
            });

            //  Sold Tickets (paid bookings)
            const soldBookings = await ticketsBookingCollection.find({
                "vendor.VendorEmail": email,
                status: "paid",
            }).toArray();

            const totalTicketsSold = soldBookings.length;

            //  Total Revenue
            const totalRevenue = soldBookings.reduce(
                (sum, booking) => sum + booking.totalPrice,
                0
            );

            res.send({
                totalTicketsAdded,
                totalTicketsSold,
                totalRevenue,
            });
        });


        // ===============================================================payment related================================================//
        // Stripe Checkout Session (No Change)
        app.post("/create-checkout-session", async (req, res) => {
            try {
                const paymentInfo = req.body;
                console.log("Payment Info:", paymentInfo);

                const session = await stripe.checkout.sessions.create({
                    // payment_method_types: ["card"],

                    customer_email: paymentInfo?.buyer?.buyerEmail,

                    line_items: [
                        {
                            price_data: {
                                currency: "usd",
                                product_data: {
                                    name: paymentInfo?.title,
                                    images: [paymentInfo?.image],
                                },
                                unit_amount: paymentInfo?.price * 100,
                            },
                            quantity: paymentInfo?.quantity,
                        },
                    ],

                    mode: "payment",

                    metadata: {
                        ticketId: paymentInfo?.ticketId,
                        bookingId: paymentInfo?.bookingId,
                        ticketTitle: paymentInfo?.title,
                        buyerEmail: paymentInfo?.buyer?.buyerEmail,
                        buyerImage: paymentInfo?.buyer?.buyerPhoto,
                    },

                    success_url: `${process.env.CLIENT_LOCALHOST_DOMAINE}/paymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.CLIENT_LOCALHOST_DOMAINE}/dashboard/myBookingTickets`,
                });

                res.send({ url: session.url });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: error.message });
            }
        });

        // Payment Success (No Change)
        app.post("/payment-success", async (req, res) => {
            const { bookingId: sessionId } = req.body;

            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId);

                const mongoBookingId = session.metadata.bookingId;
                const ticketId = session.metadata.ticketId;
                const paymentIntentId = session.payment_intent;

                if (session.status !== "complete") {
                    return res
                        .status(400)
                        .send({ message: "Payment session not complete" });
                }
                res.send(ticketId, paymentIntentId);

                const existingTransaction = await transactionCollection.findOne({
                    transactionId: paymentIntentId,
                });

                if (!existingTransaction) {
                    const bookingToUpdate = await ticketsBookingCollection.findOne({
                        _id: new ObjectId(mongoBookingId),
                    });

                    if (!bookingToUpdate) {
                        console.error("Booking document not found for ID:", mongoBookingId);
                        return res
                            .status(404)
                            .send({ message: "Corresponding booking not found." });
                    }

                    const transactionData = {
                        transactionId: paymentIntentId,
                        amount: session.amount_total / 100,
                        ticketTitle: session.metadata.ticketTitle,
                        ticketId: ticketId,
                        buyerEmail: session.metadata.buyerEmail,
                        paymentDate: new Date(),
                        mongoBookingId: mongoBookingId,
                    };
                    await transactionCollection.insertOne(transactionData);

                    await ticketsCollection.updateOne(
                        { _id: new ObjectId(ticketId) },
                        {
                            $inc: { quantity: -bookingToUpdate.quantity },
                        }
                    );

                    await ticketsBookingCollection.updateOne(
                        { _id: new ObjectId(mongoBookingId) },
                        {
                            $set: {
                                status: "paid",
                                transactionId: paymentIntentId,
                            },
                        }
                    );

                    return res.send({
                        success: true,
                        message: "Payment processed successfully.",
                    });
                }

                res.send({ success: true, message: "Payment already processed." });
            } catch (error) {
                console.error("Error in /payment-success:", error);
                res
                    .status(500)
                    .send({ error: error.message, message: "Server error." });
            }
        });
        
        // GET All Tickets Added by a Vendor 
        app.get("/vendor-tickets",verifyFBToken, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }

            const query = { "Vendor.VendorEmail": email };

            const result = await ticketsCollection.find(query).toArray();
            res.send(result);
        });

        // update vendor ticket 
        app.patch("/tickets/:id",verifyFBToken, async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            
            const updateDoc = {
                $set: {
                    ...updatedData,
                    status: "pending" 
                },
            };
            const filter = { _id: new ObjectId(id) };
            try {
                const result = await ticketsCollection.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Ticket not found or ID is incorrect.",
                    });
                }
                res.send({
                    success: true,
                    message: "Ticket updated successfully and status is pending.",
                    result,
                });
            } catch (error) {
                console.error("Error updating ticket:", error);
                res.status(500).send({
                    success: false,
                    message: "Failed to update ticket.",
                    error: error.message,
                });
            }
        });

        // delete vendor ticket (No Change)
        app.delete("/tickets/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await ticketsCollection.deleteOne(filter);
            res.send(result);
        });

        // GET requested tickets for a vendor (No Change)
        app.get("/requested-tickets",verifyFBToken, async (req, res) => {
            try {
                const email = req.query.email;
                if (!email) {
                    return res.status(400).send({ message: "Email is required" });
                }

                const bookings = await ticketsBookingCollection
                    .find({ "vendor.VendorEmail": email })
                    .toArray();

                res.send(bookings);
            } catch (error) {
                console.error("Error fetching requested tickets:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // rejected api for vendor (No Change)
        app.patch("/reject-booking/:id",verifyFBToken, async (req, res) => {
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

        // accepted api for vendor (No Change)
        app.patch("/accept-booking/:id",verifyFBToken, async (req, res) => {
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
        // GET All Bookings email by a User (No Change)
        app.get("/user-tickets",verifyFBToken, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }
            const query = { "buyer.buyerEmail": email };
            const result = await ticketsBookingCollection.find(query).toArray();
            res.send(result);
        });

        // await client.db("admin").command({ ping: 1 });
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