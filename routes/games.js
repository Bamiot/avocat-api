const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const dbHandle = require('../utils/DBHandle')
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

io.on("connection", (socket) => {
  console.log("connection");
  socket.on("roomState", async(roomId,username) => {
    console.log(roomId);
    socket.join(roomId);
    const { room, error } = await dbHandle.getRoom(roomId)
    if(error) console.log(error);
    else io.to(roomId).emit(`roomState`, room);
    socket.on("disconnect", () => {
    });
  });
});

httpServer.listen(3002);


