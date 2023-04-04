const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const ip = require("ip");
const ipAddress = ip.address();
const { Server } = require("socket.io");
// const ACTIONS = require("./Actions");

const server = http.createServer(app);
const io = new Server(server);
//this will use all the builded files for serving
// app.use(express.static("build"));
//act as a middleware for any reuest for the server and sent it to the index file to handle that request/
// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const userSocketMap = {};
function getAllConnectedClients(roomId) {
  // Map
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  

  socket.on("join", ({ roomId, username }) => {
    console.log("socket connected", socket.id, "UserName", username);
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit("joined", {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on("code-change", ({ roomId, code,output }) => {
    socket.in(roomId).emit("code-change", { code,output });
  });

  socket.on("sync-code", ({ socketId, code }) => {
    io.to(socketId).emit("code-change", { code });
  });
  
  socket.on("output-change", ({ roomId, output }) => {
    io.in(roomId).emit("output-change", { output });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit("disconnected", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Listening/waiting for connection on port ${PORT}`);
  console.log(`Network access via: ${ipAddress}:${PORT}!`);
});
