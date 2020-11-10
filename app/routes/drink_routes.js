// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for drinks
const Drink = require('../models/drink')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { drink: { title: '', text: 'foo' } } -> { drink: { text: 'foo' } }
// const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /drinks
router.get('/drinks', requireToken, (req, res, next) => {
  Drink.find({event: req.event.id})
    .then(drinks => {
      // `drinks` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return drinks.map(drink => drink.toObject())
    })
    // respond with status 200 and JSON of the drinks
    .then(drinks => res.status(200).json({ drinks: drinks }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /drinks
router.post('/drinks', requireToken, (req, res, next) => {
  // set owner of new drink to be current user
  req.body.drink.event = req.event.id

  Drink.create(req.body.drink)
    // respond to succesful `create` with status 201 and JSON of new "drink"
    .then(drink => {
      res.status(201).json({ drink: drink.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// DESTROY
// DELETE /drinks/5a7db6c74d55bc51bdf39793
router.delete('/drinks/:id', requireToken, (req, res, next) => {
  Drink.findById(req.params.id)
    .then(handle404)
    .then(drink => {
      // throw an error if current user doesn't own `drink`
      requireOwnership(req, drink)
      // delete the drink ONLY IF the above didn't throw
      drink.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
