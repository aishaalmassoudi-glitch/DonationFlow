// models/Case.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CaseSchema = new Schema({
  caseName: { type: String, required: true },
  description: { type: String },
  needType: { type: String },
  requiredAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Case', CaseSchema);
