import { Logger } from '@resourvereign/plugin-types/logger.js';
import { PluginSchema } from '@resourvereign/plugin-types/plugin/index.js';
import {
  NotificationsPlugin,
  ResultNotification,
} from '@resourvereign/plugin-types/plugin/notifications.js';
import config from 'config';
import { format } from 'date-fns';

import { TelegramClient } from './bot/telegram.js';

const token = process.env.TELEGRAM_TOKEN || config.get<string>('plugins.telegram.token');
const validationTimeout =
  Number(process.env.TELEGRAM_VALIDATION_TIMEOUT) ||
  config.get<number>('plugins.telegram.validationTimeout');

const schema: PluginSchema = {
  properties: {
    userId: {
      type: 'uint32',
    },
  },
};

type TelegramInitData = {
  userId: number;
};

let telegramClient: TelegramClient;

const register = () => {
  telegramClient = new TelegramClient(token);
  telegramClient.start();

  return async ({ userId }: TelegramInitData, logger: Logger) => {
    return {
      async validate() {
        try {
          logger.debug(`Starting validation`);

          if (!token) {
            logger.error(`Token not found`);
            return false;
          }

          if (!userId || typeof userId !== 'number') {
            logger.error(`Invalid  userId`);
            return false;
          }

          return await Promise.race([
            new Promise<boolean>((res) => {
              setTimeout(() => res(false), validationTimeout);
            }),
            new Promise<boolean>((res) => {
              telegramClient.sendMessage({
                userId,
                message: 'Enable plugin?',
                actions: [
                  {
                    text: 'Yes!',
                    callback: () => {
                      res(true);
                    },
                  },
                ],
              });
            }),
          ]);
        } catch (error) {
          logger.error(`Failed to send notification: ${error}`);
          return false;
        }
      },
      async notify(notification: ResultNotification) {
        try {
          const message = `*${notification.integration}:* booked *${notification.resource}* for *${format(notification.date, 'yyyy-MM-dd')}*`;

          logger.debug(`Sending notification ${message}`);
          await telegramClient.sendMessage({ userId, message });
          return true;
        } catch (error) {
          logger.error(`Failed to send notification: ${error}`);
          return false;
        }
      },
    };
  };
};

export default {
  schema,
  register,
  unregister: async () => {
    if (telegramClient) {
      telegramClient.stop();
    }
  },
} satisfies NotificationsPlugin<TelegramInitData>;
