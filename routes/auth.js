const { Server } = require("socket.io");

const httpServer = createServer(app);
const io = new Server(httpServer, {});

// Socket
io.on("connection", (socket) => {
    console.log(socket.id);
    socket.on("data", (room_id,clientName) => {
      console.log(clientName);
      socket.join(room_id);
      dbGames.findOne({ roomId: room_id }, (err, room) => {
        io.to(room_id).emit(`data`, room);
      });
      socket.on("disconnect", () => {
        dbGames.findOne({ roomId: room_id }, (err, room) => {
          io.to(room_id).emit(`data`, room);
          console.log(room);
        });
      });
    });
  });
  
  
  httpServer.listen(PORTHTTP);