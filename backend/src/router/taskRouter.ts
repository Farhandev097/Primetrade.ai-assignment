import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Request, Response, Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import z from "zod";
import { taskModel } from "../model/taskModel";
import {
    scheduleReminder,
    cancelReminder,
    rescheduleReminder,
} from "../services/reminderQueue";
import { notificationService } from "../services/notificationService";

dayjs.extend(utc);
dayjs.extend(timezone);

export const taskRouter = Router();

taskRouter.get(
    "/all-task",
    authMiddleware,
    async (req: Request, res: Response) => {
        const userId = req.userId;
        try {
            const tasks = await taskModel.find({ userId });
            res.status(200).json({ tasks });
        } catch (error) {
            res.status(500).json({ message: "INTERNAL ERROR" });
        }
    },
);

taskRouter.post(
    "/new-task",
    authMiddleware,
    async (req: Request, res: Response) => {
        const userId = req.userId;
        const taskInput = z.object({
            title: z
                .string()
                .min(3, { message: "Task Should atleast have 3 Chars" })
                .max(100, { message: "Task cannot be more than 100 Chars" }),
            description: z
                .string()
                .min(3, { message: "Description Should atleast have 3 Chars" })
                .max(1000, { message: "Description cannot be more than 1000 Chars" }),
            dueDate: z.coerce.date(),
            category: z.string().optional(),
            tags: z.array(z.string()).optional(),
        });

        type updatedInput = z.infer<typeof taskInput>;

        const parsingValidation = taskInput.safeParse(req.body);

        if (!parsingValidation.success) {
            return res.status(400).json({ message: "Please Enter Valid Inputs" });
        }

        try {
            const taskBody: updatedInput = parsingValidation.data;
            const newTask = await taskModel.create({
                userId,
                title: taskBody.title,
                description: taskBody.description,
                dueDate: taskBody.dueDate,
                category: taskBody.category ?? null,
                tags: taskBody.tags ?? [],
            });

            scheduleReminder({
                taskId: newTask._id.toString(),
                userId: userId as unknown as string,
                title: newTask.title,
                description: newTask.description,
                dueDate: newTask.dueDate,
            }).catch((err: unknown) => {
                console.error("Error scheduling reminder:", err);
            });

            res.status(201).json({
                newTask: {
                    ...newTask.toObject(),
                    dueDate: dayjs(newTask.dueDate).tz("Asia/Kolkata").format(),
                },
                message: "Task Created Successfully",
            });
        } catch (error) {
            res.status(500).json({ message: "INTERNAL SERVER ERROR" });
        }
    },
);

taskRouter.put(
    "/update-task",
    authMiddleware,
    async (req: Request, res: Response) => {
        const userId = req.userId;
        const taskInput = z.object({
            taskId: z.string(),
            title: z.string().min(1).optional(),
            description: z.string().min(1).optional(),
            dueDate: z.coerce.date().optional(),
            status: z.enum(["pending", "completed"]).optional(),
            category: z.string().nullable().optional(),
            tags: z.array(z.string()).optional(),
        });

        type updatedTask = z.infer<typeof taskInput>;

        const parsingValidation = taskInput.safeParse(req.body);

        if (!parsingValidation.success) {
            return res.status(400).json({ message: "PLEASE ENTER VALID INPUT" });
        }

        if (Object.keys(parsingValidation.data).length === 0) {
            return res
                .status(400)
                .json({ message: "At least one field is required to update" });
        }

        try {
            const updateBody: updatedTask | any = parsingValidation.data;

            Object.keys(updateBody).forEach(
                (key) => updateBody[key] === undefined && delete updateBody[key],
            );

            const updatedData = await taskModel.findOneAndUpdate(
                { _id: updateBody.taskId, userId },
                updateBody,
                { new: true },
            );

            if (updatedData) {
                const dueDateWasUpdated = "dueDate" in updateBody;
                const statusWasUpdated = "status" in updateBody;

                if (dueDateWasUpdated) {
                    rescheduleReminder(updatedData._id.toString(), {
                        taskId: updatedData._id.toString(),
                        userId: userId as unknown as string,
                        title: updatedData.title,
                        description: updatedData.description,
                        dueDate: updatedData.dueDate,
                    }).catch((error: unknown) => {
                        console.error("Error rescheduling reminder:", error);
                    });
                } else if (statusWasUpdated) {
                    if (updateBody.status === "completed") {
                        cancelReminder(updatedData._id.toString()).catch((err: unknown) => {
                            console.error("Error cancelling reminder:", err);
                        });

                        notificationService
                            .sendNotification({
                                taskId: updatedData._id.toString(),
                                userId: userId as unknown as string,
                                title: updatedData.title,
                                description: updatedData.description,
                                dueDate: updatedData.dueDate,
                                notificationType: "completed",
                                completedAt: new Date(),
                            })
                            .catch((err: unknown) => {
                                console.error("Error sending completion notification:", err);
                            });
                    }
                }

                res
                    .status(200)
                    .json({ updatedData, message: "Task Updated Successfully" });
            } else {
                return res
                    .status(401)
                    .json({ message: "You are not authorized to do this task" });
            }
        } catch (error) {
            res.status(500).json({ message: "INTERNAL SERVER ERROR" });
        }
    },
);

taskRouter.delete(
    "/delete-task",
    authMiddleware,
    async (req: Request, res: Response) => {
        const userId = req.userId;
        const taskId = req.body.taskId;
        try {
            await cancelReminder(taskId);
            await taskModel.deleteOne({ _id: taskId, userId });
            res.status(204).json({ message: "Task Deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "INTERNAL SERVER ERROR" });
        }
    },
);

taskRouter.get(
    "/filter",
    authMiddleware,
    async (req: Request, res: Response) => {
        const userId = req.userId;
        const { category, tags } = req.query;

        const filter: any = { userId };

        if (category) {
            filter.category = category;
        }

        if (tags) {
            const tagList = (tags as string).split(",").map((t) => t.trim());
            filter.tags = { $in: tagList };
        }

        console.log(filter)

        try {
            const tasks = await taskModel.find(filter);
            res.status(200).json({ tasks });
        } catch (error) {
            res.status(500).json({ message: "INTERNAL SERVER ERROR" });
        }
    },
);

taskRouter.post('/category', authMiddleware, async (req , res) => {  
    const userTypes = z.object({
        category : z.string().min(2, {message : `Please Enter Valid category`}).max(100, {message : "Please Enter Valid Category"})
    }) 
    
       const parsingValidation = userTypes.safeParse(req.body);

        if (!parsingValidation.success) {
            return res.status(400).json({ message: "PLEASE ENTER VALID INPUT" });
        }

    
    const userId = req.userId
    const category : any = parsingValidation.data
   

    try {
        const tasks = await taskModel.find({userId, category})
        if(tasks.length == 0) {
            res.status(404).json({
                message : "No Tasks Found On this category"
            })
        } else {
             res.status(200).json({
                tasks
            })

        }
    } catch (error) {
        res.status(500).json({
            message : "Internal Error"
        })        
    }
})

