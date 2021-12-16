const express = require('express')
const nedb = require('nedb')
const { use } = require('passport/lib')

const router = express.Router()

//init nedb
const avocatRooms = new nedb({ filename: 'avocatrooms', autoload: true })
const avocatPlayers = new nedb({ filename: 'avocatplayers', autoload: true })

router.get('/join', (req, res) => {
  const { room_id, username } = req.query ? req.query : ''
  let problemInProcess
  if (room_id === '' || username === '')
    problemInProcess = 'roomId or username isnt valid'
  // check if the room a lready exist
  avocatRooms.findOne({ roomId: room_id }, (err, room) => {
    if (err) problemInProcess = 'failed'
    if (!room) problemInProcess = 'room does not exist !'
    // si la room n'existe pas on cherche si il existe un player du même pseudo qui est dans cette room
    if (!problemInProcess) {
      avocatPlayers.findOne(
        { $and: [{ username: username }, { room: room_id }] },
        (err, player) => {
          if (err) problemInProcess = 'failed'
          if (player) problemInProcess = 'this pseudo already exist in this room'
          // et enfin si la room exist et qu'aucun joueur du même pseudo est dedans on créer le joueur
          if (!problemInProcess) {
            let user = { username: username, isReady: false, room: room_id }
            avocatPlayers.insert(user)
            console.log(`room ${room_id} joined by ${username}.`)
            res.status(201).send(room)
          } else res.status(401).send({ message: `${problemInProcess}` }) // si il y à une quelconque erreur
        }
      )
    } else res.status(401).send({ message: `${problemInProcess}` }) // si il y à une quelconque erreur
  })
})

router.get('/create', (req, res) => {
  const { room_id, username } = req.query ? req.query : ''
  let problemInProcess
  if (room_id === '' || username === '') error = 'roomId or username isnt valid'
  avocatRooms.findOne({ roomId: room_id }, (err, room) => {
    console.log(room)
    // check if the room already exist
    if (err) problemInProcess = 'failed'
    if (room) {
      problemInProcess = 'room already exist !'
    }
    //si la room n'existe pas on la créer et on ajouter un user qui est affilié à cette room et on envoye la room au client
    if (!problemInProcess) {
      let room = { roomId: room_id }
      avocatRooms.insert(room)
      let user = { username: username, isReady: false, room: room_id }
      avocatPlayers.insert(user)
      console.log(`room ${room_id} create by ${username}.`)
      res.status(201).send(room)
    } else res.status(401).send({ message: `${problemInProcess}` }) // si il y à une quelconque erreur
  })
})

module.exports = router
