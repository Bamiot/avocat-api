const nedb = require('nedb')

const avocatRooms = new nedb({ filename: 'avocatrooms.nedb', autoload: true })
const avocatPlayers = new nedb({ filename: 'avocatplayers.nedb', autoload: true })

module.exports = {
  createRoom: (roomId, username, password, maxPlayers) => {
    return new Promise((resolve) => {
      if (roomId !== '') {
        avocatRooms.findOne({ roomId: roomId }, (error, room) => {
          if (error) return resolve({ error })
          else if (room) return resolve({ error: 'room already exist !' })
          else {
            let room =
              password && password.length > 2
                ? { roomId, owner: username, private: true, password, maxPlayers }
                : { roomId, owner: username, private: false, password: null, maxPlayers }
            avocatRooms.insert(room)
            console.log(`room ${roomId} create by ${username}.`)
            return resolve({ room, message: 'room created' })
          }
        })
      }
    })
  },
  getRoom: (roomId) => {
    return new Promise((resolve) => {
      avocatRooms.findOne({ roomId: roomId }, (error, room) => {
        if (error) return resolve({ error })
        else if (!room) return resolve({ error: 'getRoom: room not found !' })
        else {
          avocatPlayers.find({ room: roomId }, (error, players) => {
            if (error) return resolve({ error })
            else {
              room.players = players
              return resolve({ room })
            }
          })
        }
      })
    })
  },
  isPlayerInRoom: (roomId, username) => {
    return new Promise((resolve) => {
      avocatPlayers.findOne(
        { $and: [{ room: roomId }, { username: username }] },
        (error, player) => {
          if (error) return resolve({ error })
          else if (!player)
            return resolve({ error: 'playerIsInRoom: player or room not found !' })
          else return resolve({ player })
        }
      )
    })
  },
  changeOnlineStatus: (roomId, username, status = undefined) => {
    return new Promise((resolve) => {
      avocatPlayers.findOne({ room: roomId, username: username }, (error, player) => {
        if (error) return resolve({ error })
        else if (!player)
          return resolve({ error: 'changeOnlineStatus: player or room not found !' })
        else {
          if (status !== undefined) player.online = status
          avocatPlayers.update(
            { room: roomId, username: username },
            player,
            {},
            (error) => {
              if (error) return resolve({ error })
              else return resolve({ player })
            }
          )
        }
      })
    })
  },
  changePlayerReady: async (roomId, username, value = undefined) => {
    return new Promise(async (resolve) => {
      const valueOfReady = await new Promise((resolve1) => {
        avocatPlayers.findOne(
          { $and: [{ room: roomId }, { username }] },
          (error, player) => {
            if (error) return resolve1({ error })
            else return resolve1({ player })
          }
        )
      })
      if (valueOfReady.player) {
        const playerStateReady =
          typeof value === 'boolean' ? value : !valueOfReady.player.isReady
        avocatPlayers.update(
          { $and: [{ room: roomId, username: username }] },
          { $set: { isReady: playerStateReady } },
          (error) => {
            if (error) {
              return resolve({ error })
            } else {
              return resolve({
                message: `ready state of ${username} in the room : ${roomId} has been change to ${playerStateReady}`
              })
            }
          }
        )
      } else return resolve({ error: 'player not found' })
    })
  },
  getRooms: () => {
    return new Promise((resolve) => {
      avocatRooms.find({ private: false }, async (error, rooms) => {
        if (error) return resolve({ error })
        else {
          for (const room of rooms) {
            const handle = await new Promise((resolve2) => {
              avocatPlayers.find({ room: room.roomId }, (error, players) => {
                if (error) return resolve2({ error })
                else return resolve2({ players })
              })
            })
            if (handle.error) return resolve({ error: handle.error })
            else room.players = handle.players
          }
          return resolve({ rooms })
        }
      })
    })
  },
  addPlayer: async (roomId, username, password) => {
    return new Promise((resolve) => {
      if (roomId !== '' && username !== '') {
        avocatRooms.findOne({ roomId: roomId }, (error, room) => {
          if (error) return resolve({ error })
          else if (room) {
            if (room.private && room.password !== password)
              return resolve({ error: 'wrong password' })
            avocatPlayers.find({ room: roomId }, (error, players) => {
              if (error) return resolve({ error })
              for (player of players)
                if (player.username === username)
                  return resolve({ error: 'player already exist' })
              if (players && players.length < room.maxPlayers) {
                let user = { username, isReady: false, room: roomId, online: false }
                avocatPlayers.insert(user)
                return resolve({ user, message: 'player added' })
              } else return resolve({ error: 'room is full' })
            })
          } else return resolve({ error: 'room not found' })
        })
      } else return resolve({ error: 'roomId or username isnt valid' })
    })
  },
  removePlayer: async (roomId, username) => {
    return new Promise((resolve) => {
      if (roomId !== '' && username !== '') {
        avocatPlayers.findOne(
          { $and: [{ username: username }, { room: roomId }] },
          (error, user) => {
            if (error) return resolve({ error })
            else if (!user) return resolve({ error: 'player not found' })
            else {
              avocatPlayers.remove({ $and: [{ username: username }, { room: roomId }] })
              return resolve({ user, message: 'player removed' })
            }
          }
        )
      } else return resolve({ error: 'roomId or username isnt valid' })
    })
  },
  addSocketId: async (roomId, username, socketId) => {
    return new Promise((resolve) => {
      if (roomId !== '' && username !== '' && socketId !== '') {
        avocatPlayers.findOne(
          { $and: [{ username: username }, { room: roomId }] },
          (error, user) => {
            if (error) return resolve({ error })
            else if (!user) return resolve({ error: 'addSocketId: player not found' })
            else {
              avocatPlayers.update(
                { $and: [{ username: username }, { room: roomId }] },
                { $set: { socketId } },
                (error) => {
                  if (error) {
                    return resolve({ error })
                  } else {
                    return resolve({ user, message: 'socketId added' })
                  }
                }
              )
            }
          }
        )
      } else return resolve({ error: 'roomId or username or socketId isnt valid' })
    })
  },
  getPlayerBySocketId: async (socketId) => {
    return new Promise((resolve) => {
      if (socketId !== '') {
        avocatPlayers.findOne({ socketId }, (error, player) => {
          if (error) return resolve({ error })
          else if (!player) return resolve({ error: 'player not found' })
          else return resolve({ player })
        })
      } else return resolve({ error: 'socketId isnt valid' })
    })
  }
}
