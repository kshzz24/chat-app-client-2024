import mongoose from 'mongoose';
const { Schema, model, models,Types } = mongoose;
const schema = new Schema(
  {
    content: {
      type: String,
    },

    attachments: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    sender: {
      type: Types.ObjectId,
      ref: "User",
      requrired: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      requrired: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Message = models.Message || model("Message", schema);
