// src/services/AppService.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs-extra');

const WindowManager = require('../managers/WindowManager');
const IpcHandlerManager = require('../managers/IpcHandlerManager');
const FileManager = require('../managers/FileManager');
const SerialManager = require('../managers/SerialManager');
const CompilationManager = require('../managers/CompilationManager');
const MenuManager = require('../managers/MenuManager');
const LibraryService = require('./LibraryService');

class AppService {
  constructor() {
    this.app = app;
    this.isDev = process.env.NODE_ENV === 'development';
    this.initialized = false;
    this.isQuitting = false;
    this.autoSaveInterval = null;

    // Инициализация менеджеров
    this.windowManager = new WindowManager();
    this.ipcManager = new IpcHandlerManager(this);
    this.fileManager = new FileManager(this);
    this.serialManager = new SerialManager(this);
    this.compilationManager = new CompilationManager(this);
    this.menuManager = new MenuManager(this);
    this.libraryService = new LibraryService(this);

    // Существующие менеджеры (будут инициализированы позже)
    this.boardManager = null;
    this.libraryManager = null;
    this.uploadService = null;

    // Свойства для совместимости
    this.recentProjects = [];
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🚀 Инициализация КонтрБагКОД...');

      // Динамически загружаем модули чтобы избежать циклических зависимостей
      await this.initBoardManager();
      await this.initLibraryManager();

      // Создание окна
      await this.windowManager.createWindow();

      // Настройка остальных компонентов
      this.ipcManager.setupHandlers();
      await this.updateLibrariesMenu();
      this.setupAppEvents();
      this.setupAutoSave();

      this.initialized = true;
      this.log('INFO', 'AppService', 'Приложение успешно инициализировано');

    } catch (error) {
      this.log('ERROR', 'AppService', `Ошибка инициализации: ${error.message}`);
      throw error;
    }
  }

  async initBoardManager() {
    // Динамический импорт чтобы избежать циклических зависимостей
    const BoardManager = require('../../js/boards/BoardManager');
    const UploadService = require('./UploadService');

    this.boardManager = new BoardManager();
    await this.boardManager.init();
    this.uploadService = new UploadService(this.boardManager);

    // Настройка callback для прогресса загрузки
    this.uploadService.setProgressCallback((data) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('upload-progress', data);
      }
    });
  }

  async initLibraryManager() {
    // Динамический импорт чтобы избежать циклических зависимостей
    const LibraryManager = require('./libraryManager');
    this.libraryManager = new LibraryManager();
    await this.libraryManager.initialize();
  }

  async updateLibrariesMenu() {
    try {
      if (!this.libraryManager) {
        await this.initLibraryManager();
      }

      const scanResult = await this.libraryManager.handleScanLibraries();

      if (scanResult.success) {
        const libraries = scanResult.libraries;
        this.menuManager.createCompleteMenu(libraries);
      }
    } catch (error) {
      console.error('Error updating libraries menu:', error);
    }
  }

  async refreshLibrariesMenu() {
    await this.updateLibrariesMenu();
  }

  log(level, source, message) {
    const timestamp = new Date().toISOString();
    console[level.toLowerCase()](`[${timestamp}] [${source}] ${message}`);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('log-message', {
        level, source, message, timestamp
      });
    }
  }

  showNotification(message, isError = false) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('show-notification', {
        type: isError ? 'error' : 'info',
        message: message
      });
    }
  }

  setupAppEvents() {
    const { app, shell } = require('electron');

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.isQuitting = true;
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createWindow();
      }
    });

    app.on('before-quit', async (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        await this.quitApp();
      }
    });
  }

  setupAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('auto-save-request');
      }
    }, 30000);
  }

  async quitApp() {
    this.isQuitting = true;
    await this.cleanup();
    this.app.quit();
  }

  async cleanup() {
    try {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }

      await this.serialManager.disconnectSerialPort();

      const tempDir = path.join(__dirname, '../../temp');
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  }

  // Геттеры
  get mainWindow() {
    return this.windowManager.mainWindow;
  }

  get isWindowAvailable() {
    return this.windowManager.mainWindow && !this.windowManager.mainWindow.isDestroyed();
  }
}

module.exports = AppService;