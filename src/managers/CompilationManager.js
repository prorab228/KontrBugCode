// src/managers/CompilationManager.js
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CompilationManager {
  constructor(appService) {
    this.app = appService;
  }

  async compileSketch({ code, board }) {
    try {
      if (!code || code.trim().length === 0) {
        throw new Error('Код пустой!');
      }

      const sketchDir = await this.createSketchDirectory(code);
      await this.app.boardManager.verifyArduinoCli();

      const boardConfig = this.app.boardManager.getBoardConfig(board);

      let compileResult;
      try {
        compileResult = await this.compile(sketchDir, boardConfig);
      } catch (error) {
        if (error.stderr && (error.stderr.includes('not installed') || error.stderr.includes('платформа не установлена'))) {
          console.log(`install board: ${board} core `, boardConfig);
          await this.app.boardManager.installCore(boardConfig.coreId);

          compileResult = await this.compile(sketchDir, boardConfig);
        } else {
          throw error;
        }
      }

      return { success: true, ...compileResult, sketchPath: sketchDir };
    } catch (error) {
      console.error('Compilation error:', error);
      return { success: false, error: error.message, stdout: '', stderr: error.stderr || '' };
    }
  }

  async uploadSketch({ sketchPath, board, port, uploadSettings = {} }) {
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
  }

  async createSketchDirectory(code) {
    const tempDir = path.join(__dirname, '../../temp');
    await fs.ensureDir(tempDir);

    const sketchName = `sketch_${Date.now()}`;
    const sketchDir = path.join(tempDir, sketchName);
    await fs.ensureDir(sketchDir);

    const sketchFile = path.join(sketchDir, `${sketchName}.ino`);
    await fs.writeFile(sketchFile, code);

    return sketchDir;
  }

  async compile(sketchDir, boardConfig) {
    await this.app.boardManager.verifyArduinoCli();
    const compileCommand = `${this.app.boardManager.arduinoCliPath} --config-file "${this.app.boardManager.arduinoCliConfigPath}" compile --fqbn ${boardConfig.fqbn} "${sketchDir}"`;
    console.log(`Compilation sketch, command: ${compileCommand}`);
    return await execAsync(compileCommand, { timeout: 120000 });
  }

  async cleanup() {
    try {
      const tempDir = path.join(__dirname, '../../temp');
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    } catch (error) {
      console.error('Error cleaning up compilation temp files:', error);
    }
  }
}

module.exports = CompilationManager;