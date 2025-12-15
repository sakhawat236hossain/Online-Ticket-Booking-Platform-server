# ⚙️ TicketBari – Server Side (Back-End)

The **robust back-end application** for the **Online Ticket Booking Platform**, built using **Express.js** and **MongoDB**, and secured with **Firebase Authentication**. It handles **data management**, **ticket processing**, and **secure Stripe payments** for three distinct roles: **User**, **Vendor**, and **Admin**.

---

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=stripe&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white" />
</div>

---

## 🌐 Technology Stack

* **Runtime Environment:** Node.js
* **Web Framework:** Express.js
* **Database:** MongoDB (Official Driver & Mongoose)
* **Authentication:** Firebase Admin SDK (Token Verification)
* **Security:** JSON Web Token (JWT)
* **Payment Gateway:** Stripe
* **Key Packages:** cors, dotenv, firebase-admin, mongodb, stripe

---

## 🚀 Local Setup Guide

Follow the steps below to successfully run the server locally.

---

### 1️⃣ Prerequisites

* Node.js (v18+ recommended)
* MongoDB Atlas account or local MongoDB installation
* Firebase Project
* Stripe Account

---

### 2️⃣ Clone Repository & Install Dependencies

```bash
git clone https://github.com/sakhawat236hossain/Online-Ticket-Booking-Platform-server.git
npm install
```

---

### 3️⃣ Environment Variables Setup

Create a `.env` file in the **server root directory** and add the following credentials:

```env
# Server Configuration
PORT=8000
MONGODB_URI=YOUR_MONGODB_URI_HERE
JWT_SECRET=YOUR_JWT_SECRET_HERE
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE

# Client Domain for Stripe Redirect
CLIENT_LOCALHOST_DOMAINE=http://localhost:5173

# Firebase Service Account Credentials
# NOTE: Ensure the private key includes actual newline characters (\n)
FIREBASE_PRIVATE_KEY_ID=YOUR_PRIVATE_KEY_ID
FIREBASE_PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE_INCLUDING_\n"
FIREBASE_CLIENT_EMAIL=YOUR_CLIENT_EMAIL
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
```

**Note:** Ensure the Firebase Service Account JSON file exists in the server root directory and is correctly imported using:

```js
require("./online-ticket-booking-platform-firebase-adminsdk.json");
```

---

## 🗺️ API Endpoint Guide

### 1️⃣ Users & Roles Management

| Method | Endpoint            | Security      | Description                                                       |
| ------ | ------------------- | ------------- | ----------------------------------------------------------------- |
| POST   | `/users`            | Public        | Creates a new user (default role: user). Prevents duplicate users |
| GET    | `/users`            | verifyFBToken | Retrieves all users                                               |
| GET    | `/user/role/:email` | verifyFBToken | Retrieves role of a specific user                                 |
| PATCH  | `/makeVendor/:id`   | Admin         | Updates user role to vendor                                       |
| PATCH  | `/makeAdmin/:id`    | Admin         | Updates user role to admin                                        |
| PATCH  | `/makeFraud/:id`    | Admin         | Marks vendor as fraud and hides all their tickets                 |

---

### 2️⃣ Ticket & Advertising Management

| Method | Endpoint                 | Security      | Description                                                 |
| ------ | ------------------------ | ------------- | ----------------------------------------------------------- |
| POST   | `/tickets`               | Vendor        | Adds a new ticket (status: pending, isHiddenByAdmin: false) |
| GET    | `/latest-tickets`        | Public        | Retrieves up to 8 latest approved tickets                   |
| GET    | `/approved-tickets`      | Public        | Retrieves all approved & visible tickets                    |
| GET    | `/tickets/:id`           | Public        | Retrieves single ticket details                             |
| GET    | `/vendor-tickets?email=` | verifyFBToken | Retrieves vendor-added tickets                              |
| PATCH  | `/tickets/:id`           | Vendor        | Updates ticket (status reset to pending)                    |
| DELETE | `/tickets/:id`           | Vendor        | Deletes vendor-added ticket                                 |

---

### 3️⃣ Admin Ticket Control

| Method | Endpoint                | Security | Description                          |
| ------ | ----------------------- | -------- | ------------------------------------ |
| GET    | `/ticketsAdmin`         | Admin    | Retrieves all tickets (Admin view)   |
| DELETE | `/ticketsAdmin/:id`     | Admin    | Deletes ticket                       |
| PATCH  | `/approve/:id`          | Admin    | Approves ticket & makes it visible   |
| PATCH  | `/reject/:id`           | Admin    | Rejects ticket & hides it            |
| PATCH  | `/ticketsAdvertise/:id` | Admin    | Toggles advertised status (max 7)    |
| GET    | `/ticketsAdvertised`    | Public   | Retrieves up to 6 advertised tickets |

---

### 4️⃣ Booking & Requests

| Method | Endpoint                    | Security      | Description                                 |
| ------ | --------------------------- | ------------- | ------------------------------------------- |
| POST   | `/tickets-booking`          | User          | Creates a booking request (status: pending) |
| GET    | `/user-tickets?email=`      | verifyFBToken | Retrieves user booking history              |
| GET    | `/requested-tickets?email=` | verifyFBToken | Retrieves vendor booking requests           |
| PATCH  | `/accept-booking/:id`       | Vendor        | Accepts booking request                     |
| PATCH  | `/reject-booking/:id`       | Vendor        | Rejects booking request                     |

---

### 5️⃣ Payment & Transactions

| Method | Endpoint                   | Security      | Description                             |
| ------ | -------------------------- | ------------- | --------------------------------------- |
| POST   | `/create-checkout-session` | User          | Creates Stripe Checkout Session         |
| POST   | `/payment-success`         | Public        | Handles Stripe payment success callback |
| GET    | `/transactions?email=`     | verifyFBToken | Retrieves buyer transaction history     |
| GET    | `/vendor-overview/:email`  | verifyFBToken | Retrieves vendor dashboard statistics   |

---

## 📌 Summary

This **TicketBari Server Application** ensures **secure authentication**, **role-based authorization**, **scalable ticket management**, and **reliable payment processing**, making it a **production-ready backend solution** suitable for real-world deployment.
