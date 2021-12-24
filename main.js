// const fs = require('fs')
// const path = require('path')
const http = require('http')
//const https = require('https')
const cors = require('cors')
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const redis = require('redis')

const dbHandle = require('./utils/DBHandle')
require('./utils/socket')

// constants
const PORT = 3001

// session store
let RedisStore = require('connect-redis')(session)
let redisClient = redis.createClient()
redisClient.on('error', console.error)

// Initialize Express and middlewares
const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.json())
app.use(session({ secret: 'chatchienlapin', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(
  session({
    secret: 'lemotdepassedavantetaisclaqueausol',
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({ client: redisClient }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
  })
)
passport.serializeUser((user, done) => {
  done(null, user)
})
passport.deserializeUser((user, done) => {
  done(null, user)
})

//routes
app.use('/rooms', require('./routes/rooms'))

// auth
app.get('/auth', (req, res) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/'
  })
})

http.createServer(app).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
