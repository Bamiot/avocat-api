const { instrument } = require('@socket.io/admin-ui')
const http = require('http');
const express = require("express");
const socketIO = require('socket.io');
let app = express();
let server = http.createServer(app);
let io = socketIO(server);

// Socket
module.exports = function(io){
io.on('connection', (socket) => {
  console.log(socket.id)
  socket.on('data', (room_id, clientName) => {
    console.log(clientName)
    socket.join(room_id)
    dbGames.findOne({ roomId: room_id }, (err, room) => {
      io.to(room_id).emit(`data`, room)
    })
    socket.on('disconnect', () => {
      dbGames.findOne({ roomId: room_id }, (err, room) => {
        io.to(room_id).emit(`data`, room)
        console.log(room)
      })
    })
  })
})
}
instrument(io, { auth: false })

module.exports = io
