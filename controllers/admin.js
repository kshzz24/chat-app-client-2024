import { TryCatchHandler } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/feature.js";

export const adminLogin = TryCatchHandler(async (req, res, next) => {
  const { secretKey } = req.body;

  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "kdsfdsfdsfds";
  const isMatched = secretKey === adminSecretKey;
  if (!isMatched) {
    return next(new ErrorHandler("Invalid Key", 401));
  }

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return res
    .status(200)
    .cookie("chat-admin-token", token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 15,
    })
    .json({
      success: true,
      message: "Authenticated succesfully ",
    });
});


export const getAdminDetails = TryCatchHandler(async (req, res, next) => {
  
      return res.status(200).json({
        admin: true
      })

})


export const adminLogout = TryCatchHandler(async (req, res, next) => {
  return res
    .status(200)
    .cookie("chat-admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logout succesfully ",
    });
});

export const getAllUsers = TryCatchHandler(async (req, res, next) => {
  const users = await User.find({});

  const transformUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);

      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({
    success: true,
    users: transformUsers,
  });
});

export const allChats = TryCatchHandler(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChat = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });

      return {
        _id,
        name,
        groupChat,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => {
          return {
            _id,
            name,
            avatar: avatar.url,
          };
        }),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar?.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  return res.status(200).json({
    success: true,
    chats: transformedChat,
  });
});

export const allMessages = TryCatchHandler(async (req, res, next) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => {
      return {
        _id,
        attachments,
        content,
        createdAt,
        chat: chat._id,
        groupChat: chat.groupChat,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar.url,
        },
      };
    }
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

export const getDashboardStats = TryCatchHandler(async (req, res, next) => {
  const [groupsCount, usersCount, messagesCount, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7Days = new Date();

  last7Days.setDate(last7Days.getDate() - 7);
  const last7DaysMessages = await Message.find({
    createdAt: { $gte: last7Days, $lte: today },
  }).select("createdAt");
  const messages = new Array(7).fill(0);
  const dayInMilliSecond = 1000 * 60 * 60 * 24;

  last7DaysMessages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / dayInMilliSecond;
    const index = Math.floor(indexApprox);
    messages[6 - index]++;
  });

  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messages,
  };
  return res.status(200).json({
    success: true,
    stats,
    // messages: transformedMessages,
  });
});
