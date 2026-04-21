import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { notificationService } from './notificationService';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

export interface ReminderJobData {
  taskId: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Date;
}

export const reminderQueue = new Queue('task-reminders', {
  connection,
});

export const reminderWorker = new Worker(
  'task-reminders',
  async (job) => {
    const data: ReminderJobData = job.data;

    await notificationService.sendNotification({
      taskId: data.taskId,
      userId: data.userId,
      title: data.title,
      description: data.description,
      dueDate: new Date(data.dueDate),
      notificationType: 'reminder',
    });

    return { success: true };
  },
  {
    connection,
  }
);

export async function scheduleReminder(
  data: ReminderJobData,
  reminderOffsetMs: number = 60 * 60 * 1000 
): Promise<string> {
  const dueTime = new Date(data.dueDate).getTime();
  const reminderTime = dueTime - reminderOffsetMs;
  const delay = Math.max(0, reminderTime - Date.now());

  const job = await reminderQueue.add('reminder', data, {
    delay,
    jobId: `reminder-${data.taskId}`,
  });

  return job.id!;
}

export async function cancelReminder(taskId: string): Promise<boolean> {
  const job = await reminderQueue.getJob(`reminder-${taskId}`);
  if (!job) return false;

  await job.remove();
  return true;
}

export async function rescheduleReminder(
  taskId: string,
  newData: ReminderJobData,
  reminderOffsetMs?: number
): Promise<string> {
  console.log(`Rescheduling reminder for task ${taskId}`);
  await cancelReminder(taskId);
  return scheduleReminder(newData, reminderOffsetMs);
}

export async function closeQueue() {
  await reminderQueue.close();
  await reminderWorker.close();
  await connection.quit();
}