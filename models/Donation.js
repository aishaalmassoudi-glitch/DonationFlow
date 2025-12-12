const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DonationSchema = new Schema({
  donorId: { type: Schema.Types.ObjectId, ref: 'Donor', required: true },
  caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donation', DonationSchema);
