import mongoose, { Schema } from "mongoose";

const tableMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    isReady: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const tableItemSchema = new Schema(
  {
    foodId: {
      type: Schema.Types.ObjectId,
      ref: "Food",
      required: true,
    },
    itemname: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      username: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      name: {
        type: String,
        default: "",
      },
      avatar: {
        type: String,
        default: "",
      },
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const tableSchema = new Schema(
  {
    tableId: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    tableName: {
      type: String,
      required: true,
      trim: true,
    },
    creator: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    creatorRollNo: {
      type: String,
      default: "",
      trim: true,
    },
    creatorName: {
      type: String,
      default: "",
    },
    creatorAvatar: {
      type: String,
      default: "",
    },
    members: [tableMemberSchema],
    items: [tableItemSchema],
    orderType: {
      type: String,
      enum: ["Order Now", "Pre-Order", "Dine in", "Take Away", "Delivery", "Ordered Now"],
      default: "Order Now",
    },
    status: {
      type: String,
      enum: ["active", "ordered", "closed"],
      default: "active",
    },
    orderNumber: {
      type: String,
      default: "",
    },
    receiptImageUrl: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "cash", "card", "upi"],
      default: "wallet",
    },
  },
  { timestamps: true }
);

export const Table = mongoose.model("Table", tableSchema);
