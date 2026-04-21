import express from "express"
import { Request, Response } from "express";
import { connectedDb } from "./db";
import cors from 'cors'
import { userRouter } from "./router/userRouter";
import { taskRouter } from "./router/taskRouter";


const PORT = process.env.PORT || 3005

connectedDb().catch((err)=>console.log("Error Gotted", err))

const app : express.Application = express()


app.use(express.json())
app.use(cors())

app.get("/", (req : Request, res : Response) => {
    res.send("Hello World")
})

app.use('/api/user', userRouter)
app.use('/api/task', taskRouter)




app.listen(PORT, ()=>{
    console.log(`Your Server is Running on Port http://localhost:${PORT}`)
})