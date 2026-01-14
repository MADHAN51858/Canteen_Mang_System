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
        image: {
            type: String,
        },
        category: {
            type: String,
            enum: ["BreakFast", "Lunch", "dinner"],
            required: true
        },
        inStock: {
            type : Boolean,
            default: true
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        description: {
            type: String,
            trim: true,
            default: ""
        }

    })

export const Food = mongoose.model("Food", foodSchema)