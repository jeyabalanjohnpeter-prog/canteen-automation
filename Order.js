const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: String },
  user: { type: String, required: true },
  item: { type: String, required: true },
  qty: { type: Number, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Approved', 'Rejected', 'Finished'], default: 'Pending' },
  price: { type: String, required: true },
  payment: { type: String, default: 'Not Paid' },
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
