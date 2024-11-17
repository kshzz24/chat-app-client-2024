import express from "express";
import {
  adminLogin,
  adminLogout,
  allChats,
  allMessages,
  getAdminDetails,
  getAllUsers,
  getDashboardStats,
} from "../controllers/admin.js";
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();


app.post("/verify", adminLoginValidator(), validateHandler, adminLogin);
app.get("/logout", adminLogout);

// a middleware which allows only admin to access the below api

app.use(adminOnly)
app.get("/",getAdminDetails);

app.get("/users", getAllUsers);
app.get("/chats", allChats);
app.get("/messages", allMessages);

app.get("/stats", getDashboardStats);

export default app;
