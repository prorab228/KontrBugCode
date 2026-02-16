class HUD {
    constructor(simulator) {
        this.simulator = simulator;
        this.hudElement = document.getElementById('hud');
        this.componentInfoElement = document.getElementById('componentInfo');
        this.initialized = false;

        // Откладываем инициализацию на следующий кадр
        setTimeout(() => this.init(), 0);
    }

    init() {
        if (!this.simulator || !this.hudElement) {
            console.warn('HUD: Simulator or DOM elements not ready');
            setTimeout(() => this.init(), 100);
            return;
        }

        this.hudElement.style.display = 'block';
        this.initialized = true;
        console.log('HUD initialized');
    }

    update() {
        if (!this.initialized || !this.simulator) return;

        try {
            // Обновляем основную информацию
            const statusEl = document.getElementById('hudStatus');
            const componentsEl = document.getElementById('hudComponents');
            const wiresEl = document.getElementById('hudWires');
            const fpsEl = document.getElementById('hudFPS');

            if (statusEl) {
                statusEl.textContent = this.simulator.isRunning ? 'Запущена' : 'Остановлена';
                statusEl.className = this.simulator.isRunning ? 'hud-value running' : 'hud-value stopped';
            }

            if (componentsEl && Array.isArray(this.simulator.components)) {
                componentsEl.textContent = this.simulator.components.length;
            }

            if (wiresEl && Array.isArray(this.simulator.wires)) {
                wiresEl.textContent = this.simulator.wires.length;
            }

            if (fpsEl) {
                fpsEl.textContent = Math.round(this.simulator.fps || 0);
            }

            // Обновляем информацию о выбранном компоненте
            this.updateComponentInfo();
        } catch (error) {
            console.warn('HUD update error:', error);
        }
    }

    updateComponentInfo() {
        if (!this.componentInfoElement || !this.simulator) return;

        try {
            if (this.simulator.selectedComponent) {
                const component = this.simulator.selectedComponent;
                this.componentInfoElement.style.display = 'block';

                const titleEl = document.getElementById('componentInfoTitle');
                const contentEl = document.getElementById('componentInfoContent');

                if (titleEl) titleEl.textContent = component.name;

                if (contentEl && component.getProperties) {
                    const props = component.getProperties();
                    let html = '';

                    for (const [key, value] of Object.entries(props)) {
                        let valueClass = 'info-value';

                        // Определяем классы для разных типов значений
                        if (typeof value === 'string') {
                            if (key.includes('Ток')) valueClass += ' current';
                            else if (key.includes('Напряжение')) valueClass += ' voltage';
                            else if (value.includes('🟢')) valueClass += ' running';
                            else if (value.includes('🔴') || value.includes('🟡')) valueClass += ' warning';
                        }

                        html += `
                            <div class="info-row">
                                <span class="info-key">${key}:</span>
                                <span class="${valueClass}">${value}</span>
                            </div>
                        `;
                    }

                    contentEl.innerHTML = html;
                }
            } else {
                this.componentInfoElement.style.display = 'none';
            }
        } catch (error) {
            console.warn('Component info update error:', error);
            this.componentInfoElement.style.display = 'none';
        }
    }
}