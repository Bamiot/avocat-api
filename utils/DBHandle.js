const nedb = require('nedb')

const avocatRooms = new nedb({ filename: 'avocatrooms.nedb', autoload: true })
// const avocatPlayers = new nedb({ filename: 'avocatplayers.nedb', autoload: true })
// const avocatRooms = new nedb()
const avocatPlayers = new nedb()

module.exports = {
  createRoom: (roomId, username, password, maxPlayers) => {
    return new Promise((resolve, reject) => {
      if (roomId !== '') {
        avocatRooms.findOne({ roomId: roomId }, (error, room) => {
          if (error) return reject(error)
          else if (room) return reject('room already exist !')
          else {
            let room =
              password && password.length > 2
                ? { roomId, owner: username, private: true, password, maxPlayers }
                : { roomId, owner: username, private: false, password: null, maxPlayers }
            avocatRooms.insert(room)
            console.log(`room ${roomId} create by ${username}.`)
            return resolve(room)
          }
        })
      }
    })
  },
  getRoom: (roomId) => {
    return new Promise((resolve, reject) => {
      avocatRooms.findOne({ roomId: roomId }, (error, room) => {
        if (error) return reject(error)
        else if (!room) return reject('getRoom: room not found !')
        else {
          avocatPlayers.find({ room: roomId }, (error, players) => {
            if (error) return reject(error)
            else {
              room.players = players
              return resolve(room)
            }
          })
        }
      })
    })
  },
  isPlayerInRoom: (roomId, username) => {
    return new Promise((resolve, reject) => {
      avocatPlayers.findOne(
        { $and: [{ room: roomId }, { username: username }] },
        (error, player) => {
          if (error) return reject(error)
          else if (!player) return reject('playerIsInRoom: player or room not found !')
          else return resolve(player)
        }
      )
    })
  },
  changeOnlineStatus: (roomId, username, status = undefined) => {
    return new Promise((resolve, reject) => {
      avocatPlayers.findOne({ room: roomId, username: username }, (error, player) => {
        if (error) return reject(error)
        else if (!player) return reject('changeOnlineStatus: player or room not found !')
        else {
          if (status !== undefined) player.online = status
          avocatPlayers.update(
            { room: roomId, username: username },
            player,
            {},
            (error) => {
              if (error) return reject(error)
              else return resolve(player)
            }
          )
        }
      })
    })
  },
  changePlayerReady: async (roomId, username, value = undefined) => {
    return new Promise(async (resolve, reject) => {
      avocatPlayers.findOne(
        { $and: [{ room: roomId }, { username }] },
        (error, player) => {
          if (error) return reject(error)
          else if (!player) return reject('changePlayerReady: player or room not found !')
          else {
            let val = typeof value === 'boolean' ? value : !player.isReady
            avocatPlayers.update(
              { room: roomId, username },
              { $set: { isReady: val } },
              {},
              (error) => {
                if (error) return reject(error)
                else return resolve(player)
              }
            )
          }
        }
      )
    })
  },
  getRooms: () => {
    return new Promise((resolve, reject) => {
      avocatRooms.find({ private: false }, async (error, rooms) => {
        if (error) return reject(error)
        else {
          for (const room of rooms) {
            const players = await new Promise((resolve2) => {
              avocatPlayers.find({ room: room.roomId }, (error, players) => {
                if (error) return reject(error)
                else return resolve2(players)
              })
            })
            room.players = players
          }
          return resolve(rooms)
        }
      })
    })
  },
  addPlayer: async (roomId, username, password) => {
    return new Promise((resolve, reject) => {
      if (roomId !== '' && username !== '') {
        avocatRooms.findOne({ roomId: roomId }, (error, room) => {
          if (error) return reject(error)
          else if (room) {
            if (room.private && room.password !== password)
              return reject('wrong password')
            avocatPlayers.find({ room: roomId }, (error, players) => {
              if (error) return reject(error)
              for (player of players)
                if (player.username === username) return reject('player already exist')
              if (players && players.length < room.maxPlayers) {
                let user = { username, isReady: false, room: roomId, online: false }
                avocatPlayers.insert(user)
                return resolve(user)
              } else return reject('room is full')
            })
          } else return reject('room not found')
        })
      } else return reject('roomId or username isnt valid')
    })
  },
  removePlayer: async (roomId, username) => {
    return new Promise((resolve, reject) => {
      if (roomId !== '' && username !== '') {
        avocatPlayers.findOne(
          { $and: [{ username: username }, { room: roomId }] },
          (error, user) => {
            if (error) return reject(error)
            else if (!user) return reject('player not found')
            else {
              avocatPlayers.remove(
                { $and: [{ username: username }, { room: roomId }] },
                {},
                (error) => reject(error)
              )
              return resolve(user)
            }
          }
        )
      } else return reject('roomId or username isnt valid')
    })
  },
  addSocketId: async (roomId, username, socketId) => {
    return new Promise((resolve, reject) => {
      if (roomId !== '' && username !== '' && socketId !== '') {
        avocatPlayers.findOne(
          { $and: [{ username: username }, { room: roomId }] },
          (error, user) => {
            if (error) return reject(error)
            else if (!user) return reject('addSocketId: player not found')
            else
              avocatPlayers.update(
                { $and: [{ username: username }, { room: roomId }] },
                { $set: { socketId } },
                (error) => {
                  if (error) return reject(error)
                  else return resolve(user)
                }
              )
          }
        )
      } else return reject('roomId or username or socketId isnt valid')
    })
  },
  getPlayerBySocketId: async (socketId) => {
    return new Promise((resolve, reject) => {
      if (socketId !== '') {
        avocatPlayers.findOne({ socketId }, (error, player) => {
          if (error) return reject(error)
          else if (!player) return reject('player not found')
          else return resolve(player)
        })
      } else return reject('socketId isnt valid')
    })
  },
  makeInGame: async (roomId) => {
    return new Promise((resolve, reject) => {
      if (roomId !== '') {
        avocatRooms.findOne({ roomId }, (error, room) => {
          if (error) return reject(error)
          else if (!room) return reject('makeInGame: room not found')
          else {
            avocatRooms.update({ roomId }, { $set: { inGame: true } }, (error) => {
              if (error) return reject(error)
              else return resolve(room)
            })
          }
        })
      } else return reject('roomId isnt valid')
    })
  },
  updateGameState: async (roomId, gameState) => {
    return new Promise((resolve, reject) => {
      if (roomId !== '' && gameState !== '') {
        avocatRooms.findOne({ roomId }, (error, room) => {
          if (error) return reject(error)
          else if (!room) return reject('updateGameState: room not found')
          else
            avocatRooms.update({ roomId }, { $set: { gameState } }, (error) => {
              if (error) return reject(error)
              else {
                avocatRooms.findOne({ roomId }, (error, room) => {
                  if (error) return reject(error)
                  else if (!room) return reject('updateGameState: room not found')
                  else return resolve(room)
                })
              }
            })
        })
      } else return reject('roomId or gameState isnt valid')
    })
  }
}
