🎯 DonationFlow

> A simple and secure web-based donation management system built for learning and practice.



DonationFlow helps organize donation workflows by managing donors, cases, and donations with role-based access control and a clean admin dashboard.


---

🚀 Project Overview

DonationFlow is a full-stack web application that demonstrates:

Authentication & authorization using JWT

RESTful API design

MongoDB data modeling

Basic frontend-backend integration


The system is designed mainly for educational and training purposes.


---

🧩 Core Features

User authentication (JWT-based)

Role-based authorization (Admin / Donor / Staff)

Donor management (add / view / delete)

Charity case management

Donation tracking linked to donors and cases

Admin dashboard with statistics

Protected routes using middleware



---

🏗️ Tech Stack

Backend

Node.js

Express.js

MongoDB

Mongoose

JSON Web Token (JWT)


Frontend

HTML

CSS

Vanilla JavaScript



---

📁 Project Structure

DonationFlow/
│
├── middleware/        # Authentication & authorization
│   ├── auth.js
│   └── admin.js
│
├── models/            # Database schemas
│   ├── User.js
│   ├── Donor.js
│   ├── Case.js
│   └── Donation.js
│
├── public/            # Frontend pages
│   ├── *.html
│   └── styles.css
│
├── .env.example
├── .gitignore
├── package.json
└── server.js


---

⚙️ Environment Configuration

Create a .env file based on the example:

cp .env.example .env

Add the following values:

MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=3000


---

▶️ Running the Project

npm install
npm run start

Then open:

http://localhost:3000


---

🔐 Security Notes

JWT is used for authentication

Access control is handled via middleware

Tokens are stored in localStorage (for educational purposes)



---

📌 Future Improvements

Password hashing using bcrypt

Refresh tokens

Better role management

Modern frontend framework (React / Vue)

Unit & integration testing
