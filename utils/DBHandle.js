const nedb = require('nedb')

const avocatRooms = new nedb({ filename: 'avocatrooms', autoload: true })
const avocatPlayers = new nedb({ filename: 'avocatplayers', autoload: true })

module.exports = {
  createRoom: (roomId, username, password) => {
    return new Promise((resolve) => {
      if (roomId !== '') {
        avocatRooms.findOne({ roomId: roomId }, (error, room) => {
          if (error) resolve({ error })
          else if (room) resolve({ error: 'room already exist !' })
          else {
            let room =
              password && password.length > 2
                ? { roomId, private: true, password }
                : { roomId, private: false, password: null }
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
          avocatPlayers.find({ roomId: roomId }, (error, players) => {
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
  getRooms: () => {
    return new Promise((resolve) => {
      avocatRooms.find({}, async (error, rooms) => {
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
          if (error) return resolve({ error })
          else if (room) {
            if (room.private && room.password !== password)
              resolve({ error: 'wrong password' })
            avocatPlayers.findOne(
              { $and: [{ username: username }, { room: roomId }] },
              (error, player) => {
                if (error) resolve({ error })
                else if (player)
                  resolve({ error: 'this pseudo already exist in this room' })
                else {
                  let user = { username, isReady: false, room: roomId }
                  avocatPlayers.insert(user)
                  resolve({ user, message: 'player added' })
                }
              }
            )
          }
          resolve({ error: 'room not found' })
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
