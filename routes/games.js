const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const dbHandle = require('../utils/DBHandle')
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

io.on("connection", (socket) => {
  socket.on("roomState", async(room_id,username) => {
    socket.join(room_id);
    const { room, error } = await dbHandle.getRoom(room_id)
    if(error) console.log(error);
    else io.to(room_id).emit(`roomState`, room);
    socket.on("disconnect", () => {
    });
  });
});

httpServer.listen(3002);


