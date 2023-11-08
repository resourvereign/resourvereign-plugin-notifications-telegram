import { TelegramClient } from './bot/telegram.js';

export const schema = {
  properties: {
    token: {
      type: 'string',
    },
    userId: {
      type: 'uint32',
    },
  },
};

type TelegramInitData = {
  token: string;
  userId: number;
};

type Logger = {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export const initialize = async ({ token, userId }: TelegramInitData, logger: Logger) => {
  return {
    async notify(message: string) {
      logger.debug(`Sending notification ${message}`);
      const telegramClient = new TelegramClient(token);
      await telegramClient.sendMessage(userId, message);
    },
  };
};
