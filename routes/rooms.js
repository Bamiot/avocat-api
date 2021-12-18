const express = require('express')
const nedb = require('nedb')
const { use } = require('passport/lib')

const router = express.Router()

//init nedb
const avocatRooms = new nedb({ filename: 'avocatrooms', autoload: true })
const avocatPlayers = new nedb({ filename: 'avocatplayers', autoload: true })

router.get('/join', (req, res) => {
  const { room_id, username } = req.query ? req.query : ''
  if (room_id !== '' && username !== '') {
    // check if the room a lready exist
    avocatRooms.findOne({ roomId: room_id }, (err, room) => {
      if (err) res.status(400).send({ error: 'failed' })
      else if (!room) res.status(400).send({ error: 'room does not exist !' })
      else if (room.private && room.password !== req.query.password)
        res.status(400).send({ error: 'wrong password' })
      // si la room n'existe pas on cherche si il existe un player du même pseudo qui est dans cette room
      else {
        avocatPlayers.findOne(
          { $and: [{ username: username }, { room: room_id }] },
          (err, player) => {
            if (err) res.status(400).send({ error: 'failed' })
            else if (player)
              res.status(400).send({ error: 'this pseudo already exist in this room' })
            // et enfin si la room exist et qu'aucun joueur du même pseudo est dedans on créer le joueur
            else {
              let user = { username: username, isReady: false, room: room_id }
              avocatPlayers.insert(user)
              console.log(`room ${room_id} joined by ${username}.`)
              res.status(201).send(room)
            }
          }
        )
      }
    })
  } else res.status(400).json({ error: 'roomId or username isnt valid' })
})

router.get('/create', (req, res) => {
  const { room_id, username, password } = req.query
  if (room_id !== '' && username !== '') {
    avocatRooms.findOne({ roomId: room_id }, (err, room) => {
      if (err) res.status(400).send({ error: 'failed' })
      else if (room) res.status(400).send({ error: 'room already exist !' })
      else {
        let room =
          password && password.length > 2
            ? { roomId: room_id, password }
            : { roomId: room_id }
        avocatRooms.insert(room)
        let user = { username: username, isReady: false, room: room_id }
        avocatPlayers.insert(user)
        console.log(`room ${room_id} create by ${username}.`)
        res.status(201).send(room)
      }
    })
  } else res.status(400).send({ error: 'roomId or username isnt valid' })
})

router.get('/publicRooms', (req, res) => {})
module.exports = router
