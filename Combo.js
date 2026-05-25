const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  name: { type: String, required: true },
  items: { type: String, required: true },
  price: { type: Number, required: true },
  img: { type: String, required: true }
});

module.exports = mongoose.model('Combo', comboSchema);
