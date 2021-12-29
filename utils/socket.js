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
const avocatGameApi = require('./avocatGame/avocatGameApi')

function getInitState(players) {
  for (const player of players) {
    player.cards = []
    player.hand = ''
  }
  return {
    state: {
      deck: [],
      pit: [],
      currentPlayer: '',
      players: players
    },
    queue: [{ type: 'init' }]
  }
}

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
    dbHandle
      .isPlayerInRoom(roomId, username)
      .catch((error) => mError('join', error))
      .then((player) => {
        if (player.socketId) mError('join', 'player already connected')
        else {
          dbHandle
            .getRoom(roomId)
            .catch((error) => mError('join', error))
            .then(async (room) => {
              socket.join(roomId)
              await dbHandle.addSocketId(roomId, username, socket.id)
              await dbHandle.changeOnlineStatus(roomId, username, true)
              console.log(`${username} joined ${roomId}`)
              socket.emit('join', socket.id)
              io.to(roomId).emit('players', room.players)
              io.to(roomId).emit('room', room)
            })
        }
      })
  })

  socket.on('reconnect', async ({ roomId, username, socketId }) => {
    dbHandle
      .isPlayerInRoom(roomId, username)
      .catch((error) => mError('reconnect', error))
      .then(async (player) => {
        if (player.socketId && player.socketId === socketId) {
          socket.join(roomId)
          console.log('reconnect', socketId, player.socketId)
          await dbHandle.addSocketId(roomId, username, socket.id)
          await dbHandle.changeOnlineStatus(roomId, username, true)
          dbHandle
            .getRoom(roomId)
            .catch((error) => mError('reconnect', error))
            .then((room) => {
              socket.emit('join', socket.id)
              io.to(roomId).emit('players', room.players)
            })
        } else if (player.socketId && player.socketId !== socketId)
          mError('reconnect', `socketId not match ${socketId}`)
        else mError('reconnect', `player not connected`)
      })
  })

  socket.on('disconnect', (reason) => {
    console.log(`${socket.id} is disconnected for ${reason}`)
    dbHandle
      .getPlayerBySocketId(socket.id)
      .then((player) => {
        dbHandle
          .getRoom(player.room)
          .then((room) => {
            dbHandle.changeOnlineStatus(player.room, player.username, false)
            socket.leave(player.room)
            console.log(`${player.username} disconnected from ${player.room}`)
            room.players[
              room.players.findIndex((p) => p.username === player.username)
            ].online = false
            io.to(player.room).emit('players', room.players)
          })
          .catch((error) => mError('disconnect', error))
      })
      .catch((error) => {
        mError('disconnect', error)
      })
  })

  socket.on('leave', async ({ roomId, username }) => {
    dbHandle
      .isPlayerInRoom(roomId, username)
      .catch((error) => {
        mError('leave', error)
      })
      .then(async (player) => {
        socket.leave(player.room)
        console.log(`${username} leave ${roomId}`)
        socket.emit('leave')
        await dbHandle.removePlayer(roomId, username)
        dbHandle
          .getRoom(roomId)
          .catch((error) => {
            mError('leave', error)
          })
          .then((room) => {
            io.to(roomId).emit('players', room.players)
          })
      })
  })

  socket.on('kick', async ({ roomId, kickedPlayerName }) => {
    dbHandle
      .getRoom(roomId)
      .catch((error) => mError('kick', error))
      .then(async (room) => {
        if (room.owner === kickedPlayerName) mError('kick', 'host can not be kicked')
        else {
          const { players } = room
          const owner = players.find((player) => player.socketId === socket.id)
          const kickedPlayer = players.find(
            (player) => player.username === kickedPlayerName
          )
          if (!owner) mError('kick', 'you are not the owner')
          else if (!kickedPlayer) mError('kick', 'player not found')
          else {
            dbHandle
              .removePlayer(roomId, kickedPlayer.username)
              .catch((error) => mError('kick', error))
              .then(async () => {
                dbHandle
                  .getRoom(roomId)
                  .catch((error) => mError('kick', error))
                  .then(async (newRoom) => {
                    io.to(kickedPlayer.socketId).emit('leave')
                    io.to(roomId).emit('players', newRoom.players)
                    console.log(`${kickedPlayer.username} is kicked from ${roomId}`)
                  })
              })
          }
        }
      })
  })

  socket.on('ready', async ({ roomId, username, ready }) => {
    dbHandle
      .isPlayerInRoom(roomId, username)
      .catch((error) => mError('ready', error))
      .then(async (player) => {
        await dbHandle.changePlayerReady(roomId, username, ready)
        dbHandle
          .getRoom(roomId)
          .then(async (room) => {
            io.to(roomId).emit('players', room.players)
            io.to(roomId).emit('room', room)
            console.log(`${username} is ${ready ? 'ready' : 'unready'}`)
          })
          .catch((error) => mError('ready', error))
      })
  })

  socket.on('start', async ({ roomId, username }) => {
    dbHandle
      .getRoom(roomId)
      .catch((error) => mError('start', error))
      .then(async (room) => {
        const owner = room.players.find((player) => player.socketId === socket.id)
        if (!owner) mError('start', 'you are not the owner')
        else {
          const { players } = room
          const readyPlayers = players.filter((player) => player.ready)
          if (readyPlayers.length < 0 /* 1 pour les teste passé a maxPlayer ou 2 */)
            mError('start', 'not enough ready players')
          else {
            const { state, queue } = getInitState(room.players)
            const gameState = await avocatGameApi.nextState(state, queue)

            await dbHandle.makeInGame(roomId)

            dbHandle
              .updateGameState(roomId, gameState)
              .catch((error) => mError('start', error))
              .then(async (newRoom) => {
                io.to(roomId).emit('room', newRoom)
                console.log(`${username} start the game ${roomId}`)
              })
          }
        }
      })
  })

  socket.on('avocat', async ({ room, action }) => {
    dbHandle
      .getPlayerBySocketId(socket.id)
      .catch((error) => mError('avocat', error))
      .then((player) => {
        dbHandle
          .getRoom(player.room)
          .catch((error) => mError('avocat', error))
          .then(async (room) => {
            const { players, gameState } = room
            // compare roomState(censuré) avec la bdd
            gameState.queue.unshift(action)
            const newGameState = await avocatGameApi.nextState(
              gameState.state,
              gameState.queue
            )
            dbHandle
              .updateGameState(room.id, newGameState)
              .catch((error) => mError('avocat', error))
              .then(async (room) => {
                const { players, gameState } = room

                io.to(room.id).emit('room', room)
                console.log(`${player.username} ${action.type}`)
              })
          })
      })
  })
})

instrument(io, {
  auth: false
})

httpServer.listen(3002).addListener('listening', () => {
  console.log('listening on 3002')
})
