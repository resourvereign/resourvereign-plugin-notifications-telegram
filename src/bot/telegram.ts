import { Markup, Telegraf } from 'telegraf';
import { v4 as uuid } from 'uuid';

type Action = {
  text: string;
  callback: () => void;
};

type ActionEntry = {
  callback: () => void;
  messageId: string; // Unique identifier for the message this action is associated with
};

type MessageActionsEntry = {
  date: Date;
  actionIds: string[];
};

export class TelegramClient {
  private bot: Telegraf;

  private actions = new Map<string, ActionEntry>();
  private messageActions = new Map<string, MessageActionsEntry>();
  private cleaningInterval: NodeJS.Timeout;

  constructor(token: string) {
    this.bot = new Telegraf(token);

    this.bot.command('start', (ctx) =>
      ctx.reply(
        `Welcome! your id is ${ctx.from.id}, you will need to provide it in the plugin configuration`,
      ),
    );

    this.bot.action(/.+/, async (ctx) => {
      const actionId = ctx.match[0];
      if (this.actions.has(actionId)) {
        const actionEntry = this.actions.get(actionId);
        this.actions.get(actionId)?.callback();

        // Cleanup: Remove all actions associated with this action's message
        if (actionEntry && this.messageActions.has(actionEntry.messageId)) {
          this.messageActions
            .get(actionEntry.messageId)
            ?.actionIds.forEach((id) => this.actions.delete(id));
          this.messageActions.delete(actionEntry.messageId); // Remove the entry for this message
        }

        // Edit the message to disable the buttons
        await ctx.editMessageReplyMarkup({
          inline_keyboard: [],
        });
      }
    });

    // Cleanup: Remove all actions older than 24 hour (check every 5 minutes)
    this.cleaningInterval = setInterval(
      () => {
        const now = new Date();
        for (const [messageId, entry] of this.messageActions.entries()) {
          if (now.getTime() - entry.date.getTime() > 24 * 60 * 60 * 1000) {
            // TODO: Remove the message action in telegram
            this.messageActions.delete(messageId);
            entry.actionIds.forEach((id) => this.actions.delete(id));
          }
        }
      },
      5 * 60 * 1000, // Cleanup every 5 minutes
    );
  }

  async start() {
    await this.bot.launch();
  }

  stop() {
    this.messageActions.clear();
    this.actions.clear();

    clearInterval(this.cleaningInterval);

    this.bot.stop();
  }

  async sendMessage({
    userId,
    message,
    actions,
  }: {
    userId: number;
    message: string;
    actions?: Action[];
  }) {
    const messageId = uuid();
    const actionIds: string[] = [];

    const processedActions = (actions ?? []).map((action) => {
      const actionId = uuid();
      this.actions.set(actionId, { callback: action.callback, messageId });
      actionIds.push(actionId);
      return {
        ...action,
        uuid: actionId,
      };
    });

    this.messageActions.set(messageId, { actionIds, date: new Date() });

    await this.bot.telegram.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(
        processedActions.map((action) => Markup.button.callback(action.text, action.uuid)),
      ),
    });
  }
}
