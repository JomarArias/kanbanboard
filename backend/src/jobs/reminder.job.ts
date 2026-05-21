import { Card } from "../models/card.js";
import { createNotification } from "../services/notification.service.js";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const DEFAULT_DUE_SOON_HOURS = 24;
const DEFAULT_REMINDER_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 horas

const intervalMs = Number(process.env.REMINDER_JOB_INTERVAL_MS || DEFAULT_INTERVAL_MS);
const dueSoonHours = Number(process.env.REMINDER_DUE_SOON_HOURS || DEFAULT_DUE_SOON_HOURS);
const reminderCooldownMs = Number(process.env.REMINDER_COOLDOWN_MS || DEFAULT_REMINDER_COOLDOWN_MS);

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

const canSendReminder = (lastReminderSentAt?: Date | null) => {
  if (!lastReminderSentAt) return true;
  return Date.now() - new Date(lastReminderSentAt).getTime() >= reminderCooldownMs;
};

const buildReminderPayload = (cardTitle: string, dueDate: Date) => {
  const now = new Date();
  const isOverdue = dueDate.getTime() < now.getTime();

  if (isOverdue) {
    return {
      type: "card-overdue",
      title: "Tarjeta vencida",
      message: `La tarjeta "${cardTitle}" ya esta vencida.`
    };
  }

  return {
    type: "card-due-soon",
    title: "Tarjeta por vencer",
    message: `La tarjeta "${cardTitle}" vence pronto.`
  };
};

const runReminderCycle = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    const dueSoonLimit = new Date(now.getTime() + dueSoonHours * 60 * 60 * 1000);

    const cards = await Card.find({
      archived: false,
      assigneeId: { $ne: null },
      dueDate: { $ne: null, $lte: dueSoonLimit }
    })
      .select("_id title dueDate assigneeId lastReminderSentAt")
      .lean();

    for (const card of cards) {
      if (!card.assigneeId || !card.dueDate) continue;
      if (!canSendReminder(card.lastReminderSentAt as Date | null | undefined)) continue;

      const reminder = buildReminderPayload(card.title, new Date(card.dueDate));

      await createNotification({
        userId: card.assigneeId.toString(),
        cardId: card._id.toString(),
        type: reminder.type,
        title: reminder.title,
        message: reminder.message
      });

      await Card.updateOne(
        { _id: card._id },
        { $set: { lastReminderSentAt: new Date() } }
      );
    }
  } catch (error) {
    console.error("[reminder-job] Error ejecutando ciclo:", error);
  } finally {
    isRunning = false;
  }
};

export const startReminderJob = () => {
  if (timer) return;

  console.log(`[reminder-job] Iniciado. Intervalo=${intervalMs}ms dueSoon=${dueSoonHours}h cooldown=${reminderCooldownMs}ms`);
  runReminderCycle().catch((error) => {
    console.error("[reminder-job] Error en primer ciclo:", error);
  });

  timer = setInterval(() => {
    runReminderCycle().catch((error) => {
      console.error("[reminder-job] Error en ciclo programado:", error);
    });
  }, intervalMs);
};

export const stopReminderJob = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};
