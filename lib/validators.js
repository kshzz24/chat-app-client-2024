import { body, validationResult, param, query } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", ");
  console.log(errorMessages, "thisssss error message");

  if (errors.isEmpty()) return next();
  else {
    next(new ErrorHandler(errorMessages, 400));
  }
};

const registerUserValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("username", "Please Enter username").notEmpty(),
  body("bio", "Please Enter bio").notEmpty(),
  body("password", "Please Enter password").notEmpty(),

];

const loginValidator = () => [
  body("username", "Please Enter username").notEmpty(),
  body("password", "Please Enter password").notEmpty(),
];

const newGroupChatValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Please include member within range 2-100"),
];

const addMemberValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Please include member within range 1-97"),
];
const removeMemberValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
  body("userId", "Please Enter User Id").notEmpty(),
];

const leaveGroupValidator = () => [
  param("id", "Please Enter Chat Id").notEmpty(),
];

const sendAttachmentsValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
 
];
const chatIdValidator = () => [param("id", "Please Enter Chat Id").notEmpty()];

const renameGroupValidator = () => [
  param("id", "Please Enter Chat Id").notEmpty(),
  body("name", "Please Enter Name").notEmpty(),
];

const sendRequestValidator = () => [
  body("userId", "Please Enter User ID").notEmpty(),
];

const acceptRequestValidator = () => [
  body("requestId", "Please Enter Request ID").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please add accept status")
    .isBoolean()
    .withMessage("Accept must be boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "Please enter Secret Key").notEmpty(),
];

export {
  registerUserValidator,
  validateHandler,
  leaveGroupValidator,
  sendAttachmentsValidator,
  removeMemberValidator,
  addMemberValidator,
  loginValidator,
  newGroupChatValidator,
  chatIdValidator,
  renameGroupValidator,
  sendRequestValidator,
  acceptRequestValidator,
  adminLoginValidator,
};
