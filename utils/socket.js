const { createServer } = require('http')
const express = require('express')
const { Server } = require('socket.io')
const { instrument } = require('@socket.io/admin-ui')

const socketApp = express()
const httpServer = createServer(socketApp)
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3001', 'https://admin.socket.io'],
    credentials: true
  }
})

const dbHandle = require('../utils/DBHandle')

// server listener
io.on('connection', (socket) => {
  console.log(`${socket.id} is logged`)

  const mError = (type) => {
    let message = []
    for (let i = 1; i < arguments.length; i++) message.push(arguments[i])
    socket.emit('error', { type, error: message })
    console.error(`[socket.js] ${type} :`, ...message)
  }

  socket.on('join', async ({ roomId, username }) => {
    const { player, error } = await dbHandle.isPlayerInRoom(roomId, username)
    if (error) mError('join', error)
    else if (player) {
      if (player.socketId) mError('join', 'player already connected')
      else {
        const { room, error } = await dbHandle.getRoom(roomId)
        if (error) mError('join', error)
        else {
          socket.join(roomId)
          await dbHandle.addSocketId(roomId, username, socket.id)
          await dbHandle.changeOnlineStatus(roomId, username, true)
          console.log(`${username} joined ${roomId}`)
          socket.emit('join', socket.id)
          io.to(roomId).emit('players', room.players)
          io.to(roomId).emit('room', room)
        }
      }
    }
  })

  socket.on('reconnect', async ({ roomId, username, socketId }) => {
    const { player, error } = await dbHandle.isPlayerInRoom(roomId, username)
    if (error) mError('reconnect', error)
    else if (player) {
      if (player.socketId && player.socketId === socketId) {
        socket.join(roomId)
        console.log('reconnect', socketId, player.socketId)
        await dbHandle.addSocketId(roomId, username, socket.id)
        await dbHandle.changeOnlineStatus(roomId, username, true)
        const { room, error } = await dbHandle.getRoom(roomId)
        if (error) mError('reconnect', error)
        else {
          socket.emit('join', socket.id)
          io.to(roomId).emit('players', room.players)
        }
      } else if (player.socketId && player.socketId !== socketId)
        mError('reconnect', `socketId not match ${socketId}`)
      else mError('reconnect', `player not connected`)
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(`${socket.id} is disconnected for ${reason}`)
    const { player, error } = dbHandle.getPlayerBySocketId(socket.id)
    if (player) {
      dbHandle.changeOnlineStatus(player.room, player.username, false)
      socket.leave(player.room)
    } else if (error) mError('disconnect', error)
  })

  socket.on('leave', async ({ roomId, username }) => {
    const { player, error } = await dbHandle.isPlayerInRoom(roomId, username)
    if (error) mError('leave', error)
    else if (player) {
      socket.leave(player.room)
      console.log(`${username} leave ${roomId}`)
      socket.emit('leave')
      await dbHandle.removePlayer(roomId, username)
      const { room, error } = await dbHandle.getRoom(roomId)
      if (error) mError('leave', error)
      else io.to(roomId).emit('players', room.players)
    }
  })

  socket.on('ready', async ({ roomId, username, ready }) => {
    const { player, error } = await dbHandle.isPlayerInRoom(roomId, username)
    if (error) mError('ready', error)
    else if (player) {
      await dbHandle.changePlayerReady(roomId, username, ready)
      const { room, error } = await dbHandle.getRoom(roomId)
      if (error) mError('ready', error)
      else {
        io.to(roomId).emit('players', room.players)
        io.to(roomId).emit('room', room)
      }
    }
  })

  socket.on('avocat', async ({ roomId, username, roomState, action }) => {
    const { room, error } = await dbHandle.getRoom(roomId)
    if (error) {
      console.log(error, roomId)
      socket.emit('error', `${error}, ${roomId}`)
    } else if (room) {
      let player
      for (p of room.players) if (p.username === username) player = p
      if (!player) {
        console.log('player not found !')
        socket.emit('error', 'player not found !')
      } else {
        socket.emit(`avocat`, room)
      }
    }
  })
})

instrument(io, {
  auth: false
})

httpServer.listen(3002).addListener('listening', () => {
  console.log('listening on 3002')
})
