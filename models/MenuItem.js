const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true, enum: ['breakfast', 'lunch', 'tea'] }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
