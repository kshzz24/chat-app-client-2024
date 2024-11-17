import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { getBase64, getSockets } from "../lib/helper.js";

const cookieOptions = {
  maxAge: 24 * 60 * 60 * 1000 * 15,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const connectDB = (uri) => {
  mongoose
    .connect(uri, {
      dbName: "chat-app",
    })
    .then((data) => {
      console.log(`Connected to DB ${data.connection.host}`);
    })
    .catch((err) => {
      // console.log(err)
      throw err;
    });
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return res.status(code).cookie("chatt-app-token", token, cookieOptions).json({
    success: true,
    message,
    user,
  });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const userSockets = getSockets(users);
  io.to(userSockets).emit(event, data);
  console.log("Emiiting event", event);
};

const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);
    console.log(results, "ppppppppppppppppppp");
    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));

    return formattedResults;
  } catch (error) {
    throw new Error("Error while uploading files to cloudinary", error);
  }
};
const deleteFileFromCloudinary = async (public_ids) => {};

export {
  connectDB,
  sendToken,
  cookieOptions,
  emitEvent,
  deleteFileFromCloudinary,
  uploadFilesToCloudinary,
};
