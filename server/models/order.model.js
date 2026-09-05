import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const orderSchema = new Schema(
  {
    orderedBy: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    orderNumber: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "Food",
        required: true,
      },
    ],
    amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "cancelled", "completed"],
      default: "pending",
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
      required: false,
    },
    //status pending is recommended by the razorpay only because, when user pays the amount, the razorpay is
    //going to return an order and payment id in the api response, and we have to use this to query the razorpay database to make sure that the payment
    //is completed, then only we amke the status to completed or failed
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    //Totalprice field is required beacause, the variant prices are always the same,
    //but if the user has the ability to apply coupans , thenn the total amount can be different.

    totalprice: {
      type: Number,
      required: true,
    },

    pre: {
      type: Boolean,
      default: false,
    },
    qrcode: {
      type: String,
    },
    receiptImageUrl: {
      type: String,
    },
    receiptImageUrlNoBarcode: {
      type: String,
    },
  
    scanCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

orderSchema.plugin(mongooseAggregatePaginate);

export const Order = mongoose.model("Order", orderSchema);
