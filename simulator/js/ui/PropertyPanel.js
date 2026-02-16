class PropertyPanel {
    constructor() {
        this.container = document.getElementById('propertyContent');
        this.currentObject = null;
        this.propertyControls = new Map();
    }

    showObject(object) {
        this.currentObject = object;
        this.render();
    }

    clear() {
        this.currentObject = null;
        this.container.innerHTML = '<p class="placeholder">Выберите компонент или провод</p>';
        this.propertyControls.clear();
    }

    render() {
        if (!this.currentObject) {
            this.clear();
            return;
        }

        let html = '';
        const title = this.currentObject.name || 'Объект';
        const type = this.getObjectType(this.currentObject);

        // Заголовок
        html += `
            <div class="property-header">
                <h4>${title}</h4>
                <span class="property-type">${type}</span>
            </div>
            <div class="property-list">
        `;

        // Основные свойства (read-only)
        const basicProps = this.currentObject.getProperties ?
            this.currentObject.getProperties() : this.getDefaultProperties(this.currentObject);

        for (const [key, value] of Object.entries(basicProps)) {
            html += this.createPropertyRow(key, value);
        }

        // Редактируемые свойства
        if (this.currentObject.getEditableProperties) {
            const editableProps = this.currentObject.getEditableProperties();
            html += this.createEditableControls(editableProps);
        }

        // Специальные элементы управления
        html += this.createSpecialControls();

        html += '</div>';
        this.container.innerHTML = html;

        // Инициализируем элементы управления
        this.initializeControls();
    }

    getObjectType(obj) {
        if (obj instanceof Wire) return 'Провод';
        if (obj instanceof BaseComponent) {
            switch(obj.type) {
                case 'powersupply': return 'Источник питания';
                case 'battery': return 'Батарея';
                case 'arduino': return 'Arduino';
                case 'led': return 'Светодиод';
                case 'resistor': return 'Резистор';
                case 'motor': return 'Мотор';
                case 'servo': return 'Сервопривод';
                case 'buzzer': return 'Зуммер';
                case 'switch': return 'Выключатель';
                default: return 'Компонент';
            }
        }
        return 'Объект';
    }

    createPropertyRow(key, value) {
        let valueClass = 'property-value';

        if (typeof value === 'string') {
            if (value.includes('🟢') || value.includes('✅')) valueClass += ' success';
            else if (value.includes('🔴') || value.includes('⚠️')) valueClass += ' error';
            else if (value.includes('🟡')) valueClass += ' warning';
        }

        return `
            <div class="property-row">
                <span class="property-key">${key}:</span>
                <span class="${valueClass}">${value}</span>
            </div>
        `;
    }

    createEditableControls(properties) {
        let html = '<div class="property-editable-section">';

        for (const [propName, config] of Object.entries(properties)) {
            const controlId = `prop_${propName}_${Math.random().toString(36).substr(2, 9)}`;
            this.propertyControls.set(controlId, config);

            html += `<div class="property-control-group">`;
            html += `<label for="${controlId}">${config.label}:</label>`;

            switch(config.type) {
                case 'range':
                    html += this.createRangeControl(controlId, config);
                    break;
                case 'select':
                    html += this.createSelectControl(controlId, config);
                    break;
                case 'checkbox':
                    html += this.createCheckboxControl(controlId, config);
                    break;
                case 'textarea':
                    html += this.createTextareaControl(controlId, config);
                    break;
                case 'color':
                    html += this.createColorControl(controlId, config);
                    break;
                case 'text':
                    html += this.createTextInput(controlId, config);
                    break;
                default:
                    // Для неизвестных типов используем text input
                    html += this.createTextInput(controlId, config);
            }

            if (config.unit) {
                html += `<span class="property-unit">${config.unit}</span>`;
            }

            html += `</div>`;
        }

        html += '</div>';
        return html;
    }

    createRangeControl(id, config) {
        return `
            <div class="property-range-group">
                <input type="range"
                       id="${id}"
                       min="${config.min}"
                       max="${config.max}"
                       step="${config.step || 1}"
                       value="${config.value}"
                       class="property-range">
                <span class="property-range-value">${config.value}${config.unit || ''}</span>
            </div>
        `;
    }

    createSelectControl(id, config) {
        let options = '';
        config.options.forEach(option => {
            let value, label;
            if (typeof option === 'object') {
                value = option.value;
                label = option.label;
            } else {
                value = option;
                label = option;
            }
            const selected = String(value) === String(config.value) ? 'selected' : '';
            options += `<option value="${value}" ${selected}>${label}</option>`;
        });

        return `<select id="${id}" class="property-select">${options}</select>`;
    }

    createCheckboxControl(id, config) {
        const checked = config.value ? 'checked' : '';
        return `<input type="checkbox" id="${id}" class="property-checkbox" ${checked}>`;
    }

    createTextareaControl(id, config) {
        return `
            <textarea id="${id}"
                      class="property-textarea"
                      rows="4"
                      placeholder="${config.placeholder || ''}">${config.value || ''}</textarea>
        `;
    }

    createTextInput(id, config) {
        return `<input type="text" id="${id}" class="property-text-input" value="${config.value || ''}" placeholder="${config.placeholder || ''}">`;
    }

    createColorControl(id, config) {
        return `
            <div class="property-color-group">
                <input type="color"
                       id="${id}"
                       value="${config.value}"
                       class="property-color">
                <span class="property-color-value">${config.value}</span>
            </div>
        `;
    }

    createSpecialControls() {
        let html = '';
        const obj = this.currentObject;

        // Кнопки управления для разных компонентов
        if (obj instanceof PowerSupply) {
            html += this.createPowerSupplyControls();
        } else if (obj instanceof Battery) {
            html += this.createBatteryControls();
        } else if (obj instanceof Switch) {
            html += this.createSwitchControls();
        } else if (obj instanceof Arduino) {
            html += this.createArduinoControls();
        }

        return html;
    }

    createPowerSupplyControls() {
        const ps = this.currentObject;
        return `
            <div class="property-actions">
                <button onclick="window.simulator.selectedComponent.toggle()"
                        class="property-button ${ps.isEnabled ? 'active' : ''}">
                    ${ps.isEnabled ? '🔴 Выключить' : '🟢 Включить'}
                </button>
                <button onclick="window.simulator.selectedComponent.resetProtection()"
                        class="property-button">
                    Сброс защиты
                </button>
            </div>
        `;
    }

    createBatteryControls() {
        return `
            <div class="property-actions">
                <button onclick="window.simulator.selectedComponent.recharge(100)"
                        class="property-button">
                    ⚡ Зарядить
                </button>
            </div>
        `;
    }

    createSwitchControls() {
        return `
            <div class="property-actions">
                <button onclick="window.simulator.selectedComponent.toggle()"
                        class="property-button">
                    🔄 Переключить
                </button>
            </div>
        `;
    }

     createArduinoControls() {
        const arduino = this.currentObject;

        return `
            <div class="property-actions">
                <button onclick="window.simulator.selectedComponent.openCodeEditor()"
                        class="property-button">
                    📝 Открыть редактор кода
                </button>
                <button onclick="window.simulator.selectedComponent.runCode()"
                        class="property-button ${arduino.isRunning ? 'active' : ''}">
                    ${arduino.isRunning ? '⏹️ Остановить' : '▶️ Запустить код'}
                </button>
            </div>
            <div class="property-code-info">
                <div class="property-row">
                    <span class="property-key">Состояние:</span>
                    <span class="property-value ${arduino.isRunning ? 'success' : ''}">
                        ${arduino.isRunning ? '🟢 Выполняется' : '⚫ Остановлен'}
                    </span>
                </div>
                ${arduino.serialOutput.length > 0 ? `
                <div class="property-row">
                    <span class="property-key">Последнее сообщение:</span>
                    <span class="property-value">
                        ${arduino.serialOutput[arduino.serialOutput.length - 1]}
                    </span>
                </div>
                ` : ''}
            </div>
        `;
    }

    initializeControls() {
        // Инициализируем обработчики для редактируемых свойств
        this.propertyControls.forEach((config, controlId) => {
            const element = document.getElementById(controlId);
            if (!element) return;

            const handler = () => {
                let value;
                switch(config.type) {
                    case 'range':
                        value = parseFloat(element.value);
                        if (element.nextElementSibling) {
                            element.nextElementSibling.textContent = `${value}${config.unit || ''}`;
                        }
                        break;
                    case 'select':
                        value = element.value;
                        break;
                    case 'checkbox':
                        value = element.checked;
                        break;
                    case 'textarea':
                    case 'text':
                        value = element.value;
                        break;
                    case 'color':
                        value = element.value;
                        if (element.nextElementSibling) {
                            element.nextElementSibling.textContent = value;
                        }
                        break;
                    default:
                        value = element.value;
                }

                if (config.onChange && typeof config.onChange === 'function') {
                    config.onChange(value);
                }

//                // Обновляем отображение
//                if (window.simulator) {
//                    window.simulator.calculateCircuit();
//                    this.render();
//                }
            };

            element.addEventListener('input', handler);
            element.addEventListener('change', handler);
        });

        // Добавляем глобальные функции для кнопок
        window.runArduinoCode = () => {
            const codeElement = document.getElementById('arduinoCode');
            if (codeElement && this.currentObject instanceof Arduino) {
                const code = codeElement.value;
                this.currentObject.runCode(code);
                this.render(); // Обновляем панель
            }
        };
    }

    getDefaultProperties(obj) {
        const props = {
            'Тип': this.getObjectType(obj),
            'Положение': `(${Math.round(obj.x)}, ${Math.round(obj.y)})`,
            'Напряжение': `${obj.voltage.toFixed(3)}V`,
            'Ток': `${(obj.current * 1000).toFixed(1)}mA`,
            'Мощность': `${obj.power.toFixed(3)}W`,
            'Состояние': obj.overheat ? '🔴 Перегрев' : (obj.broken ? '🔴 Сломан' : '🟢 Норма')
        };

        // Добавляем информацию о напряжениях на терминалах
        if (obj.terminals && obj.terminals.length > 0) {
            obj.terminals.forEach((terminal, index) => {
                props[`Терминал ${terminal.name}`] = `${terminal.voltage?.toFixed(2) || '0.00'}V ${terminal.connected ? '🔗' : '❌'}`;
            });
        }

        return props;
    }
}