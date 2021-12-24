const express = require('express')
const router = express.Router()

const dbHandle = require('../utils/DBHandle')

router.get('/create', async (req, res) => {
  const { room_id, username, password, maxplayers } = req.query
  if (room_id !== '' && username !== '') {
    const { room, error } = await dbHandle.createRoom(
      room_id,
      username,
      password,
      maxplayers
    )
    if (error) res.status(400).send({ error })
    else {
      dbHandle.addPlayer(room_id, username)
      res.status(201).send({ room })
    }
  } else res.status(400).send({ error: 'roomId or username isnt valid' })
})

router.get('/join', async (req, res) => {
  const { room_id, username, password } = req.query
  if (room_id !== '' && username !== '') {
    const { user, error } = await dbHandle.addPlayer(room_id, username, password)
    if (error) res.status(400).send({ error })
    else res.status(201).send({ user })
  } else res.status(400).send({ error: 'roomId or username isnt valid' })
})

router.get('/leave', async (req, res) => {
  const { room_id, username } = req.query
  if (room_id !== '' && username !== '') {
    const { user, error } = await dbHandle.removePlayer(room_id, username)
    if (error) res.status(400).send({ error })
    else res.status(201).send({ user })
  } else res.status(400).send({ error: 'roomId or username isnt valid' })
})

router.get('/publicRooms', async (req, res) => {
  const { rooms, error } = await dbHandle.getRooms()
  if (error) res.status(400).send({ error })
  else res.status(201).send({ rooms })
})

router.get('/ready', async (req, res) => {
  const { roomId, username } = req.query
  const { message, error } = await dbHandle.changePlayerReady(roomId, username)
  if (error) res.status(400).send({ error })
  else res.status(201).send({ message })
})

module.exports = router
