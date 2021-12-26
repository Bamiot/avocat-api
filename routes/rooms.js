const express = require('express')
const router = express.Router()

const dbHandle = require('../utils/DBHandle')

router.get('/create', async (req, res) => {
  const { room_id, username, password, maxplayers } = req.query
  if (room_id !== '' && username !== '') {
    dbHandle
      .createRoom(room_id, username, password, maxplayers)
      .then((room) => {
        dbHandle.addPlayer(room_id, username)
        res.status(201).send({ room })
      })
      .catch((error) => {
        res.status(400).send({ error })
      })
  } else res.status(400).send({ error: 'roomId or username isnt valid' })
})

router.get('/join', async (req, res) => {
  const { room_id, username, password } = req.query
  if (room_id !== '' && username !== '') {
    dbHandle
      .addPlayer(room_id, username, password)
      .then((user) => {
        res.status(201).send({ user })
      })
      .catch((error) => {
        res.status(400).send({ error })
      })
  } else res.status(400).send({ error: 'roomId or username isnt valid' })
})

router.get('/publicRooms', async (req, res) => {
  await dbHandle
    .getRooms()
    .then((rooms) => {
      res.status(200).send({ rooms })
    })
    .catch((error) => {
      res.status(400).send({ error })
    })
})

module.exports = router
