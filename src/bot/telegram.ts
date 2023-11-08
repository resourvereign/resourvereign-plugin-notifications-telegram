import { Telegraf } from 'telegraf';
export class TelegramClient {
  private bot: Telegraf;

  constructor(token: string) {
    this.bot = new Telegraf(token);
  }

  async sendMessage(id: number, message: string) {
    await this.bot.telegram.sendMessage(id, message);
  }
}
