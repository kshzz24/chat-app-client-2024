import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { adminSecretKey } from "../app.js";
import { TryCatchHandler } from "./error.js";
import { User } from "../models/user.js";

export const isAuthenticated = TryCatchHandler((req, res, next) => {
  //   console.log("cookies",req.cookies);
  const token = req.cookies["chatt-app-token"];
  if (!token) {
    return next(new ErrorHandler("Please Login first", 401));
  }

  const decodeData = jwt.verify(token, process.env.JWT_SECRET);
  console.log("This is dedocded", decodeData);
  // given by jwt
  // his is dedocded { _id: '66dc7e4482c8e14656db8fd6', iat:
  //  1725726345 }
  req.user = decodeData._id;

  next();
});

export const adminOnly = (req, res, next) => {
  const token = req.cookies["chat-admin-token"];

  if (!token) {
    return next(new ErrorHandler("Only Admin can access this route", 401));
  }

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);
  const isMatched = secretKey === adminSecretKey;

  if (!isMatched) {
    return next(new ErrorHandler("Invalid key", 401));
  }
  next();
};
export const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies["chatt-app-token"];

    if (!authToken)
      return next(new ErrorHandler("Please login to access this route", 401));

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);

    if (!user)
      return next(new ErrorHandler("Please login to access this route", 401));

    socket.user = user;

    return next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Please login to access this route", 401));
  }
};
