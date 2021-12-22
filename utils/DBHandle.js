const nedb = require('nedb')

const avocatRooms = new nedb({ filename: 'avocatrooms.nedb', autoload: true })
const avocatPlayers = new nedb({ filename: 'avocatplayers.nedb', autoload: true })

module.exports = {
  createRoom: (roomId, username, password, maxPlayers) => {
    return new Promise((resolve) => {
      if (roomId !== '') {
        avocatRooms.findOne({ roomId: roomId }, (error, room) => {
          if (error) resolve({ error })
          else if (room) resolve({ error: 'room already exist !' })
          else {
            let room =
              password && password.length > 2
                ? { roomId, private: true, password, maxPlayers }
                : { roomId, private: false, password: null, maxPlayers }
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
        if (error) resolve({ error })
        else if (!room) resolve({ error: 'room not found !' })
        else {
          avocatPlayers.find({ room: roomId }, (error, players) => {
            if (error) resolve({ error })
            else {
              room.players = players
              resolve({ room })
            }
          })
        }
      })
    })
  },
  isPlayerInRoom: (roomId, username) => {
    return new Promise((resolve) => {
      avocatPlayers.findOne({ $and: [{ room: roomId, username: username }] }, (error,player) => {
        if (error || !player) resolve({ error: `${username} do not exist in room : ${roomId}` })
        else resolve({ message: `${username} exist in room : ${roomId}` })
      })
    })
  },
  changePlayerReady: async (roomId, username, value) => {
    return new Promise(async (resolve) => {
      const valueOfReady = await new Promise((resolve1) => {
        avocatPlayers.findOne(
          { $and: [{ room: roomId }, { username }] },
          (error, player) => {
            if (error) resolve1({ error })
            else resolve1({ player })
          }
        )
      })
      if (valueOfReady.player) {
        const playerStateReady = !valueOfReady.player.isReady
        avocatPlayers.update(
          { $and: [{ room: roomId, username: username }] },
          { $set: { isReady: playerStateReady } },
          (error) => {
            if (error) {
              resolve({ error })
            } else {
              resolve({
                message: `ready state of ${username} in the room : ${roomId} has been change to ${playerStateReady}`
              })
            }
          }
        )
      } else resolve({ error: 'player not found' })
    })
  },
  getRooms: () => {
    return new Promise((resolve) => {
      avocatRooms.find({ private: false }, async (error, rooms) => {
        if (error) resolve({ error })
        else {
          for (const room of rooms) {
            const handle = await new Promise((resolve2) => {
              avocatPlayers.find({ room: room.roomId }, (error, players) => {
                if (error) resolve2({ error })
                else resolve2({ players })
              })
            })
            if (handle.error) resolve({ error: handle.error })
            else room.players = handle.players
          }
          resolve({ rooms })
        }
      })
    })
  },
  addPlayer: async (roomId, username, password) => {
    return new Promise((resolve) => {
      if (roomId !== '' && username !== '') {
        avocatRooms.findOne({ roomId: roomId }, (error, room) => {
          if (error) resolve({ error })
          else if (room) {
            if (room.private && room.password !== password)
              resolve({ error: 'wrong password' })

            avocatPlayers.find({ roomId: roomId }, (error, players) => {
              if (error) resolve({ error })
              let player = players.find((player) => player.username === username)
              if (player) resolve({ error: 'this pseudo already exist in this room' })
              if (players.length >= room.maxPlayers) resolve({ error: 'room is full' })
              else {
                let user = { username, isReady: false, room: roomId }
                avocatPlayers.insert(user)
                resolve({ user, message: 'player added' })
              }
            })
          } else resolve({ error: 'room not found' })
        })
      } else resolve({ error: 'roomId or username isnt valid' })
    })
  },
  removePlayer: async (roomId, username) => {
    return new Promise((resolve) => {
      if (roomId !== '' && username !== '') {
        avocatPlayers.findOne(
          { $and: [{ username: username }, { room: roomId }] },
          (error, user) => {
            if (error) resolve({ error })
            else if (!user) resolve({ error: 'player not found' })
            else {
              avocatPlayers.remove({ $and: [{ username: username }, { room: roomId }] })
              resolve({ user, message: 'player removed' })
            }
          }
        )
      } else resolve({ error: 'roomId or username isnt valid' })
    })
  }
}
