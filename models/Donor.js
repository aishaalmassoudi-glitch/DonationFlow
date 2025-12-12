const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DonorSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donor', DonorSchema);
