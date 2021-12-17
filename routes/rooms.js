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
      if (err) res.status(400).json({ message: 'failed' })
      else if (!room) res.status(400).json({ message: 'room does not exist !' })
      // si la room n'existe pas on cherche si il existe un player du même pseudo qui est dans cette room
      else {
        avocatPlayers.findOne(
          { $and: [{ username: username }, { room: room_id }] },
          (err, player) => {
            if (err) res.status(400).json({ message: 'failed' })
            else if (player)
              res.status(400).json({ message: 'this pseudo already exist in this room' })
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
  } else res.status(400).json({ message: 'roomId or username isnt valid' })
})

router.get('/create', (req, res) => {
  const { room_id, username } = req.query
  if (room_id !== '' && username !== '') {
    avocatRooms.findOne({ roomId: room_id }, (err, room) => {
      if (err) res.status(400).send({ message: 'failed' })
      else if (room) res.status(400).send({ message: 'room already exist !' })
      else {
        let room = { roomId: room_id }
        avocatRooms.insert(room)
        let user = { username: username, isReady: false, room: room_id }
        avocatPlayers.insert(user)
        console.log(`room ${room_id} create by ${username}.`)
        res.status(201).send(room)
      }
    })
  } else res.status(400).send({ message: 'roomId or username isnt valid' })
})

module.exports = router
