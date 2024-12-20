import mongoose from 'mongoose';
const { Schema, model, models, Types } = mongoose;
const schema = new Schema(
  {
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected"],
    },
    sender: {
      type: Types.ObjectId,
      ref: "User",
      requrired: true,
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      requrired: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Request = models.Request || model("Request", schema);
