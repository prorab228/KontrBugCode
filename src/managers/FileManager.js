// src/managers/FileManager.js
const { dialog } = require('electron');
const fs = require('fs-extra');
const path = require('path');

class FileManager {
  constructor(appService) {
    this.app = appService;
  }

  async saveProject({ data, filename }) {
    try {
      const result = await dialog.showSaveDialog(this.app.mainWindow, {
        defaultPath: filename || `project_${Date.now()}.cbp`,
        filters: [
          { name: 'Проекты КонтрБагКОД', extensions: ['cbp'] },
          { name: 'Все файлы', extensions: ['*'] }
        ]
      });

      if (!result.canceled) {
        await fs.writeFile(result.filePath, data, 'utf8');
        return { success: true, path: result.filePath };
      }

      return { success: false, error: 'Отменено пользователем' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async openProject() {
    try {
      const result = await dialog.showOpenDialog(this.app.mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Проекты КонтрБагКОД', extensions: ['cbp', 'ino'] },
          { name: 'Arduino Sketch', extensions: ['ino'] },
          { name: 'Все файлы', extensions: ['*'] }
        ]
      });

      if (!result.canceled) {
        const filePath = result.filePaths[0];
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, filePath, data: content };
      }

      return { success: false, error: 'Отменено пользователем' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveSketch({ code, filename }) {
    try {
      const result = await dialog.showSaveDialog(this.app.mainWindow, {
        defaultPath: filename || `sketch_${Date.now()}.ino`,
        filters: [
          { name: 'Arduino Sketch', extensions: ['ino'] },
          { name: 'Все файлы', extensions: ['*'] }
        ]
      });

      if (!result.canceled) {
        await fs.writeFile(result.filePath, code, 'utf8');
        return { success: true, path: result.filePath };
      }

      return { success: false, error: 'Отменено пользователем' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loadSketch(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveLogFile({ logs, timestamp }) {
    try {
      const logDir = path.join(this.app.getPath('userData'), 'logs');
      await fs.ensureDir(logDir);

      const logFilePath = path.join(logDir, `app_${new Date().toISOString().slice(0, 10)}.log`);

      let existingLogs = [];
      if (await fs.pathExists(logFilePath)) {
        const content = await fs.readFile(logFilePath, 'utf8');
        existingLogs = content.split('\n').filter(line => line.trim());
      }

      const newLogEntries = logs.map(log =>
        `[${log.timestamp}] ${log.level} ${log.source}: ${log.message}`
      );

      const allLogs = [...newLogEntries, ...existingLogs].slice(0, 5000);
      await fs.writeFile(logFilePath, allLogs.join('\n'), 'utf8');

      return { success: true, filePath: logFilePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loadLogFile() {
    try {
      const logDir = path.join(this.app.getPath('userData'), 'logs');
      const logFilePath = path.join(logDir, `app_${new Date().toISOString().slice(0, 10)}.log`);

      if (!await fs.pathExists(logFilePath)) {
        return { success: true, logs: [] };
      }

      const content = await fs.readFile(logFilePath, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());

      const logs = logLines.map(line => {
        const match = line.match(/^\[(.*?)\] (\w+) (.*?): (.*)$/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            source: match[3],
            message: match[4]
          };
        }
        return null;
      }).filter(log => log);

      return { success: true, logs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cleanupTempFiles() {
    try {
      const tempDir = path.join(__dirname, '../../temp');
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = FileManager;