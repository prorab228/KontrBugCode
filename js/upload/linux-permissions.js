// linux-permissions.js - скрипт для настройки прав на Linux
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

class LinuxPermissionsHelper {
    static async fixSerialPortPermissions() {
        const username = os.userInfo().username;

        console.log('Fixing serial port permissions for user:', username);

        // Шаг 1: Добавляем пользователя в группу dialout
        try {
            await this.execCommand(`sudo usermod -a -G dialout ${username}`);
            console.log('User added to dialout group');
        } catch (error) {
            console.warn('Failed to add user to dialout group:', error.message);
        }

        // Шаг 2: Создаем udev правила для Arduino устройств
        await this.createUdevRules();

        // Шаг 3: Применяем правила udev
        await this.reloadUdevRules();

        console.log('Permission fix completed. Please restart your computer or log out and log back in.');
    }

    static async createUdevRules() {
        const rulesContent = `# Arduino boards
SUBSYSTEM=="tty", ATTRS{idVendor}=="2341", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2a03", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", MODE="0666", GROUP="dialout"

# ESP8266 and ESP32
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE="0666", GROUP="dialout"
SUBSYSTEM=="tty", ATTRS{idVendor}=="067b", ATTRS{idProduct}=="2303", MODE="0666", GROUP="dialout"
`;

        const rulesPath = '/etc/udev/rules.d/99-arduino.rules';

        try {
            await fs.promises.writeFile('/tmp/99-arduino.rules', rulesContent);
            await this.execCommand(`sudo cp /tmp/99-arduino.rules ${rulesPath}`);
            await this.execCommand(`sudo chmod 644 ${rulesPath}`);
            console.log('Udev rules created successfully');
        } catch (error) {
            console.warn('Failed to create udev rules:', error.message);
        }
    }

    static async reloadUdevRules() {
        try {
            await this.execCommand('sudo udevadm control --reload-rules');
            await this.execCommand('sudo udevadm trigger');
            console.log('Udev rules reloaded');
        } catch (error) {
            console.warn('Failed to reload udev rules:', error.message);
        }
    }

    static execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed: ${error.message}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

        // В renderer.js добавляем кнопку для Linux
    window.addEventListener('DOMContentLoaded', () => {
        // ... существующий код ...

        // Добавляем кнопку исправления прав для Linux
        if (navigator.platform.toLowerCase().includes('linux')) {
            setTimeout(() => {
                this.addLinuxPermissionButton();
            }, 2000);
        }
    });

    addLinuxPermissionButton() {
        const serialControls = document.querySelector('.serial-controls');
        if (!serialControls) return;

        const linuxButton = document.createElement('button');
        linuxButton.className = 'btn btn-warning btn-icon';
        linuxButton.innerHTML = '<span class="icon btn-settings"></span> Исправить права (Linux)';
        linuxButton.onclick = () => this.fixLinuxPermissions();
        linuxButton.style.marginLeft = '10px';
        linuxButton.title = 'Исправить права доступа к последовательным портам на Linux';

        serialControls.appendChild(linuxButton);
    }
}




async fixLinuxPermissions() {
    if (!window.ipcRenderer) return;

    const confirmed = confirm(
        'Эта функция попытается исправить права доступа к последовательным портам на Linux.\n\n' +
        'Будет выполнено:\n' +
        '1. Добавление текущего пользователя в группу dialout\n' +
        '2. Создание правил udev для Arduino устройств\n' +
        '3. Перезагрузка правил udev\n\n' +
        'После этого потребуется перезапустить приложение или перелогиниться в системе.\n\n' +
        'Продолжить?'
    );

    if (!confirmed) return;

    try {
        window.UIManager.setStatus('Исправление прав доступа...');
        window.UIManager.updateLogOutput('Исправление прав доступа к портам на Linux...\n');

        const result = await window.ipcRenderer.invoke('fix-linux-permissions');

        if (result.success) {
            window.UIManager.updateLogOutput(result.message + '\n\nПерезапустите приложение для применения изменений.');
            window.UIManager.showNotification('Права исправлены. Перезапустите приложение.');
        } else {
            window.UIManager.updateLogOutput(`Ошибка: ${result.message}`);
            window.UIManager.showNotification('Ошибка исправления прав', true);
        }
    } catch (error) {
        window.UIManager.updateLogOutput(`Ошибка: ${error.message}`);
        window.UIManager.showNotification('Ошибка исправления прав', true);
    } finally {
        window.UIManager.setStatus('Готов к работе');
    }
}

module.exports = LinuxPermissionsHelper;