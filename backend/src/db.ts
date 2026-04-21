import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config()

export async function connectedDb () {
    const db = await mongoose.connect(`${process.env.MONGODB_URL}`)
    if (db) {
        console.log("Mongo DB Connected Successfully")
    } else {
        console.log("Error While Connecting")
    }
}




