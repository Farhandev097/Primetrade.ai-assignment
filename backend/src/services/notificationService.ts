import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface NotificationData {
    taskId: string;
    userId: string;
    title: string;
    description: string;
    dueDate: Date;
    notificationType: 'reminder' | 'completed';
    completedAt?: Date;
}

class NotificationService {
    private reminderWebhookUrl: string | null;
    private analyticsWebhookUrl: string | null;

    constructor() {
        this.reminderWebhookUrl = process.env.REMINDER_WEBHOOK_URL || null;
        this.analyticsWebhookUrl = process.env.ANALYTICS_WEBHOOK_URL || null;
    }

    async sendNotification(data: NotificationData): Promise<void> {
        const webhookUrl = data.notificationType === 'completed'
            ? this.analyticsWebhookUrl
            : this.reminderWebhookUrl;

        if (!webhookUrl) return;

        const payload = this.buildPayload(data);

        try {
            await this.sendToWebhookWithRetry(webhookUrl, payload);
        } catch (error) {
            console.error(`Webhook failed [${data.notificationType}]:`, error);
        }
    }

    private buildPayload(data: NotificationData) {
        if (data.notificationType === 'completed') {
            return {
                event: "task_completed",
                timestamp: new Date().toISOString(),
                data: {
                    taskId: data.taskId,
                    userId: data.userId,
                    title: data.title,
                    completedAt: dayjs(data.completedAt).tz('Asia/Kolkata').format('YYYY-MM-DDTHH:mm:ssZ'),
                }
            };
        }

        return {
            event: "task_reminder",
            timestamp: new Date().toISOString(),
            data: {
                taskId: data.taskId,
                userId: data.userId,
                title: data.title,
                description: data.description,
                dueDate: dayjs(data.dueDate).tz('Asia/Kolkata').format('YYYY-MM-DDTHH:mm:ssZ'),
                notificationType: data.notificationType,
            }
        };
    }

    private async sendToWebhookWithRetry(webhookUrl: string, payload: any, maxRetries: number = 3): Promise<void> {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
                await this.sendToWebhook(webhookUrl, payload);
                return;
            } catch (error: any) {
                if (attempt === maxRetries - 1) throw error;
            }
        }
    }

    private async sendToWebhook(webhookUrl: string, payload: any): Promise<void> {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const notificationService = new NotificationService();