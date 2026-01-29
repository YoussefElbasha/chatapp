// src/socket/handlers/chat.ts
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../types.js";

// Type alias for our specific socket instance
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export const registerChatHandlers = (io: TypedServer, socket: TypedSocket) => {
  
  // 1. JOIN A ROOM (Channel or DM)
  socket.on("join_room", (roomId: string, callback: any) => {
    // Validations: Check if user is actually allowed in this server/channel via DB
    // const canJoin = await db.checkAccess(socket.data.userId, roomId);
    
    console.log(`User ${socket.data.username} joined room: ${roomId}`);
    
    socket.join(roomId);
    
    // Notify others in the room? (Optional, Discord usually doesn't notify on channel switch)
    // socket.to(roomId).emit("user_joined", socket.data.userId);

    callback({ status: "ok" });
  });

  // 2. SEND MESSAGE
  socket.on("send_message", async ({ roomId, content }: {roomId: string, content: string}, callback: any) => {
    try {
      // a. Save to Database first (CRITICAL FOR DISCORD CLONE)
      // const savedMessage = await db.messages.create({ ... });
      
      // Mocking DB ID
      const savedMessage = {
        id: Math.random().toString(36).substring(7),
        content,
        senderId: socket.data.userId!,
        roomId,
        createdAt: new Date().toISOString()
      };

      // b. Broadcast to everyone in that specific room (including sender if you want, or excluding)
      io.to(roomId).emit("receive_message", savedMessage);

      // c. Acknowledge to sender
      callback({ status: "ok" });

    } catch (e) {
      callback({ status: "error", message: "Failed to send" });
    }
  });

  // 3. LEAVE ROOM (When user switches channels)
  socket.on("leave_room", (roomId: string) => {
    socket.leave(roomId);
  });
};