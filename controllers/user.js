import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import {
  cookieOptions,
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/feature.js";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatchHandler } from "../middlewares/error.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
// create new user and send a cookie and save the user to db
const newUser = async (req, res, next) => {
  console.log(req.body);
  const { name, username, password, bio } = req.body;

  const file = req.file;
  console.log(file);
  if (!file) {
    return next(new ErrorHandler("Please upload a file", 400));
  }
  const result = await uploadFilesToCloudinary([file]);
  console.log(result, "rrrrrrrr");
  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const user = await User.create({
    name,
    username,
    password,
    bio,
    avatar,
  });

  sendToken(res, user, 201, "User Created");

  //res was sent via sendToken so no need to sent here
};

const login = TryCatchHandler(async (req, res, next) => {
  const { username, password } = req.body;
  // console.log(username, password, 'this is the password')
  const user = await User.findOne({ username }).select("+password");
  if (!user) {
    next(new ErrorHandler("User Not Found", 400));
  }

  const isMatched = await compare(password, user.password);
  if (!isMatched) {
    return next(new ErrorHandler("Invalid Password", 400));
  }
  sendToken(res, user, 201, `Welcome back ${user.name}`);
});

const getMyProfile = TryCatchHandler(async (req, res) => {
  const userId = req.user;
  const user = await User.findById(userId);
  return res.status(200).json({
    success: true,
    user,
  });
});

export const logout = TryCatchHandler(async (req, res, next) => {
  return res
    .status(200)
    .cookie("chatt-app-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logout Successfully",
    });
});

export const searchUser = TryCatchHandler(async (req, res, next) => {
  const { name = "" } = req.query;

  // find all chat -> filter only 1-1 chat // rest are what we want

  const myChats = await Chat.find({
    groupChat: false,
    members: req.user,
  });

  // find
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));
  return res.status(200).json({
    success: true,
    users,
  });
});

export const sendFriendRequest = TryCatchHandler(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) {
    return next(new ErrorHandler("Request Already sent", 400));
  }

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend request sent successfully",
  });
});

export const acceptFriendRequest = TryCatchHandler(async (req, res, next) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");
  if (!request) {
    return next(new ErrorHandler("Request not found", 400));
  }
  console.log(req.user, "rewww", request.receiver);
  if (request.receiver._id.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not authorized to accept this request", 400)
    );
  }

  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected Successfully",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}- ${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Request Accepted",
    senderId: request.sender._id,
  });
});

export const getAllNotifications = TryCatchHandler(async (req, res, next) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequest = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  return res.status(200).json({
    success: true,
    allRequest,
  });
});

export const getMyFriends = TryCatchHandler(async (req, res, next) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUsers = getOtherMember(members, req.user);
    return {
      _id: otherUsers._id,
      name: otherUsers.name,
      avatar: otherUsers.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});

export { login, newUser, getMyProfile };
