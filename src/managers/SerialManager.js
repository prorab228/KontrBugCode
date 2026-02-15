// src/managers/SerialManager.js
const { SerialPort } = require('serialport');
const { exec } = require('child_process');

class SerialManager {
  constructor(appService) {
    this.app = appService;
    this.serialPort = null;
    this.serialParser = null;
  }

  async getPorts() {
    try {
      const ports = await this.getPortsWithFallback();

      if (!this.app.boardManager.driverCheckDone) {
        this.app.boardManager.driverCheckDone = true;
        setTimeout(() => this.checkDriverInstallation(), 1000);
      }

      return ports.map(port => this.formatPort(port));
    } catch (error) {
      console.error('Error getting ports:', error);
      return [];
    }
  }

  async connectSerialPort({ port, baudRate = 9600 }) {
    try {
      await this.disconnectSerialPort();
      await this.connect(port, baudRate);
      return { success: true };
    } catch (error) {
      console.error('Error connecting to serial port:', error);
      return { success: false, error: error.message };
    }
  }

  async disconnectSerialPort() {
    try {
      await this.disconnect();
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting serial port:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSerialData(data) {
    try {
      if (this.serialPort && this.serialPort.isOpen) {
        this.serialPort.write(data + '\n');
        return { success: true };
      }
      return { success: false, error: 'Port not connected' };
    } catch (error) {
      console.error('Error sending serial data:', error);
      return { success: false, error: error.message };
    }
  }

  getSerialConnectionStatus() {
    return {
      connected: this.serialPort ? this.serialPort.isOpen : false,
      port: this.serialPort ? this.serialPort.path : null
    };
  }

  async connect(port, baudRate) {
    this.serialPort = new SerialPort({
      path: port,
      baudRate: parseInt(baudRate),
      dataBits: 8,
      stopBits: 1,
      parity: 'none'
    });

    this.serialPort.on('data', (data) => {
      const receivedData = data.toString();
      this.app.mainWindow?.webContents.send('serial-data-received', receivedData);
    });

    this.serialPort.on('open', () => {
      console.log(`Serial port ${port} opened`);
      this.app.mainWindow?.webContents.send('serial-port-connected', { port, baudRate });
    });

    this.serialPort.on('error', (error) => {
      console.error('Serial port error:', error);
      this.app.mainWindow?.webContents.send('serial-port-error', error.message);
    });

    this.serialPort.on('close', () => {
      this.app.mainWindow?.webContents.send('serial-port-disconnected');
    });
  }

  async disconnect() {
    if (this.serialPort && this.serialPort.isOpen) {
      return new Promise((resolve) => {
        this.serialPort.close((error) => {
          if (error) console.error('Error closing serial port:', error);
          this.serialPort = null;
          this.serialParser = null;
          resolve();
        });
      });
    }
  }

  async getPortsWithFallback() {
    let ports = [];

    try {
      ports = await SerialPort.list();
    } catch (error) {
      console.log('Serialport not available, using fallback');
    }

    if (ports.length === 0) {
      ports = await this.getPortsAlternative();
    }

    return ports;
  }

  async getPortsAlternative() {
    return new Promise((resolve) => {
      const command = this.getPortDetectionCommand();
      exec(command, (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        resolve(this.parsePortsOutput(stdout));
      });
    });
  }

  getPortDetectionCommand() {
    switch (process.platform) {
      case 'win32':
        return 'wmic path Win32_SerialPort get DeviceID, Name, Description /format:csv';
      case 'darwin':
        return 'ls /dev/cu.* 2>/dev/null | grep -v Bluetooth || echo "No ports found"';
      default:
        return 'ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo "No ports found"';
    }
  }

  parsePortsOutput(output) {
    const ports = [];
    const lines = output.split('\n').filter(line => line.trim());

    if (process.platform === 'win32') {
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const deviceId = parts[1]?.trim();
          if (deviceId?.startsWith('COM')) {
            ports.push({
              path: deviceId,
              manufacturer: parts[2]?.trim() || 'Unknown',
              description: parts[3]?.trim() || ''
            });
          }
        }
      });
    } else {
      lines.forEach(line => {
        if (!line.includes('No ports found')) {
          ports.push({
            path: line.trim(),
            manufacturer: 'Serial Device'
          });
        }
      });
    }

    return ports;
  }

  formatPort(port) {
    let displayName = port.path;

    if (port.manufacturer) {
      displayName += ` (${port.manufacturer})`;
    }

    if (port.manufacturer?.includes('Arduino')) {
      displayName += ' 🔌';
    } else if (port.vendorId && port.productId) {
      const deviceType = this.detectDeviceType(port.vendorId, port.productId);
      if (deviceType) displayName += ` ${deviceType}`;
    }

    return {
      path: port.path,
      manufacturer: port.manufacturer || 'Unknown Manufacturer',
      vendorId: port.vendorId || 'N/A',
      productId: port.productId || 'N/A',
      displayName
    };
  }

  detectDeviceType(vendorId, productId) {
    const deviceMap = {
      '2341': {
        '0043': 'Uno', '0001': 'Uno', '0042': 'Mega', '0044': 'Serial+Keyboard',
        '003b': 'Serial+Keyboard', '0010': 'Mega ADK', '003f': 'Due',
        '800a': 'Leonardo', '800c': 'Micro', '8044': 'Zero'
      },
      '2a03': {
        '0043': 'Uno', '0001': 'Uno', '0042': 'Mega', '0044': 'Serial+Keyboard'
      }
    };

    return deviceMap[vendorId]?.[productId] ? `Arduino ${deviceMap[vendorId][productId]}` : null;
  }

  async checkDriverInstallation() {
    try {
      const ports = await this.getPortsWithFallback();
      const hasCH340Device = ports.some(port =>
        port.manufacturer?.includes('wch.cn') ||
        port.vendorId === '1a86' ||
        port.productId === '7523' ||
        port.manufacturer?.includes('CH340')
      );

      if (hasCH340Device) {
        const problematicPorts = ports.filter(port =>
          (port.manufacturer?.includes('wch.cn') || port.vendorId === '1a86') &&
          !port.manufacturer?.includes('Arduino')
        );

        if (problematicPorts.length > 0) {
          this.app.showNotification('Обнаружено устройство CH340. Установка драйверов...');
          await this.app.boardManager.installDriver('ch340');
        }
      }
    } catch (error) {
      console.error('Driver check failed:', error);
    }
  }
}

module.exports = SerialManager;