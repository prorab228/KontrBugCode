// main.js (финальный)
const { app } = require('electron');
const AppService = require('./src/services/AppService');

class MainApp {
  constructor() {
    this.appService = new AppService();
  }

  async initialize() {
    try {
      console.log('🚀 Инициализация КонтрБагКОД...');
      await this.appService.initialize();
      console.log('✅ Приложение успешно инициализировано');
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      app.quit();
    }
  }
}

// Запуск приложения
const mainApp = new MainApp();

app.whenReady().then(() => mainApp.initialize());

// Глобальные обработчики ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанный промис:', promise, 'причина:', reason);
});

// Экспорт для использования в других файлах
module.exports = { MainApp };