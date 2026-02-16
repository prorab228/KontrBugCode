// src/managers/MenuManager.js
const { Menu, MenuItem, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const yauzl = require('yauzl');

class MenuManager {
  constructor(appService) {
    this.app = appService;
    this.APP_VERSION = '1.0.7 Beta';
    this.APP_AUTHOR = 'Лунев Валерий Константинович ';
  }

  createCompleteMenu(libraries = []) {
    const template = [
      {
        label: 'Файл',
        submenu: [
          { label: 'Новый проект', accelerator: 'Ctrl+N', click: () => this.sendMenuEvent('menu-new-project') },
          { label: 'Открыть проект', accelerator: 'Ctrl+O', click: () => this.sendMenuEvent('menu-open-project-dialog') },
          { label: 'Сохранить проект', accelerator: 'Ctrl+S', click: () => this.sendMenuEvent('menu-save-project') },
          { label: 'Сохранить проект как...', accelerator: 'Ctrl+Shift+S', click: () => this.sendMenuEvent('menu-save-project-as') },
          { type: 'separator' },
          { label: 'Экспорт скетча', click: () => this.sendMenuEvent('menu-export-sketch') },
          { type: 'separator' },
          { label: 'Последние проекты', id: 'recent-projects', submenu: [{ label: 'Нет последних проектов', enabled: false }] },
          { type: 'separator' },
          { label: 'Выход', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', click: () => this.quitApp() }
        ]
      },
      {
        label: 'Правка',
        submenu: [
          { role: 'undo', label: 'Отменить' },
          { role: 'redo', label: 'Вернуть' },
          { type: 'separator' },
          { role: 'cut', label: 'Вырезать' },
          { role: 'copy', label: 'Копировать' },
          { role: 'paste', label: 'Вставить' },
          { role: 'selectall', label: 'Выделить все' }
        ]
      },
      {
        label: 'Инструменты',
        submenu: [
          { label: 'Скомпилировать', accelerator: 'Ctrl+B', click: () => this.sendMenuEvent('menu-compile') },
          { label: 'Загрузить на Arduino', accelerator: 'Ctrl+U', click: () => this.sendMenuEvent('menu-upload') },
          { type: 'separator' },
          { label: 'Настройки платы', click: () => this.sendMenuEvent('menu-board-settings') },
          { label: 'Управление платами', click: () => this.sendMenuEvent('menu-board-management') }
        ]
      },
      {
        label: 'Вид',
        submenu: [
          { label: 'Показать логи', click: () => this.sendMenuEvent('menu-show-logs') },
          { type: 'separator' },
          { label: 'Переключить тему', click: () => this.sendMenuEvent('menu-toggle-theme') }
        ]
      },
      this.createLibrariesSubmenu(libraries),
      {
        label: 'Справка',
        submenu: [
          { label: 'О программе', click: () => this.showAboutDialog() },
          {
            label: 'Wiki',
            click: () => shell.openExternal('https://www.контрбагтех.рф/база-знаний')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  createLibrariesSubmenu(libraries) {
    const sortedLibraries = [...libraries].sort((a, b) => a.localeCompare(b));

    const librariesSubmenu = [
      {
        label: 'Обновить список библиотек',
        click: () => this.app.refreshLibrariesMenu()
      },
      {
        label: 'Установить ZIP библиотеку',
        click: () => this.installZipLibrary()
      },
      { type: 'separator' }
    ];

    if (sortedLibraries.length === 0) {
      librariesSubmenu.push({
        label: 'Библиотеки не найдены',
        enabled: false
      });
    } else {
      for (const libraryName of sortedLibraries) {
        const libraryMenu = {
          label: libraryName,
          submenu: [
            {
              label: 'Подключить',
              click: () => this.app.libraryService.insertIncludeStatement(libraryName)
            }
          ]
        };

        const examples = this.getLibraryExamplesSync(libraryName);
        if (examples.length > 0) {
          libraryMenu.submenu.push({ type: 'separator' });

          const examplesSubmenu = examples.map(example => ({
            label: example.name,
            click: () => this.app.libraryService.openLibraryExample(libraryName, example.folder, example.file)
          }));

          libraryMenu.submenu.push({
            label: 'Примеры',
            submenu: examplesSubmenu
          });
        }

        librariesSubmenu.push(libraryMenu);
      }
    }

    return {
      label: 'Библиотеки',
      submenu: librariesSubmenu
    };
  }

  getLibraryExamplesSync(libraryName) {
    try {
      const librariesPath = this.app.libraryManager.librariesPath;
      const libraryPath = path.join(librariesPath, libraryName);
      const examplesPath = path.join(libraryPath, 'examples');

      if (!fs.existsSync(examplesPath)) {
        return [];
      }

      const items = fs.readdirSync(examplesPath);
      const examples = [];

      for (const item of items) {
        if (item.startsWith('.')) continue;

        const itemPath = path.join(examplesPath, item);
        try {
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            const files = fs.readdirSync(itemPath);
            const inoFiles = files.filter(file => file.endsWith('.ino'));

            if (inoFiles.length > 0) {
              examples.push({
                name: item,
                folder: item,
                file: inoFiles[0]
              });
            }
          }
        } catch (error) {
          console.warn(`Error checking ${itemPath}:`, error.message);
        }
      }

      return examples;
    } catch (error) {
      console.warn(`Error loading examples for ${libraryName}:`, error.message);
      return [];
    }
  }

  async installZipLibrary() {
    try {
      const result = await this.app.showOpenDialog({
        title: 'Выберите ZIP файл библиотеки',
        filters: [
          { name: 'ZIP Archives', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return;
      }

      const zipPath = result.filePaths[0];
      const librariesPath = this.app.libraryManager.librariesPath;

      const tempDir = path.join(__dirname, '../../temp_extract');
      await fs.ensureDir(tempDir);
      await fs.emptyDir(tempDir);

      try {
        await this.extractZip(zipPath, tempDir);

        const items = await fs.readdir(tempDir);
        let libraryFolder = null;

        for (const item of items) {
          const itemPath = path.join(tempDir, item);
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            const headerFiles = await this.app.libraryManager.findHeaderFilesFast(itemPath);
            if (headerFiles.length > 0) {
              libraryFolder = item;
              break;
            }
          }
        }

        if (!libraryFolder) {
          throw new Error('В ZIP архиве не найдена папка с библиотекой');
        }

        const sourcePath = path.join(tempDir, libraryFolder);
        const targetPath = path.join(librariesPath, libraryFolder);

        await fs.copy(sourcePath, targetPath);

        await this.app.refreshLibrariesMenu();

        this.app.showNotification(`Библиотека "${libraryFolder}" успешно установлена`);
      } finally {
        await fs.remove(tempDir);
      }
    } catch (error) {
      console.error('Error installing ZIP library:', error);
      this.app.showNotification(`Error installing ZIP library: ${error}`);
    }
  }

  async extractZip(zipPath, targetPath) {
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          if (entry.fileName.endsWith('/')) {
            const dirPath = path.join(targetPath, entry.fileName);
            fs.ensureDirSync(dirPath);
            zipfile.readEntry();
          } else {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                zipfile.close();
                return reject(err);
              }

              const filePath = path.join(targetPath, entry.fileName);
              fs.ensureDirSync(path.dirname(filePath));

              const writeStream = fs.createWriteStream(filePath);
              readStream.pipe(writeStream);

              writeStream.on('close', () => {
                zipfile.readEntry();
              });

              writeStream.on('error', (err) => {
                zipfile.close();
                reject(err);
              });
            });
          }
        });

        zipfile.on('end', () => {
          zipfile.close();
          resolve();
        });

        zipfile.on('error', (err) => {
          reject(err);
        });
      });
    });
  }

  updateRecentProjectsMenu(recentProjects) {
    try {
      const menu = Menu.getApplicationMenu();
      if (!menu) return;

      const fileMenu = menu.items.find(item => item.label === 'Файл');
      if (!fileMenu || !fileMenu.submenu) return;

      const recentProjectsItem = fileMenu.submenu.items.find(item => item.id === 'recent-projects');
      if (!recentProjectsItem || !recentProjectsItem.submenu) return;

      recentProjectsItem.submenu.clear();

      if (recentProjects.length === 0) {
        recentProjectsItem.submenu.append(new MenuItem({
          label: 'Нет последних проектов',
          enabled: false
        }));
      } else {
        recentProjects.forEach(project => {
          recentProjectsItem.submenu.append(new MenuItem({
            label: project.name || project.path,
            click: () => {
              this.app.mainWindow?.webContents.send('load-recent-project', project.path);
            }
          }));
        });

        recentProjectsItem.submenu.append(new MenuItem({ type: 'separator' }));
        recentProjectsItem.submenu.append(new MenuItem({
          label: 'Очистить список',
          click: () => {
            this.app.mainWindow?.webContents.send('clear-recent-projects');
          }
        }));
      }
    } catch (error) {
      console.error('Error updating recent projects menu:', error);
    }
  }

  sendMenuEvent(event) {
    this.app.mainWindow?.webContents.send(event);
  }

  showAboutDialog() {
    if (this.app.mainWindow && !this.app.mainWindow.isDestroyed()) {
      const { dialog } = require('electron');
      dialog.showMessageBox(this.app.mainWindow, {
        type: 'info',
        title: 'О программе',
        message: 'КонтрБагКОД',
        detail: `Редактор кода с поддержкой программирования блоками и кодом для контроллера ZERO и платформ Arduino \nВерсия ${this.APP_VERSION} \n\n© КонтрБагТех: https://www.контрбагтех.рф `
      });
    }
  }

  quitApp() {
    this.app.quitApp();
  }
}

module.exports = MenuManager;