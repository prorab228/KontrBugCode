// src/managers/IpcHandlerManager.js
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

class IpcHandlerManager {
  constructor(appService) {
    this.app = appService;
  }

  setupHandlers() {
    this.setupBoardManagementHandlers();
    this.setupBoardHandlers();
    this.setupFileHandlers();
    this.setupCompilationHandlers();
    this.setupUploadHandlers();
    this.setupSerialHandlers();
    this.setupLibraryHandlers();
    this.setupMenuHandlers();
    this.setupLogHandlers();
    this.setupProgressHandlers();
    this.setupEventHandlers();
  }

  // Обработчики управления платами
  setupBoardManagementHandlers() {
    ipcMain.handle('get-board-categories', async () => {
      try {
        console.log('Getting board categories...');
        await this.app.boardManager.scanArduino15();
        const categories = this.app.boardManager.getBoardCategories();

        const categoriesObj = {};
        for (const [key, value] of categories) {
          categoriesObj[key] = value;
        }

        console.log(`Returning ${Object.keys(categoriesObj).length} categories`);
        return {
          success: true,
          categories: categoriesObj
        };
      } catch (error) {
        console.error('Error getting board categories:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('get-board-config', async (event, boardId) => {
      try {
        console.log(`Getting board config for: ${boardId}`);
        const board = this.app.boardManager.getBoard(boardId);

        if (board) {
          console.log(`Board found: ${board.name}`);
          console.log(`Board has properties: ${Object.keys(board.properties || {}).length}`);
          console.log(`Board upload settings:`, board.uploadSettings);

          return {
            success: true,
            board: board
          };
        } else {
          console.warn(`Board ${boardId} not found`);
          return {
            success: false,
            error: `Board ${boardId} not found`
          };
        }
      } catch (error) {
        console.error(`Error getting board config for ${boardId}:`, error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('get-additional-urls', async () => {
      try {
        await this.app.boardManager.loadAdditionalUrls();
        return {
          success: true,
          urls: this.app.boardManager.additionalUrls
        };
      } catch (error) {
        console.error('Error getting additional URLs:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('get-installed-cores-fast', async () => {
      try {
        const result = await this.app.boardManager.getInstalledCoresFast();
        return result;
      } catch (error) {
        console.error('Error getting installed cores fast:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-additional-urls-fast', async () => {
      try {
        const result = await this.app.boardManager.getAdditionalUrlsFast();
        return result;
      } catch (error) {
        console.error('Error getting additional URLs fast:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('clear-available-cores-cache', async () => {
      try {
        this.app.boardManager.clearAvailableCoresCache();
        return { success: true };
      } catch (error) {
        console.error('Error clearing available cores cache:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-core-index', async () => {
      try {
        const result = await this.app.boardManager.updateCoreIndex();
        return result;
      } catch (error) {
        console.error('Error updating core index:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('diagnose-arduino-cli', async () => {
      try {
        const result = await this.app.boardManager.diagnose();
        return {
          success: true,
          results: result
        };
      } catch (error) {
        console.error('Error diagnosing Arduino CLI:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('search-cores', async (event, searchTerm) => {
      try {
        console.log(`Searching cores: ${searchTerm}`);
        const cores = await this.app.boardManager.searchCores(searchTerm);
        return { success: true, cores };
      } catch (error) {
        console.error('Error searching cores:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-all-available-cores', async () => {
      try {
        const cores = await this.app.boardManager.getAllAvailableCores();
        return { success: true, cores };
      } catch (error) {
        console.error('Error getting all available cores:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('uninstall-core', async (event, coreId) => {
      try {
        console.log(`Uninstalling core: ${coreId}`);
        const result = await this.app.boardManager.uninstallCore(coreId);
        return result;
      } catch (error) {
        console.error(`Error uninstalling core ${coreId}:`, error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('get-available-cores', async () => {
      try {
        const cores = await this.app.boardManager.getAvailableCores();
        return { success: true, cores };
      } catch (error) {
        console.error('Error getting available cores:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('add-additional-url', async (event, url) => {
      try {
        await this.app.boardManager.addAdditionalUrl(url);
        return { success: true };
      } catch (error) {
        console.error('Error getting available cores:', error);
        return { success: false };
      }
    });

    ipcMain.handle('remove-additional-url', async (event, url) => {
      try {
        const result = await this.app.boardManager.removeAdditionalUrl(url);
        return { success: result };
      } catch (error) {
        console.error('Error removing URL:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-boards-config', async () => {
      try {
        await this.app.boardManager.init();
        const boards = this.app.boardManager.getAllBoards();
        const categories = this.app.boardManager.getCategories();
        return { success: true, boards, categories };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  // Обработчики плат
  setupBoardHandlers() {
    ipcMain.handle('get-board-upload-settings', async (event, boardId) => {
      try {
        const userDataPath = this.app.app.getPath('userData');
        const boardConfigPath = path.join(userDataPath, 'board_configs');
        const configFile = path.join(boardConfigPath, `${boardId}_upload.json`);

        if (await fs.pathExists(configFile)) {
          const settings = await fs.readJson(configFile);
          return { success: true, settings: settings.settings };
        }

        return { success: true, settings: {} };
      } catch (error) {
        console.error('Error getting board upload settings:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('save-board-upload-settings', async (event, { boardId, settings }) => {
      try {
        const userDataPath = this.app.app.getPath('userData');
        const boardConfigPath = path.join(userDataPath, 'board_configs');
        await fs.ensureDir(boardConfigPath);

        const configFile = path.join(boardConfigPath, `${boardId}_upload.json`);
        await fs.writeJson(configFile, {
          boardId: boardId,
          settings: settings,
          timestamp: new Date().toISOString()
        });

        return { success: true };
      } catch (error) {
        console.error('Error saving board upload settings:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Обработчики файлов
  setupFileHandlers() {
    ipcMain.handle('save-project', async (event, { data, filename }) => {
      try {
        const result = await this.app.showSaveDialog({
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
    });

    ipcMain.handle('open-project', async () => {
      try {
        const result = await this.app.showOpenDialog({
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
    });

    ipcMain.handle('save-sketch', async (event, { code, filename }) => {
      try {
        const result = await this.app.showSaveDialog({
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
    });

    ipcMain.handle('load-sketch', async (event, filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('auto-save-project', async (event, data) => {
      try {
        await this.saveAutoSaveData(data);
        return { success: true };
      } catch (error) {
        console.error('Auto-save failed:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('load-auto-save', async () => {
      try {
        const autoSavePath = path.join(this.app.app.getPath('userData'), 'autosave.json');
        if (await fs.pathExists(autoSavePath)) {
          const data = await fs.readJson(autoSavePath);
          return { success: true, data };
        }
        return { success: false, error: 'No auto-save data found' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  // Обработчики компиляции
  setupCompilationHandlers() {
    ipcMain.handle('compile-sketch', async (event, { code, board }) => {
      return await this.app.compilationManager.compileSketch({ code, board });
    });

    ipcMain.handle('check-arduino-cli', async () => {
      try {
        await this.app.boardManager.verifyArduinoCli();
        return { installed: true, path: this.app.boardManager.arduinoCliPath };
      } catch (error) {
        return { installed: false, error: error.message };
      }
    });
  }

  // Обработчики загрузки
  setupUploadHandlers() {
    ipcMain.handle('upload-sketch', async (event, { sketchPath, board, port, uploadSettings = {} }) => {
      try {
        const result = await this.app.uploadService.uploadSketch({
          sketchPath,
          boardId: board,
          port,
          uploadSettings
        });
        return result;
      } catch (error) {
        console.error('Upload error:', error);
        return {
          success: false,
          error: error.message,
          stdout: '',
          stderr: ''
        };
      }
    });

    ipcMain.handle('cancel-upload', async () => {
      try {
        if (this.app.uploadService) {
          const cancelled = this.app.uploadService.cancelUpload();
          return { success: cancelled };
        }
        return { success: false };
      } catch (error) {
        console.error('Error cancelling upload:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-upload-profiles', async () => {
      try {
        const profilesPath = path.join(__dirname, '../../js/boards/config/upload_profiles.json');
        if (await fs.pathExists(profilesPath)) {
          const profiles = await fs.readJson(profilesPath);
          return { success: true, profiles };
        }
        return { success: false, error: 'Profiles not found' };
      } catch (error) {
        console.error('Error loading upload profiles:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Обработчики последовательного порта
  setupSerialHandlers() {
    ipcMain.handle('get-ports', async () => {
      return await this.app.serialManager.getPorts();
    });

    ipcMain.handle('get-serial-ports', async () => {
      return await this.app.serialManager.getPorts();
    });

    ipcMain.handle('connect-serial-port', async (event, { port, baudRate = 9600 }) => {
      return await this.app.serialManager.connectSerialPort({ port, baudRate });
    });

    ipcMain.handle('disconnect-serial-port', async () => {
      return await this.app.serialManager.disconnectSerialPort();
    });

    ipcMain.handle('send-serial-data', async (event, data) => {
      return await this.app.serialManager.sendSerialData(data);
    });

    ipcMain.handle('get-serial-connection-status', async () => {
      return await this.app.serialManager.getSerialConnectionStatus();
    });
  }

  // Обработчики библиотек
  setupLibraryHandlers() {
    ipcMain.handle('get-libraries-path', () => {
      return this.app.libraryManager.findLibrariesPath();
    });

    ipcMain.handle('scan-libraries', (event, librariesPath) => {
      return this.app.libraryManager.handleScanLibraries(null, librariesPath);
    });

    ipcMain.handle('parse-library', (event, data) => {
      return this.app.libraryManager.handleParseLibrary(event, data);
    });

    ipcMain.handle('refresh-libraries-menu', () => {
      this.app.refreshLibrariesMenu();
    });
  }

  // Обработчики меню
  setupMenuHandlers() {
    ipcMain.handle('update-recent-projects', async (event, recentProjects) => {
      try {
        this.app.menuManager.updateRecentProjectsMenu(recentProjects);
        return { success: true };
      } catch (error) {
        console.error('Error updating recent projects:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Обработчики логов
  setupLogHandlers() {
    ipcMain.handle('save-log-file', async (event, { logs, timestamp }) => {
      try {
        const logDir = path.join(this.app.app.getPath('userData'), 'logs');
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
        console.error('Error saving log file:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('load-log-file', async () => {
      try {
        const logDir = path.join(this.app.app.getPath('userData'), 'logs');
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
        console.error('Error loading log file:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('clear-log-file', async () => {
      try {
        const logDir = path.join(this.app.app.getPath('userData'), 'logs');
        const logFilePath = path.join(logDir, `app_${new Date().toISOString().slice(0, 10)}.log`);

        if (await fs.pathExists(logFilePath)) {
          await fs.writeFile(logFilePath, '', 'utf8');
        }

        return { success: true };
      } catch (error) {
        console.error('Error clearing log file:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Обработчики прогресса
  setupProgressHandlers() {
    ipcMain.handle('install-core', async (event, coreId) => {
      try {
        console.log(`Installing core: ${coreId}`);

        if (!this.app.boardManager.arduinoCliPath) {
          throw new Error('Arduino CLI не найден');
        }

        const args = ['core', 'install', coreId];

        return new Promise((resolve, reject) => {
          const child = spawn(this.app.boardManager.arduinoCliPath.replace(/"/g, ''), args, {
            shell: process.platform === 'win32'
          });

          let stdout = '';
          let stderr = '';
          let lastProgressUpdate = Date.now();

          child.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;

            event.sender.send('core-install-progress', {
              coreId: coreId,
              type: 'progress',
              data: output,
              timestamp: Date.now()
            });

            const now = Date.now();
            if (now - lastProgressUpdate > 500) {
              lastProgressUpdate = now;
              console.log('Core install stdout:', output.trim());
            }
          });

          child.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;

            event.sender.send('core-install-progress', {
              coreId: coreId,
              type: 'error',
              data: output,
              timestamp: Date.now()
            });

            console.error('Core install stderr:', output.trim());
          });

          child.on('close', (code) => {
            console.log(`Core install process exited with code ${code}`);

            if (code === 0) {
              event.sender.send('core-install-progress', {
                coreId: coreId,
                type: 'complete',
                data: 'Установка завершена успешно',
                timestamp: Date.now()
              });

              setTimeout(async () => {
                try {
                  await this.app.boardManager.scanArduino15();
                  console.log('Arduino15 пересканирован после установки ядра');
                } catch (scanError) {
                  console.error('Ошибка при пересканировании Arduino15:', scanError);
                }
              }, 2000);

              resolve({
                success: true,
                stdout,
                stderr,
                message: `Ядро ${coreId} успешно установлено`
              });
            } else {
              const errorMsg = `Ошибка установки (код ${code})`;
              event.sender.send('core-install-progress', {
                coreId: coreId,
                type: 'error',
                data: errorMsg,
                timestamp: Date.now()
              });

              reject(new Error(errorMsg));
            }
          });

          child.on('error', (error) => {
            console.error('Core install process error:', error);
            event.sender.send('core-install-progress', {
              coreId: coreId,
              type: 'error',
              data: error.message,
              timestamp: Date.now()
            });
            reject(error);
          });

          const timeout = setTimeout(() => {
            if (child.exitCode === null) {
              child.kill();
              const timeoutError = new Error('Таймаут установки (45 минут)');
              event.sender.send('core-install-progress', {
                coreId: coreId,
                type: 'error',
                data: timeoutError.message,
                timestamp: Date.now()
              });
              reject(timeoutError);
            }
          }, 2700000);
        });
      } catch (error) {
        console.error(`Error installing core ${coreId}:`, error);

        event.sender.send('core-install-progress', {
          coreId: coreId,
          type: 'error',
          data: error.message,
          timestamp: Date.now()
        });

        return {
          success: false,
          error: error.message,
          message: `Ошибка установки ядра ${coreId}: ${error.message}`
        };
      }
    });
  }

  // Обработчики событий (не промисы)
  setupEventHandlers() {
    ipcMain.on('insert-include', (event, libraryName) => {
      this.app.libraryService.insertIncludeStatement(libraryName);
    });

    ipcMain.on('load-example', (event, data) => {
      this.app.mainWindow?.webContents.send('load-example', data);
    });
  }

  async saveAutoSaveData(data) {
    const autoSavePath = path.join(this.app.app.getPath('userData'), 'autosave.json');
    await fs.writeJson(autoSavePath, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = IpcHandlerManager;