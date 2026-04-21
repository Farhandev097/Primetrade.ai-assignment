import bcrypt from 'bcrypt'
import { Request, Response, Router } from "express";
import z from 'zod'
import { prisma } from "../../lib/prisma";
export const userRouter = Router()
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()



userRouter.post('/signup', async (req : Request, res : Response) =>{
    const userInput = z.object({
        email : z.email({message : "Please Enter Valid Email"}),
        password : z.string().min(8, {message : "Please Enter Password with atleast 8 Characters"}),
        name : z.string().min(3, {message : "Please Enter name in Atlease 3 Chars"}).max(100, {message : "Please Enter Valid Name"})
        
    })
    type updatedBody = z.infer<typeof userInput>
    const parsingValidation = userInput.safeParse(req.body)

    if(!parsingValidation.success) {
        return res.status(422).json({
            message : "Please Enter valid input"            
        })        
    }

    try {
        const userBody : updatedBody = parsingValidation.data
        const user = await prisma.user.findFirst({
            where : {
                email : userBody.email
            }
        })
        if(!user) {

            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(userBody.password, salt)
            
            const newUser = await prisma.user.create({
                data : {
                    email : userBody.email,
                    password : hashedPassword,
                    name : userBody.name
                },
                select : {email : true, name :  true}
            })
            
            res.status(200).json({
                message : "User Registered Successfully",
                newUser
            })
        } else {
            res.status(409).json({
                message : "USER ALREADY REGISTERED"                
            })
        }
    } catch (error) {
        res.status(500).json({
            message : "INTERNAL ERROR",
            error
        })            
    }
    
})

userRouter.post('/signin', async (req : Request, res : Response) =>{
    const secret = process.env.JWT_SECRET
    const userInput = z.object({
        email : z.email({message : "Please Enter Your Valid Email"}),
        password : z.string()
    })

    type updatedBody = z.infer<typeof userInput>
    const parsingValidation = userInput.safeParse(req.body)

    if(!parsingValidation.success) {
        res.status(422).json({
            message : "Please Enter Valid Input"
        })
    }

    try {
        const userBody : updatedBody | undefined = parsingValidation.data

        if(!userBody?.email && !userBody?.password ) return

        const foundUser = await prisma.user.findFirst({
            where : {
                email : userBody.email
            }
        })
        
        if(foundUser) {
            
            const isMatch = bcrypt.compare(userBody.password, foundUser.password)
            const id = foundUser.id

            if(!isMatch) {
                return res.status(401).json({
                    message : "Please Enter Valid Credentials"
                })
            }

            if(!secret) return
                   
            const token = jwt.sign({id}, secret)
            
            res.status(200).json({
                token
            })                        
        } else {
            res.status(404).json({
                message : "User Not Found"
            })
        }

    } catch (error) {
        res.status(500).json({
            message : "INTERNAL ERROR",
            error
        })
    }
})