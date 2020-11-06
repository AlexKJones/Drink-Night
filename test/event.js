process.env.TESTENV = true

let Event = require('../app/models/event.js')
let User = require('../app/models/user')

const crypto = require('crypto')

let chai = require('chai')
let chaiHttp = require('chai-http')
let server = require('../server')
chai.should()

chai.use(chaiHttp)

const token = crypto.randomBytes(16).toString('hex')
let userId
let eventId

describe('events', () => {
  const eventParams = {
    name: 'wine time',
    date: '10-5-20'
  }

  before(done => {
    Event.deleteMany({})
      .then(() => User.create({
        email: 'caleb',
        hashedPassword: '12345',
        token
      }))
      .then(user => {
        userId = user._id
        return user
      })
      .then(() => Event.create(Object.assign(eventParams, {owner: userId})))
      .then(record => {
        eventId = record._id
        done()
      })
      .catch(console.error)
  })

  describe('GET /events', () => {
    it('should get all the events', done => {
      chai.request(server)
        .get('/events')
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.events.should.be.a('array')
          res.body.events.length.should.be.eql(1)
          done()
        })
    })
  })

  describe('GET /events/:id', () => {
    it('should get one event', done => {
      chai.request(server)
        .get('/events/' + eventId)
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.event.should.be.a('object')
          res.body.event.title.should.eql(eventParams.title)
          done()
        })
    })
  })

  describe('DELETE /events/:id', () => {
    let eventId

    before(done => {
      Event.create(Object.assign(eventParams, { owner: userId }))
        .then(record => {
          eventId = record._id
          done()
        })
        .catch(console.error)
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .delete('/events/' + eventId)
        .set('Authorization', `Bearer notarealtoken`)
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should be succesful if you own the resource', done => {
      chai.request(server)
        .delete('/events/' + eventId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('should return 404 if the resource doesn\'t exist', done => {
      chai.request(server)
        .delete('/events/' + eventId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(404)
          done()
        })
    })
  })

  describe('POST /events', () => {
    it('should not POST an event without a title', done => {
      let noTitle = {
        text: 'Untitled',
        owner: 'fakedID'
      }
      chai.request(server)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ event: noTitle })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not POST an event without text', done => {
      let noText = {
        title: 'Not a very good event, is it?',
        owner: 'fakeID'
      }
      chai.request(server)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ event: noText })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not allow a POST from an unauthenticated user', done => {
      chai.request(server)
        .post('/events')
        .send({ event: eventParams })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should POST an event with the correct params', done => {
      let validevent = {
        title: 'I ran a shell command. You won\'t believe what happened next!',
        text: 'it was rm -rf / --no-preserve-root'
      }
      chai.request(server)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ event: validevent })
        .end((e, res) => {
          res.should.have.status(201)
          res.body.should.be.a('object')
          res.body.should.have.property('event')
          res.body.event.should.have.property('title')
          res.body.event.title.should.eql(validevent.title)
          done()
        })
    })
  })

  describe('PATCH /events/:id', () => {
    let eventId

    const fields = {
      title: 'Find out which HTTP status code is your spirit animal',
      text: 'Take this 4 question quiz to find out!'
    }

    before(async function () {
      const record = await Event.create(Object.assign(eventParams, { owner: userId }))
      eventId = record._id
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .patch('/events/' + eventId)
        .set('Authorization', `Bearer notarealtoken`)
        .send({ event: fields })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should update fields when PATCHed', done => {
      chai.request(server)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ event: fields })
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('shows the updated resource when fetched with GET', done => {
      chai.request(server)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.event.title.should.eql(fields.title)
          res.body.event.text.should.eql(fields.text)
          done()
        })
    })

    it('doesn\'t overwrite fields with empty strings', done => {
      chai.request(server)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ event: { text: '' } })
        .then(() => {
          chai.request(server)
            .get(`/events/${eventId}`)
            .set('Authorization', `Bearer ${token}`)
            .end((e, res) => {
              res.should.have.status(200)
              res.body.should.be.a('object')
              // console.log(res.body.event.text)
              res.body.event.title.should.eql(fields.title)
              res.body.event.text.should.eql(fields.text)
              done()
            })
        })
    })
  })
})
