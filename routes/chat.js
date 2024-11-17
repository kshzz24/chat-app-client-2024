import express from "express";
import {
  newGroupChat,
  getMyChat,
  getMyGroups,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
} from "../controllers/chat.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import {
  addMemberValidator,
  chatIdValidator,
  leaveGroupValidator,
  newGroupChatValidator,
  removeMemberValidator,
  renameGroupValidator,
  sendAttachmentsValidator,
  validateHandler,
} from "../lib/validators.js";
const app = express.Router();

// auth routes
app.use(isAuthenticated);

app.post("/new", newGroupChatValidator(), validateHandler, newGroupChat);
app.get("/my", getMyChat);

app.get("/my/groups", getMyGroups);
app.put("/addmembers", addMemberValidator(), validateHandler, addMembers);
app.put(
  "/removemember",
  removeMemberValidator(),
  validateHandler,
  removeMembers
);
app.delete("/leave/:id", leaveGroupValidator(), validateHandler, leaveGroup);
app.post(
  "/message",
  attachmentsMulter,
  sendAttachmentsValidator(),
  validateHandler,
  sendAttachments
);

app.get("/message/:id", chatIdValidator(), validateHandler, getMessages);

app
  .route("/:id")
  .get(chatIdValidator(), validateHandler, getChatDetails)
  .put(renameGroupValidator(), validateHandler, renameGroup)
  .delete(chatIdValidator(), validateHandler, deleteChat);
// Attachments
// Get Messages
// Get chat details, rename, delete

export default app;
