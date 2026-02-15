// src/services/LibraryService.js
class LibraryService {
  constructor(appService) {
    this.app = appService;
  }

  async refreshLibrariesMenu() {
    try {
      await this.app.updateLibrariesMenu();
    } catch (error) {
      console.error('Error refreshing libraries menu:', error);
    }
  }

  async updateLibrariesMenu() {
    try {
      const scanResult = await this.app.libraryManager.handleScanLibraries();

      if (scanResult.success) {
        const libraries = scanResult.libraries;
        this.app.menuManager.createCompleteMenu(libraries);
      }
    } catch (error) {
      console.error('Error updating libraries menu:', error);
    }
  }

  insertIncludeStatement(libraryName) {
    this.app.mainWindow?.webContents.send('insert-include', libraryName);
  }

  async openLibraryExample(libraryName, exampleFolder, inoFile) {
    try {
      const librariesPath = this.app.libraryManager.librariesPath;
      const examplePath = path.join(librariesPath, libraryName, 'examples', exampleFolder, inoFile);

      if (await fs.pathExists(examplePath)) {
        const content = await fs.readFile(examplePath, 'utf8');
        this.app.mainWindow?.webContents.send('load-example', {
          content: content,
          filename: inoFile
        });
      }
    } catch (error) {
      console.error('Error opening library example:', error);
      this.app.showNotification('Ошибка загрузки примера: ' + error.message, true);
    }
  }
}

module.exports = LibraryService;