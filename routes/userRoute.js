import express from "express";
import {
  acceptFriendRequest,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
  getAllNotifications,
  getMyFriends,
} from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerUserValidator,
  sendRequestValidator,
  validateHandler,
} from "../lib/validators.js";
const app = express.Router();

app.post(
  "/new",
  singleAvatar,
  registerUserValidator(),
  validateHandler,
  newUser
);
app.post("/login", loginValidator(), validateHandler, login);

// auth routes
app.use(isAuthenticated);
app.get("/me", getMyProfile);
app.get("/logout", logout);
app.get("/search", searchUser);
app.put(
  "/sendrequest",
  sendRequestValidator(),
  validateHandler,
  sendFriendRequest
);
app.put(
  "/acceptrequest",
  acceptRequestValidator(),
  validateHandler,
  acceptFriendRequest
);

app.get("/notifications", getAllNotifications);
app.get("/friends", getMyFriends);

export default app;
