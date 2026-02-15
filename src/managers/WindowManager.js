// src/managers/WindowManager.js
const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, '../../assets/icons/icon.png'),
      title: 'КонтрБагКОД',
      show: false
    });

    this.mainWindow.loadFile('index.html');

    this.mainWindow.webContents.on('did-finish-load', () => {
      this.sendBoardsConfig();
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      if (process.env.NODE_ENV === 'development') {
        this.mainWindow.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  sendBoardsConfig() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      // Нужно получить конфигурацию от AppService
      this.mainWindow.webContents.send('boards-config-loaded', {
        boards: [],
        userBoards: [],
        cores: []
      });
    }
  }

  setupAppEvents(appService) {
    const { app } = require('electron');

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        appService.isQuitting = true;
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', async (event) => {
      if (!appService.isQuitting) {
        event.preventDefault();
        await appService.cleanup();
      }
    });
  }
}

module.exports = WindowManager;