const mongoose = require('mongoose')

const drinkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  alcohol: {
    type: Number,
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Drink', drinkSchema)
