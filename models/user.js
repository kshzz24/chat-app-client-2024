import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
import { hash } from "bcrypt";
const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    bio: {
      type: String,
    },
    avatar: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

schema.pre("save", async function () {
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 10);
});

export const User = models.User || model("User", schema);
