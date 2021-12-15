const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const Datastore = require('nedb')
const cors = require('cors')
const express = require('express')
const session = require('express-session')
const passport = require('passport')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const app = express()

app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.json())
app.use(session({ secret: 'chatchienlapin', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

http.createServer(app).listen(3001, () => {
  console.log('Server listening on port 3000')
})
