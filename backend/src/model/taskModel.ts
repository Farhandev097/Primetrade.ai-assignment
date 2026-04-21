import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    category: { type: String, default: null },   
    tags: { type: [String], default: [] }        
})

export const taskModel = mongoose.model('Task', taskSchema)