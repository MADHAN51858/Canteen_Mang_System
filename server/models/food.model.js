import mongoose, { Schema } from "mongoose";

const foodSchema = new Schema(
    {
        itemname: {
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            trim: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        originalPrice: {
            type: Number,
            min: 0,
            default: 0
        },
        image: {
            type: String,
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        inStock: {
            type: Boolean,
            default: true
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        offer: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        isVeg: {
            type: Boolean,
            default: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        ratings: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User"
                },
                rating: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 5
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalRatings: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Food = mongoose.model("Food", foodSchema);