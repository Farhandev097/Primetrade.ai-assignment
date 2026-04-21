import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export async function authMiddleware(req : Request, res : Response, next : NextFunction) {
    const authHeader = req.headers['authorization']
    const token : string | undefined = authHeader?.split(' ')[1]
    const secret : string | undefined = process.env.JWT_SECRET
    
    if(!token) {
        return res.status(401).json({
            message : "Please Login First"
        })
    }
    if(!secret) return
 
    const decoded : any = jwt.verify(token, secret)
    req.userId = Number(decoded.id)   
    next()    
}
