// server.js
// Express server: routes for auth, donors, cases, donations, reports.
// Comments: concise explanations for each section.

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

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/donation_db';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('✔ Connected to MongoDB');
    // Dev helper: create default admin if no users
    const count = await User.countDocuments();
    if (count === 0) {
      const hash = await bcrypt.hash('admin', 10);
      await User.create({ username: 'admin', passwordHash: hash, role: 'admin', name: 'Administrator' });
      console.log('⚠ Default admin created: admin / admin (change password!)');
    }
  })
  .catch(err => {
    console.error('Mongo error:', err.message);
    process.exit(1);
  });

// ----------------- AUTH -----------------

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    if (await User.findOne({ username })) return res.status(400).json({ error: 'Username exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash: hash, role: role || 'donor', name });
    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Register failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: user.role, username: user.username, name: user.name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ----------------- DASHBOARD -----------------

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const donorsCount = await Donor.countDocuments();
    const casesCount = await CaseModel.countDocuments();
    const agg = await Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalDonations = agg[0]?.total || 0;
    res.json({ donorsCount, casesCount, totalDonations });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Dashboard error' });
  }
});

// ----------------- DONORS -----------------

// List donors with donations count
app.get('/api/donors', auth, async (req, res) => {
  try {
    const donors = await Donor.find().lean();
    const counts = await Donation.aggregate([{ $group: { _id: '$donorId', count: { $sum: 1 } } }]);
    const map = {};
    counts.forEach(c => { if (c._id) map[c._id.toString()] = c.count; });
    const out = donors.map(d => ({ ...d, donationsCount: map[d._id.toString()] || 0 }));
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Donors error' });
  }
});

// Add donor
app.post('/api/donors', auth, async (req, res) => {
  try {
    const doc = await Donor.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Add donor failed' });
  }
});

// Delete donor (and their donations)
app.delete('/api/donors/:id', auth, async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    await Donation.deleteMany({ donorId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Delete donor failed' });
  }
});

// ----------------- CASES -----------------

// List cases
app.get('/api/cases', auth, async (req, res) => {
  try {
    const cases = await CaseModel.find().lean();
    res.json(cases);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cases error' });
  }
});

// Create case (admin only)
app.post('/api/cases', auth, adminOnly, async (req, res) => {
  try {
    const doc = await CaseModel.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Add case failed' });
  }
});

// Update case (admin only)
app.put('/api/cases/:id', auth, adminOnly, async (req, res) => {
  try {
    const updated = await CaseModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Update case failed' });
  }
});

// Delete case (admin only) — also remove donations
app.delete('/api/cases/:id', auth, adminOnly, async (req, res) => {
  try {
    await CaseModel.findByIdAndDelete(req.params.id);
    await Donation.deleteMany({ caseId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Delete case failed' });
  }
});

// ----------------- DONATIONS -----------------

// List donations (admin/staff see all; donors can optionally filter)
// Return populated donor & case names
app.get('/api/donations', auth, async (req, res) => {
  try {
    const list = await Donation.find().sort({ date: -1 }).populate('donorId').populate('caseId').lean();
    const out = list.map(d => ({
      _id: d._id,
      donorName: d.donorId?.name || '-',
      caseName: d.caseId?.caseName || '-',
      amount: d.amount,
      date: d.date,
      description: d.description,
      userId: d.userId
    }));
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Donations error' });
  }
});

// Donations by current logged-in user
app.get('/api/donations/me', auth, async (req, res) => {
  try {
    const list = await Donation.find({ userId: req.user.id }).sort({ date: -1 }).populate('caseId').lean();
    res.json(list.map(d => ({ _id: d._id, caseName: d.caseId?.caseName || '-', amount: d.amount, date: d.date, description: d.description })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Donations (me) error' });
  }
});

// Create donation and increment Case.receivedAmount
app.post('/api/donations', auth, async (req, res) => {
  try {
    const { donorId, caseId, amount, description } = req.body;
    if (!donorId || !caseId || !amount) return res.status(400).json({ error: 'Missing fields' });

    const donation = await Donation.create({ donorId, caseId, amount, description, userId: req.user.id });
    await CaseModel.findByIdAndUpdate(caseId, { $inc: { receivedAmount: amount } });
    res.status(201).json(donation);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Add donation failed' });
  }
});

// Update donation — adjust Case.receivedAmount by diff if amount changes
app.put('/api/donations/:id', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const old = await Donation.findById(req.params.id);
    if (!old) return res.status(404).json({ error: 'Not found' });

    const updated = await Donation.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (amount != null && amount !== old.amount) {
      const diff = amount - old.amount;
      await CaseModel.findByIdAndUpdate(updated.caseId, { $inc: { receivedAmount: diff } });
    }

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Update donation failed' });
  }
});

// Delete donation and subtract from case
app.delete('/api/donations/:id', auth, async (req, res) => {
  try {
    const d = await Donation.findById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });

    await Donation.findByIdAndDelete(req.params.id);
    await CaseModel.findByIdAndUpdate(d.caseId, { $inc: { receivedAmount: -d.amount } });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Delete donation failed' });
  }
});

// ----------------- REPORTS (admin only) -----------------

app.get('/api/reports', auth, adminOnly, async (req, res) => {
  try {
    const donorsCount = await Donor.countDocuments();
    const casesCount = await CaseModel.countDocuments();
    const agg = await Donation.aggregate([{ $group: { _id: '$caseId', total: { $sum: '$amount' } } }]);
    const byCase = await Promise.all(agg.map(async a => {
      const c = await CaseModel.findById(a._id).lean();
      return { caseId: a._id, caseName: c?.caseName || 'Unknown', totalAmount: a.total, requiredAmount: c?.requiredAmount || 0 };
    }));
    const totalAgg = await Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalDonations = totalAgg[0]?.total || 0;
    res.json({ donorsCount, casesCount, totalDonations, caseTotals: byCase });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Reports error' });
  }
});

// Serve index (login page)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
