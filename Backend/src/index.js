import dotenv from "dotenv"
import { app } from "./app.js"
import connectDB from "./db/index.js"

dotenv.config({ path: "./.env"})

const port = process.env.PORT || 8000
connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("Mongo DB Connection Failed:", error)
        throw error;
    })

    app.listen(port, () => {
        console.log(`App is listeniing at port : ${port}`)
    })
})
.catch((err) => console.log("MongoDb Connection Failed:", err))

// .catch((err) => {
//     console.log("MongoDb Connection Failed:", err)
// })



















// import express from "express"
// import { DB_NAME } from "./constants.js"
// import dotenv from "dotenv"
// import mongoose  from "mongoose"

// // -r dotenv/config   this line of code in the package.json, automatically loads the env's to the Nodejs environment whn the code runs

// const app = express()

// ;( async() => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

//         app.on("error", (error) => {
//             console.log("Error:", error)
//             throw error
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on port ${process.env.PORT}`)
//         })
//     }
//     catch (error) {
//         console.log(error)
//         throw error
//     }
// })()