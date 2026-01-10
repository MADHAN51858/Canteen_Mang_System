import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
      lowercase: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["student", "staff", "admin"],
      default: "student",
      lowercase: true,
      trim: true,
    },
    previousRole: {
      type: String,
      enum: ["student", "staff", "admin"],
      default: "student",
      lowercase: true,
      trim: true,
    },
      rollNo: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
      phoneNo: {  //Always use the phNo. s an primary id for fetching
      type: Number,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
  
  
    orders: [
      {
        orderNumber:{
            required: true,
            type: String,
            lowercase: true,
            trim: true,
          },
        items: [
          {
            type: Schema.Types.ObjectId,
            ref: "Food",
          },
        ],
      },
    ],
    cancelledorders: [
      {
        cancelledby:{
            required: true,
            type: String,
            lowercase: true,
            trim: true,
          },
        orderNumber:{
            required: true,
            type: String,
            lowercase: true,
            trim: true,
          },
      },
    ],
    cancelledCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    blocked: {
      type: Boolean,
      default: false,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },
    accesToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccesToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function (password) {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
