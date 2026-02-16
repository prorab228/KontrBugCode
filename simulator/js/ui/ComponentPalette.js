class ComponentPalette {
    constructor() {
        this.categories = {
            'Микроконтроллеры': [
                { type: 'arduino', name: 'Arduino', icon: '🖥️', color: '#2c3e50' }
            ],
            'Источники': [
                { type: 'battery', name: 'Батарея', icon: '🔋', color: '#FF9900' },
                { type: 'ac_source', name: 'Источник AC', icon: '⚡', color: '#FF6600' },
                { type: 'powersupply', name: 'Источник питания', icon: '🔌', color: '#0055aa' },
                { type: 'voltagesource', name: 'Источник питания', icon: '🔌', color: '#0055aa' }
            ],
            'Пассивные': [
                { type: 'resistor', name: 'Резистор', icon: '⏚', color: '#964B00' },
                { type: 'capacitor', name: 'Конденсатор', icon: '⎓', color: '#4169E1' },
                { type: 'inductor', name: 'Катушка', icon: '⎔', color: '#8B4513' },
                { type: 'potentiometer', name: 'Потенциометр', icon: '🎛️', color: '#8B4513' }
            ],
            'Активные': [
                { type: 'led', name: 'Светодиод', icon: '💡', color: '#ff0000' },
                { type: 'motor', name: 'Мотор', icon: '⚙️', color: '#2E8B57' },
                { type: 'GearMotor', name: 'Мотор-редуктор', icon: '⚙️', color: '#2E8B57' },
                { type: 'servo', name: 'Сервопривод', icon: '🎯', color: '#9B59B6' },
                { type: 'L298N', name: 'Драйвер', icon: '🎯', color: '#9B59B6' },
                { type: 'buzzer', name: 'Зуммер', icon: '🔊', color: '#FFD700' },
                { type: 'switch', name: 'Выключатель', icon: '🔘', color: '#666666' }
            ],
            'Переключатели': [
                { type: 'switch', name: 'Выключатель', icon: '🔘', color: '#666666' }
            ]
        };

    }

    populate(container) {
        container.innerHTML = '';

        Object.entries(this.categories).forEach(([categoryName, components]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'component-category';

            const title = document.createElement('h4');
            title.textContent = categoryName;
            categoryDiv.appendChild(title);

            components.forEach(componentDef => {
                const item = document.createElement('div');
                item.className = 'component-item';
                item.draggable = true;
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">${componentDef.icon}</span>
                        <span>${componentDef.name}</span>
                    </div>
                `;

                // Обработка перетаскивания
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('component', JSON.stringify({
                        type: componentDef.type,
                        name: componentDef.name,
                        color: componentDef.color
                    }));
                });

                categoryDiv.appendChild(item);
            });

            container.appendChild(categoryDiv);
        });

        // Обработка сброса на канвас
        const canvas = document.getElementById('simulatorCanvas');
        canvas.addEventListener('dragover', (e) => e.preventDefault());
        canvas.addEventListener('drop', (e) => this.handleDrop(e));
    }

    handleDrop(e) {
        e.preventDefault();

        try {
            const componentData = JSON.parse(e.dataTransfer.getData('component'));
            if (!componentData) return;

            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Создаем новый компонент
            this.createComponent(componentData.type, x, y, componentData);
        } catch (error) {
            console.error('Error creating component:', error);
        }
    }

    createComponent(type, x, y, config = {}) {
        let component;
        
        // Корректируем позицию, чтобы компонент был по центру курсора
        const adjustedX = x - 30;
        const adjustedY = y - 30;

        const baseConfig = {
            x: adjustedX,
            y: adjustedY,
            name: `${config.name || type} ${Math.floor(Math.random() * 100)}`,
            ...config
        };

        switch(type) {
            case 'led':
                component = new LED(baseConfig);
                break;
            case 'arduino':
                component = new Arduino(baseConfig);
                break;
            case 'battery':
                component = new Battery(baseConfig);
                break;
            case 'ac_source':
                component = new ACSource(baseConfig);
                break;
            case 'resistor':
                component = new Resistor(baseConfig);
                break;
            case 'capacitor':
                component = new Capacitor(baseConfig);
                break;
            case 'inductor':
                component = new Inductor(baseConfig);
                break;
            case 'potentiometer':
                component = new Potentiometer(baseConfig);
                break;
            case 'motor':
                component = new Motor(baseConfig);
                break;
            case 'GearMotor':
                component = new GearMotor(baseConfig);
                break;
            case 'servo':
                component = new Servo(baseConfig);
                break;
            case 'L298N':
                component = new L298N(baseConfig);
                break;
            case 'buzzer':
                component = new Buzzer(baseConfig);
                break;
            case 'switch':
                component = new Switch(baseConfig);
                break;
            case 'powersupply':
                component = new PowerSupply(baseConfig);
                break;
            case 'voltagesource':
                component = new VoltageSource(baseConfig);
                break;
            default:
                console.warn(`Unknown component type: ${type}`);
                return;
        }

        // Добавляем в симулятор
        if (window.simulator) {
            window.simulator.addComponent(component);
        }
    }
}