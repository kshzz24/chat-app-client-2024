import express from "express";

import { connectDB } from "./utils/feature.js";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import userRoute from "./routes/userRoute.js";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constants/events.js";
import { socketAuthenticator } from "./middlewares/auth.js";

import { v4 as uuid } from "uuid";
import { getSockets } from "./lib/helper.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

// import
import { Message } from "./models/message.js";
import { corsOptions } from "./constants/config.js";
dotenv.config({
  path: "./.env",
});
connectDB(process.env.MONGO_URI);
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const adminSecretKey =
  process.env.ADMIN_SECRET_KEY || "dsfdsfdsfdsfsdfsdfdsf";

const app = express();
app.use(cors(corsOptions));
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);
app.use(express.json());
app.use(cookieParser());

app.use("/user", userRoute);
app.use("/chat", chatRoute);
app.use("/admin", adminRoute);

export const userSocketIDs = new Map();
export const onlineUsers = new Set();

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;

  userSocketIDs.set(user._id.toString(), socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    const messageForDb = {
      content: message,
      sender: user._id,
      chat: chatId,
    };
    const membersSockets = getSockets(members);

    io.to(membersSockets).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    io.to(membersSockets).emit(NEW_MESSAGE_ALERT, {
      chatId,
    });

    try {
      await Message.create(messageForDb);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const memberSockets = getSockets(members);
    console.log("typing", memberSockets);

    socket.to(memberSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const memberSockets = getSockets(members);
    console.log("stop typing", memberSockets);

    socket.to(memberSockets).emit(STOP_TYPING, { chatId });
  });
  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());
    const userSockets = getSockets(members);
    io.to(userSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
  });
  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());
    const userSockets = getSockets(members);
    io.to(userSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
    onlineUsers.delete(user._id.toString());
    userSocketIDs.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

app.use(errorMiddleware);

server.listen(process.env.PORT || 3000, () => {
  console.log("Server is listening on port");
});
