// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Donor = require('./models/Donor');
const CaseModel = require('./models/Case');
const Donation = require('./models/Donation');

const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/donation_db';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('✔ Connected to MongoDB'))
  .catch(err => { console.error('❌ MongoDB Error:', err.message); process.exit(1); });

// ------------------ Auth Routes ------------------

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash: hash, role: role || 'staff' });

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Register error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login error' });
  }
});

// ------------------ Dashboard ------------------
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const donorsCount = await Donor.countDocuments();
    const casesCount = await CaseModel.countDocuments();
    const agg = await Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalDonations = agg[0] ? agg[0].total : 0;
    const recentCases = await CaseModel.find().sort({ createdAt: -1 }).limit(5).lean();
    res.json({ donorsCount, casesCount, totalDonations, recentCases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dashboard error' });
  }
});

// ------------------ Donors ------------------
// GET donors (protected)
app.get('/api/donors', auth, async (req, res) => {
  try {
    const donors = await Donor.find().lean();
    // count donations per donor
    const counts = await Donation.aggregate([{ $group: { _id: '$donorId', count: { $sum: 1 } } }]);
    const map = {};
    counts.forEach(c => { if (c._id) map[c._id.toString()] = c.count; });
    const out = donors.map(d => ({ ...d, donationsCount: map[d._id.toString()] || 0 }));
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Donors error' });
  }
});

// POST donor (protected)
app.post('/api/donors', auth, async (req, res) => {
  try {
    const doc = await Donor.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Add donor error' });
  }
});

// DELETE donor (protected)
app.delete('/api/donors/:id', auth, async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete donor error' });
  }
});

// ------------------ Cases ------------------
app.get('/api/cases', auth, async (req, res) => {
  try {
    const cases = await CaseModel.find().lean();
    res.json(cases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cases error' });
  }
});

app.post('/api/cases', auth, async (req, res) => {
  try {
    const doc = await CaseModel.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Add case error' });
  }
});

app.delete('/api/cases/:id', auth, async (req, res) => {
  try {
    await CaseModel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete case error' });
  }
});

// ------------------ Donations ------------------
app.get('/api/donations', auth, async (req, res) => {
  try {
    const list = await Donation.find().sort({ date: -1 }).populate('donorId').populate('caseId').lean();
    const out = list.map(d => ({ _id: d._id, donorName: d.donorId?.name || '-', caseName: d.caseId?.caseName || '-', amount: d.amount, date: d.date }));
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Donations error' });
  }
});

app.post('/api/donations', auth, async (req, res) => {
  try {
    const { donorId, caseId, amount } = req.body;
    if (!donorId || !caseId || !amount) return res.status(400).json({ error: 'Missing fields' });
    const donation = await Donation.create({ donorId, caseId, amount });
    await CaseModel.findByIdAndUpdate(caseId, { $inc: { receivedAmount: amount } });
    res.status(201).json(donation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Add donation error' });
  }
});

// ------------------ Reports ------------------
app.get('/api/reports', auth, async (req, res) => {
  try {
    const donorsCount = await Donor.countDocuments();
    const casesCount = await CaseModel.countDocuments();
    const agg = await Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalDonations = agg[0] ? agg[0].total : 0;
    const byCase = await CaseModel.find().lean();
    res.json({ totalDonations, donorsCount, casesCount, byCase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reports error' });
  }
});

// Serve index (login page)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
