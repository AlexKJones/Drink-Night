const mongoose = require('mongoose')

const Drink = require('./drink')

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  drinks: { type: mongoose.Schema.Types.Object, ref: 'Drink' },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Event', eventSchema)
