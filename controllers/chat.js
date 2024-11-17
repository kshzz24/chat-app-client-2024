import {
  ALERT,
  // NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatchHandler } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import {
  deleteFileFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/feature.js";
import { ErrorHandler } from "../utils/utility.js";

export const newGroupChat = TryCatchHandler(async (req, res, next) => {
  const { name, members } = req.body;
  if (members.length < 2)
    return next(new ErrorHandler("Group Chat must have 3 members"), 400);

  const allMembers = [...members, req.user];
  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group `);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    msg: `Group Chat ${name} created`,
  });
});

export const getMyChat = TryCatchHandler(async (req, res, next) => {
  // here memeber m userID mongodb ki h usse reference lekr har member ka
  // name aur avatar store krwa lia h members array m warna toh mongodb ki id h
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const othermember = getOtherMember(members, req.user);
    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [othermember.avatar.url],
      name: groupChat ? name : othermember.name,
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

export const getMyGroups = TryCatchHandler(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    name,
    groupChat,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({
    success: true,
    groups,
  });
});

export const addMembers = TryCatchHandler(async (req, res, next) => {
  const { chatId, members } = req.body;
  const chat = await Chat.findById(chatId);
  console.log(chat, chat.groupChat);
  if (!chat) {
    return next(new ErrorHandler("Chat cannot be found", 400));
  }

  if (!members || members.length < 1) {
    return next(new ErrorHandler("Please Enter Atleast 1 member", 400));
  }

  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a grp chat", 400));
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not the creator", 400));
  }

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

  const allNewMembers = await Promise.all(allNewMembersPromise);

  const uniqueMembers = allNewMembers.filter(
    (i) => !chat.members.includes(i._id.toString())
  );

  chat.members.push(...uniqueMembers);

  if (chat.members.length > 100) {
    return next(new ErrorHandler("Chat members cannot exceed 100", 400));
  }

  await chat.save();

  const allUsersName = allNewMembers.map((i) => i.name).join(",");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersName} has been added in the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    msg: " Chat members added successfully",
    allUsersName,
  });
});

export const removeMembers = TryCatchHandler(async (req, res, next) => {
  const { chatId, userId } = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) {
    return next(new ErrorHandler("Chat cannot be found", 400));
  }

  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a grp chat", 400));
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not the creator", 400));
  }

  if (chat.members.length <= 3) {
    return next(new ErrorHandler("Group must have 3 members", 400));
  }

  const allChatMembers = chat.members.map((i) => i.toString());

  chat.members = chat.members.filter(
    (member) => member._id.toString() !== userId.toString()
  );

  await chat.save();

  emitEvent(req, ALERT, chat.members, {
    message: `${userThatWillBeRemoved.name} has been removed from the Group`,
    chatId,
  });
  emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});

export const leaveGroup = TryCatchHandler(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);

  if (!chat) {
    return next(new ErrorHandler("Chat not found", 400));
  }

  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a group chat", 400));
  }

  const isCurrentMemberPresent = chat.members.includes(req.user.toString());
  if (!isCurrentMemberPresent) {
    return next(
      new ErrorHandler("You are not part of the group chat anymore", 400)
    );
  }
  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (remainingMembers.length < 3) {
    return next(new ErrorHandler("Group must have atleast 3 members", 400));
  }
  if (chat.creator.toString() === req.user.toString()) {
    const newCreator =
      remainingMembers[Math.floor(Math.random() * remainingMembers.length - 1)];

    chat.creator = newCreator;
  }

  chat.members = remainingMembers;
  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {
    message: `User ${user.name} has left in the group`,
    chatId,
  });

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    msg: `${user.name} left the group chat ${chat.name} successfully`,
  });
});

export const sendAttachments = TryCatchHandler(async (req, res, next) => {
  const { chatId } = req.body;

  const files = req.files || [];

  if (files.length < 1) {
    return next(new ErrorHandler("Please upload attachments", 400));
  }

  if (files.length > 5) {
    return next(new ErrorHandler("Files can be more than  5", 400));
  }

  // check("files")
  // .notEmpty()
  // .withMessage("Please upload attachments")
  // .isArray({ min: 1, max: 5 })
  // .withMessage("Please upload attachments between 1-5"),

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);

  if (!chat) {
    return next(new ErrorHandler("Chat not found", 400));
  }

  if (files.length < 1) {
    return next(new ErrorHandler("Please Provide attachments", 400));
  }

  // upload to cloudinary
  const attachments = await uploadFilesToCloudinary(files);

  const messageForRealTime = {
    content: "",
    attachments,
    sender: {
      _id: me._id,
      name: me.name,
    },
    chat: chatId,
  };

  const messageForDb = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const message = await Message.create(messageForDb);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    data: message,
    msg: `Attachment sent successfully`,
  });
});

export const getChatDetails = TryCatchHandler(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();

    if (!chat) {
      return next(new ErrorHandler("CHat not found", 400));
    }
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return next(new ErrorHandler("CHat not found", 400));
    }
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

export const renameGroup = TryCatchHandler(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 400));
  }

  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a group chat", 400));
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not the creator ", 400));
  }

  chat.name = name;
  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(201).json({
    success: true,
    msg: "Group name changed succesfully",
  });
});

export const deleteChat = TryCatchHandler(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 400));
  }

  const members = chat.members;

  if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
    return next(
      new ErrorHandler("You are not allowed to delete the group", 403)
    );
  }
  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return new ErrorHandler("You are not allowed to delete the group", 403);
  }

  // here details all messages and attachments
  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];
  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => public_ids.push(public_id));
  });

  await Promise.all([
    // delete , files
    deleteFileFromCloudinary,
    // delete chat
    chat.deleteOne(),
    // delete message
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    msg: "Group chat deleted succesfully",
  });
});

export const getMessages = TryCatchHandler(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat Not found", 400));
  if (!chat.members.includes(req.user.toString())) {
    return next(new ErrorHandler("You are not allowed to acces", 400));
  }

  const { page = 1 } = req.query;

  const limit = 20;

  const skip = (page - 1) * limit;

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name avatar")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / limit);

  return res.status(200).json({
    success: true,
    totalMessagesCount,
    messages: messages.reverse(),
    totalPages,
  });
});
