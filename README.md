# FoodBridge — Surplus Food Sharing Platform

Connects hotels, bakeries, and event organizers with nearby NGOs and volunteers to rescue surplus food before it goes to waste.

## Features
- Food donation registration (name, type, quantity, expiry time, pickup address, contact)
- Pickup requests by volunteers/NGOs
- Donor and volunteer login (JWT-based auth, roles: donor / volunteer / ngo / admin)
- Donation history per user
- Dashboard: total donations, food rescued, pending pickups, active volunteers

## Tech Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Auth:** JWT + bcrypt password hashing

## Project Structure
```
foodbridge/
├── server.js              # Express app entry point
├── config/db.js           # MongoDB connection
├── models/
│   ├── User.js             # donor / volunteer / ngo / admin
│   └── Donation.js         # food listing + status lifecycle
├── middleware/auth.js      # JWT verification + role guard
├── routes/
│   ├── authRoutes.js       # register / login
│   └── donationRoutes.js   # CRUD, pickup requests, dashboard stats
├── public/                 # frontend
│   ├── index.html
│   ├── css/style.css
│   └── js/script.js
├── .env.example
└── package.json
```

## Setup

1. **Install dependencies**
   ```bash
   cd foodbridge
   npm install
   ```

2. **Configure environment**
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   ```
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/foodbridge
   JWT_SECRET=change_this_to_a_long_random_secret
   ```
   If you don't have MongoDB installed locally, use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and paste its connection string as `MONGO_URI`.

3. **Run the app**
   ```bash
   npm start          # production
   npm run dev         # auto-restart with nodemon
   ```

4. Open **http://localhost:5000** in your browser.

## How the Donation Lifecycle Works
`available` → volunteer/NGO clicks **Request Pickup** → `requested` → volunteer marks it picked up → `picked_up`.
Donations past their `expiryTime` are automatically flagged `expired` whenever the donation list is fetched.

## API Overview

| Method | Endpoint                        | Access           | Description                     |
|--------|----------------------------------|------------------|----------------------------------|
| POST   | `/api/auth/register`             | Public           | Create donor/volunteer/NGO account |
| POST   | `/api/auth/login`                | Public           | Login, returns JWT               |
| POST   | `/api/donations`                 | Donor/NGO/Admin  | Register surplus food            |
| GET    | `/api/donations?status=available`| Logged in        | List donations (optional filter) |
| GET    | `/api/donations/mine`            | Logged in        | My donation/pickup history       |
| PUT    | `/api/donations/:id/request`     | Volunteer/NGO    | Request a pickup                 |
| PUT    | `/api/donations/:id/complete`    | Volunteer/NGO    | Mark as picked up                |
| PUT    | `/api/donations/:id/cancel`      | Logged in        | Cancel a donation                |
| GET    | `/api/donations/stats/dashboard` | Logged in        | Dashboard counts                 |

## Ideas for Extending This Project
- Add geolocation so volunteers see donations sorted by distance
- Email/SMS notifications when new food is listed near a volunteer
- Image upload for the food item
- Admin panel to verify NGOs before they can request pickups
- Rating/feedback system between donors and volunteers
