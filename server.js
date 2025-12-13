// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Donor = require('./models/Donor');
const CaseModel = require('./models/Case');
const Donation = require('./models/Donation');

const auth = require('./middleware/auth');
const adminOnly = require('./middleware/admin');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ================== Mongo ==================
async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  const uri =
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/donation_db';

  await mongoose.connect(uri);
}

// ================== AUTH ==================
app.post('/api/login', async (req, res) => {
  try {
    await connectDB();

    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ================== DONORS ==================
app.post('/api/donors', auth, async (req, res) => {
  await connectDB();
  const donor = await Donor.create(req.body);
  res.status(201).json(donor);
});

// ================== CASES ==================
app.post('/api/cases', auth, adminOnly, async (req, res) => {
  await connectDB();
  const c = await CaseModel.create(req.body);
  res.status(201).json(c);
});

// ================== DONATIONS ==================
app.post('/api/donations', auth, async (req, res) => {
  await connectDB();
  const d = await Donation.create(req.body);
  res.status(201).json(d);
});

// ================== EXPORT ONLY ==================
module.exports = { app, connectDB };
