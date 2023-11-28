import { Logger } from '@resourvereign/plugin-types/logger.js';
import { PluginSchemaPropertyType } from '@resourvereign/plugin-types/plugin/index.js';
import { NotificationsPlugin } from '@resourvereign/plugin-types/plugin/notifications.js';

import { TelegramClient } from './bot/telegram.js';

const schema = {
  properties: {
    token: {
      type: PluginSchemaPropertyType.string,
    },
    userId: {
      type: PluginSchemaPropertyType.uint32,
    },
  },
};

type TelegramInitData = {
  token: string;
  userId: number;
};

const initialize = async ({ token, userId }: TelegramInitData, logger: Logger) => {
  return {
    validate() {
      logger.debug(`Starting validation`);
      return typeof token === 'string' && typeof userId === 'number' && !!token && !!userId;
    },
    async notify(message: string) {
      try {
        logger.debug(`Sending notification ${message}`);
        const telegramClient = new TelegramClient(token);
        await telegramClient.sendMessage(userId, message);
        return true;
      } catch (error) {
        logger.error(`Failed to send notification: ${error}`);
        return false;
      }
    },
  };
};

export default {
  schema,
  initialize,
} satisfies NotificationsPlugin<TelegramInitData>;
