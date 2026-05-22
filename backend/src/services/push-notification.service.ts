import { getMessaging } from 'firebase-admin/messaging';
import { User } from '../models/User.js';

type PushInput = {
  userId: string;
  title: string;
  body: string;
  notificationId: string;
  type?: string;
};

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
]);

export const sendPushNotificationToUser = async (input: PushInput) => {
  try {
    const user = await User.findById(input.userId).select('pushTokens').lean();
    const tokens = Array.isArray(user?.pushTokens)
      ? user.pushTokens.filter((token) => typeof token === 'string' && token.trim().length > 0)
      : [];

    if (!tokens.length) return;

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: input.title,
        body: input.body
      },
      data: {
        notificationId: input.notificationId,
        ...(input.type ? { type: input.type } : {})
      }
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code;
      if (code && INVALID_TOKEN_CODES.has(code)) {
        invalidTokens.push(tokens[index]);
      }
    });

    if (invalidTokens.length) {
      await User.updateOne(
        { _id: input.userId },
        { $pull: { pushTokens: { $in: invalidTokens } } }
      );
    }
  } catch (error) {
    console.warn('Push notification send error:', error);
  }
};
