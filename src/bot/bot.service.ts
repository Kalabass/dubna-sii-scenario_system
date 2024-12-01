import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { scenario, ScenarioMessage } from 'src/const/scenario.const';

import TelegramBot = require('node-telegram-bot-api');

@Injectable()
export class BotService implements OnModuleInit {
  private activeSessions: Record<number, ScenarioMessage> = {};

  constructor(private configService: ConfigService) {}

  async sendMessage(
    bot: TelegramBot,
    chatId: number,
    currentScenario: ScenarioMessage
  ) {
    bot.sendMessage(chatId, currentScenario.message || 'Что вы выберете?', {
      reply_markup: {
        keyboard:
          currentScenario.options?.map((option) => [{ text: option.text }]) ||
          [],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  findOptionByText(
    options: ScenarioMessage[] | undefined,
    text: string
  ): ScenarioMessage | undefined {
    return options?.find((option) => option.text === text);
  }

  async onModuleInit() {
    const bot = new TelegramBot(this.configService.get('BOT_API_TOKEN'), {
      polling: true,
    });

    bot.on('message', (msg) => {
      if (msg.text === `/start` || msg.text === `Начать заново`) {
        const chatId = msg.chat.id;
        this.activeSessions[chatId] = scenario;
        this.sendMessage(bot, chatId, scenario);
        return;
      }

      const chatId = msg.chat.id;
      const text = msg.text;

      const currentScenario = this.activeSessions[chatId];
      if (!currentScenario) {
        bot.sendMessage(chatId, 'Введите /start для начала игры.');
        return;
      }

      const nextStep = this.findOptionByText(currentScenario.options, text);

      if (nextStep) {
        this.activeSessions[chatId] = nextStep;
        this.sendMessage(bot, chatId, nextStep);
      } else {
        bot.sendMessage(
          chatId,
          'Не понимаю, что вы имеете в виду. Выберите действие из меню.',
          {
            reply_markup: {
              keyboard: [[{ text: 'Начать заново' }]],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        );
      }

      if (!currentScenario.options) {
        delete this.activeSessions[chatId];
      }
    });
  }
}
