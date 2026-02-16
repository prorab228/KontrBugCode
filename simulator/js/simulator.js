class CircuitSimulator {
    constructor() {
        this.canvas = document.getElementById('simulatorCanvas');
        this.ctx = this.canvas.getContext('2d');
       // this.hud = new HUD(this);
        // Основные коллекции
        this.components = [];
        this.wires = [];
        this.nodes = [];

        // Выбранные объекты
        this.selectedComponent = null;
        this.draggingComponent = null;
        this.dragOffset = { x: 0, y: 0 };

        // Состояние симуляции
        this.isRunning = false;
        this.simulationSpeed = 1.0;

        // Масштабирование и панорамирование
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;

        // Рисование проводов
        this.isDrawingWire = false;
        this.wireStart = null;
        this.temporaryWire = null;

        // Временные переменные
        this.lastTime = 0;
        this.fps = 60;

        // Анализатор цепей
        this.circuitAnalyzer = new CircuitAnalyzer(this);

        // Инициализация
        this.initCanvas();
        this.initComponents();
        this.initEventListeners();
        this.initUI();
        this.animationFrame();
    }




    initCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Добавляем сетку
       // this.grid = new Grid(20);
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    initComponents() {
        this.componentPalette = new ComponentPalette();
        this.componentPalette.populate(document.getElementById('componentPalette'));
        this.propertyPanel = new PropertyPanel(); // Исправлено: создаем PropertyPanel
    }

    initEventListeners() {
        // Масштабирование колесиком
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Клики по канвасу
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

        // Управление симуляцией
        document.getElementById('runBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());

        // Скорость симуляции
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', (e) => {
            this.simulationSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.simulationSpeed.toFixed(1) + 'x';
        });

        // Горячие клавиши
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Обновление позиции мыши
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.offsetX) / this.scale;
            const y = (e.clientY - rect.top - this.offsetY) / this.scale;
            document.getElementById('mousePosition').textContent =
                `x: ${Math.round(x)}, y: ${Math.round(y)}`;
        });
    }

    initUI() {
        // Убираем кнопки инструментов (скрываем или удаляем)
        const toolGroup = document.querySelector('.tool-group');
        if (toolGroup) toolGroup.style.display = 'none';

        this.updateStats();
    }

    handleWheel(e) {
        e.preventDefault();

        const zoomFactor = 0.1;
        const oldScale = this.scale;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Координаты мыши в мировых координатах
        const worldX = (mouseX - this.offsetX) / oldScale;
        const worldY = (mouseY - this.offsetY) / oldScale;

        if (e.deltaY < 0) {
            // Увеличение
            this.scale = Math.min(5, this.scale * (1 + zoomFactor));
        } else {
            // Уменьшение
            this.scale = Math.max(0.1, this.scale * (1 - zoomFactor));
        }

        // Корректируем смещение для сохранения позиции под курсором
        this.offsetX = mouseX - worldX * this.scale;
        this.offsetY = mouseY - worldY * this.scale;
    }

    handleMouseDown(e) {
        const {x, y} = this.screenToWorld(e.clientX, e.clientY);

        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            // Средняя кнопка или Ctrl+ЛКМ - панорамирование
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.panStartOffsetX = this.offsetX;
            this.panStartOffsetY = this.offsetY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        if (e.button === 0) { // ЛКМ
            // ПРОВЕРЯЕМ ПРОВОДА ПЕРВЫМИ
            for (let i = this.wires.length - 1; i >= 0; i--) {
                const wire = this.wires[i];
                if (wire.isPointNear(x, y, 8)) {
                    this.selectWire(wire);
                    return;
                }
            }

            // Ищем терминал (пин) под мышью
            const terminalInfo = this.getTerminalAt(x, y);

            if (terminalInfo) {
                // Начинаем рисовать провод от терминала
                this.startDrawingWire(terminalInfo);
                return;
            }

            // Ищем компонент под мышью
            for (let i = this.components.length - 1; i >= 0; i--) {
                const component = this.components[i];
                if (component.isPointInside(x, y)) {
                    this.selectComponent(component);
                    this.draggingComponent = component;
                    this.dragOffset = {
                        x: x - component.x,
                        y: y - component.y
                    };
                    return;
                }
            }

            // Клик по пустому месту - снимаем выделение
            this.deselectAll();
        }
    }


    handleMouseMove(e) {
        const {x, y} = this.screenToWorld(e.clientX, e.clientY);

        if (this.isPanning) {
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;
            this.offsetX = this.panStartOffsetX + dx;
            this.offsetY = this.panStartOffsetY + dy;
            return;
        }

        // Обновляем временный провод при рисовании
        if (this.isDrawingWire && this.temporaryWire) {
            this.temporaryWire.end = { x, y };

            // Проверяем, навели ли на другой терминал
            const terminalInfo = this.getTerminalAt(x, y);
            if (terminalInfo && terminalInfo !== this.wireStart) {
                // Меняем цвет временного провода, если навели на терминал
                this.temporaryWire.color = '#00ff00';
            } else {
                this.temporaryWire.color = '#ff0000';
            }
        }

        if (this.draggingComponent) {
            // Перемещаем компонент
            const newX = x - this.dragOffset.x;
            const newY = y - this.dragOffset.y;

            // Используем setPosition для обновления позиций терминалов
            if (this.draggingComponent.setPosition) {
                this.draggingComponent.setPosition(newX, newY);
            } else {
                this.draggingComponent.x = newX;
                this.draggingComponent.y = newY;
                if (this.draggingComponent.updateTerminalPositions) {
                    this.draggingComponent.updateTerminalPositions();
                }
            }

            // Обновляем провода, подключенные к компоненту
            this.updateConnectedWires(this.draggingComponent);
        }
    }

    handleMouseUp(e) {
        const {x, y} = this.screenToWorld(e.clientX, e.clientY);

        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
            return;
        }

        if (e.button === 0) {
            if (this.isDrawingWire) {
                // Завершаем рисование провода
                this.finishDrawingWire(x, y);
            }

            this.draggingComponent = null;
        }
    }

    handleMouseLeave() {
        this.isPanning = false;
        this.canvas.style.cursor = 'default';
    }

    handleKeyDown(e) {
        switch(e.key.toLowerCase()) {
            case 'delete':
                if (this.selectedComponent) {
                    this.deleteSelected();
                }
                break;
            case 'escape':
                this.cancelDrawingWire();
                this.deselectAll();
                break;
            case ' ': // Пробел - пауза/запуск
                e.preventDefault();
                if (this.isRunning) this.pause();
                else this.start();
                break;
            case '+':
                this.scale = Math.min(5, this.scale * 1.1);
                break;
            case '-':
                this.scale = Math.max(0.1, this.scale * 0.9);
                break;
            case '0':
                this.scale = 1.0;
                this.offsetX = 0;
                this.offsetY = 0;
                break;
            case 'r': // Вращение компонента
                e.preventDefault();
                if (this.selectedComponent && this.selectedComponent.rotate) {
                    const angle = e.shiftKey ? -45 : 45; // Shift+R для вращения против часовой
                    this.selectedComponent.rotate(angle);
                    console.log(`Вращение ${this.selectedComponent.name} на ${angle}°`);
                }
                break;
        }
    }

    // Преобразование экранных координат в мировые
    screenToWorld(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;

        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale
        };
    }

    // Преобразование мировых координат в экранные
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.scale + this.offsetX,
            y: worldY * this.scale + this.offsetY
        };
    }

    // Получение терминала по координатам (улучшенная версия)
    getTerminalAt(x, y, tolerance = 15) {
        for (const component of this.components) {
            // Обновляем позиции терминалов перед поиском
            if (component.updateTerminalPositions) {
                component.updateTerminalPositions();
            }

            // Ищем терминал в компоненте
            const terminal = component.getTerminalAt(x, y, tolerance);
            if (terminal) {
                return {
                    component,
                    terminal,
                    x: terminal.x,
                    y: terminal.y
                };
            }
        }
        return null;
    }

    // Начало рисования провода
    startDrawingWire(terminalInfo) {
        this.isDrawingWire = true;
        this.wireStart = terminalInfo;
        this.canvas.style.cursor = 'crosshair';

        this.temporaryWire = {
            start: { x: terminalInfo.x, y: terminalInfo.y },
            end: { x: terminalInfo.x, y: terminalInfo.y },
            color: '#00ff00'
        };
    }

    // Рисование временного провода
    drawTemporaryWire(ctx) {
        if (!this.temporaryWire) return;

        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        // Рисуем провод с изгибом
        const startX = this.temporaryWire.start.x;
        const startY = this.temporaryWire.start.y;
        const endX = this.temporaryWire.end.x;
        const endY = this.temporaryWire.end.y;

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) {
            // Кривая Безье для длинных проводов
            const cp1x = startX + dx * 0.5;
            const cp1y = startY - dy * 0.3;
            const cp2x = startX + dx * 0.5;
            const cp2y = startY + dy * 1.3;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        } else {
            // Прямая линия для коротких
            ctx.lineTo(endX, endY);
        }

        ctx.strokeStyle = this.temporaryWire.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Кружок в начале
        ctx.beginPath();
        ctx.arc(startX, startY, 6, 0, Math.PI * 2);
        ctx.fillStyle = this.temporaryWire.color;
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Кружок в конце (текущая позиция)
        ctx.beginPath();
        ctx.arc(endX, endY, 6, 0, Math.PI * 2);
        ctx.fillStyle = this.temporaryWire.color;
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // Завершение рисования провода
    finishDrawingWire(x, y) {
        if (!this.isDrawingWire || !this.wireStart) return;

        // Ищем терминал в точке окончания
        const endTerminalInfo = this.getTerminalAt(x, y);

        if (endTerminalInfo && endTerminalInfo.component !== this.wireStart.component) {
            // Проверяем, не соединены ли уже эти терминалы
            const existingWire = this.wires.find(wire =>
                (wire.startComponent === this.wireStart.component &&
                 wire.startTerminal === this.wireStart.terminal &&
                 wire.endComponent === endTerminalInfo.component &&
                 wire.endTerminal === endTerminalInfo.terminal) ||
                (wire.startComponent === endTerminalInfo.component &&
                 wire.startTerminal === endTerminalInfo.terminal &&
                 wire.endComponent === this.wireStart.component &&
                 wire.endTerminal === this.wireStart.terminal)
            );

            if (!existingWire) {
                // Создаем провод между терминалами
                const wire = new Wire(
                    this.wireStart.component,
                    this.wireStart.terminal,
                    endTerminalInfo.component,
                    endTerminalInfo.terminal
                );

                this.addWire(wire);
            } else {
                console.log('Провод уже существует между этими терминалами');
            }
        } else {
            console.log('Не удалось создать провод. Проверьте соединение терминалов');
        }

        this.cancelDrawingWire();
    }

    // Отмена рисования провода
    cancelDrawingWire() {
        this.isDrawingWire = false;
        this.wireStart = null;
        this.temporaryWire = null;
        this.canvas.style.cursor = 'default';
    }

     // Обновление подключенных проводов
    updateConnectedWires(component) {
        this.wires.forEach(wire => {
            if (wire.startComponent === component || wire.endComponent === component) {
                // Обновляем терминалы в проводе
                wire.updateTerminalPosition(wire.startTerminal);
                wire.updateTerminalPosition(wire.endTerminal);
            }
        });
    }

    updateComponentTerminals(component) {
        // Обновляем позиции терминалов компонента
        component.terminals.forEach(terminal => {
            // Простая логика для демо: 2 терминала слева и справа
            if (terminal.name === 'anode' || terminal.name === 'V+') {
                terminal.x = component.x;
                terminal.y = component.y + component.height / 2;
            } else if (terminal.name === 'cathode' || terminal.name === 'GND') {
                terminal.x = component.x + component.width;
                terminal.y = component.y + component.height / 2;
            } else if (terminal.name === 'SIG') {
                terminal.x = component.x + component.width;
                terminal.y = component.y + component.height / 2;
            }
        });
    }



    addComponent(component) {
        this.components.push(component);
        this.updateStats();
    }

    addWire(wire) {
        this.wires.push(wire);
        this.updateStats();
    }

    selectWire(wire) {
            this.selectComponent(wire); // Унифицированный метод
        }

    selectComponent(component) {
        if (this.selectedComponent) {
            if (this.selectedComponent instanceof Wire) {
                this.selectedComponent.isSelected = false;
            } else {
                this.selectedComponent.selected = false;
            }
        }
        this.selectedComponent = component;

        if (component instanceof Wire) {
            component.isSelected = true;
        } else {
            component.selected = true;
        }

        // Исправлено: используем showObject вместо showComponent
        if (this.propertyPanel && this.propertyPanel.showObject) {
            this.propertyPanel.showObject(component);
        }
    }

    deselectAll() {
        if (this.selectedComponent) {
            if (this.selectedComponent instanceof Wire) {
                this.selectedComponent.isSelected = false;
            } else {
                this.selectedComponent.selected = false;
            }
            this.selectedComponent = null;
        }
        this.propertyPanel.clear();
    }

    deleteSelected() {
        if (!this.selectedComponent) return;

        if (this.selectedComponent instanceof Wire) {
            const index = this.wires.indexOf(this.selectedComponent);
            if (index > -1) {
                this.selectedComponent.disconnect();
                this.wires.splice(index, 1);
            }
        } else {
            // Удаляем компонент
            const component = this.selectedComponent;

            // Удаляем провода, подключенные к компоненту
            this.wires = this.wires.filter(wire => {
                if (wire.isConnectedTo(component)) {
                    wire.disconnect();
                    return false;
                }
                return true;
            });

            // Удаляем компонент
            const index = this.components.indexOf(component);
            if (index > -1) {
                this.components.splice(index, 1);
            }
        }

        this.selectedComponent = null;

        // Исправлено: используем clear вместо старого метода
        if (this.propertyPanel && this.propertyPanel.clear) {
            this.propertyPanel.clear();
        }

        this.updateStats();
    }


    start() {
        this.isRunning = true;
        document.getElementById('simulationStatus').textContent = 'Запущено';
        document.getElementById('runBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    }

    pause() {
        this.isRunning = false;
        document.getElementById('simulationStatus').textContent = 'На паузе';
        document.getElementById('runBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }

    reset() {
        this.components.forEach(component => component.reset());
        this.wires.forEach(wire => {
            wire.current = 0;
            wire.voltage = 0;
        });
        this.pause();
    }

    clear() {
        if (confirm('Очистить всю схему?')) {
            this.components = [];
            this.wires = [];
            this.selectedComponent = null;
            this.propertyPanel.clear();
            this.updateStats();
        }
    }

    updateStats() {
        document.getElementById('componentCount').textContent = this.components.length;
        document.getElementById('wireCount').textContent = this.wires.length;

        // Обновляем FPS
        const now = performance.now();
        if (this.lastTime) {
            this.fps = Math.round(1000 / (now - this.lastTime));
        }
        this.lastTime = now;
    }

      // Основной цикл симуляции
    updateSimulation(deltaTime) {
        if (!this.isRunning) return;

        const scaledDelta = deltaTime * this.simulationSpeed;

        // 1. Обновляем все компоненты
        this.components.forEach(component => {
            if (component.update) {
                component.update(scaledDelta);
            }
        });

        // 2. Анализируем и рассчитываем цепь
        this.circuitAnalyzer.solveCircuit();

        // 3. Проверяем состояние цепи
        this.checkCircuitStatus();

        // 4. Обновляем статистику
        this.updateStats();
    }

//     // Упрощаем CircuitSolver
//    calculateCircuit() {
//        // Теперь эту работу выполняет VoltagePropagator
//        this.voltagePropagator.propagateVoltages();
//        this.checkCircuitStatus();
//    }



    // Проверка состояния цепи
    checkCircuitStatus() {
        let hasProblem = false;
        let hasShortCircuit = false;
        let totalPower = 0;

        this.components.forEach(comp => {
            if (comp.overheat) hasProblem = true;
            if (comp.current > comp.getMaxCurrent?.() * 2) hasShortCircuit = true;
            totalPower += comp.power || 0;
        });

        const statusElement = document.getElementById('circuitStatus');
        if (hasShortCircuit) {
            statusElement.textContent = '⚠️ Короткое замыкание!';
            statusElement.className = 'status-error';
        } else if (hasProblem) {
            statusElement.textContent = '⚠️ Проблема в цепи';
            statusElement.className = 'status-warning';
        } else {
            statusElement.textContent = `✅ Цепь исправна (${totalPower.toFixed(2)}W)`;
            statusElement.className = 'status-ok';
        }
    }



    getConnectedComponents(startComponent) {
        const visited = new Set();
        const result = [];

        const dfs = (component) => {
            if (visited.has(component.id)) return;
            visited.add(component.id);
            result.push(component);

            // Ищем компоненты, подключенные через провода
            this.wires.forEach(wire => {
                if (wire.startComponent === component) {
                    dfs(wire.endComponent);
                }
                if (wire.endComponent === component) {
                    dfs(wire.startComponent);
                }
            });
        };

        dfs(startComponent);
        return result;
    }

    updateWiresCurrent(components, current) {
        // Обновляем ток в проводах, соединяющих эти компоненты
        this.wires.forEach(wire => {
            if (components.includes(wire.startComponent) &&
                components.includes(wire.endComponent)) {
                wire.current = current;
            }
        });
    }

    checkShortCircuit() {
        let hasShort = false;

        this.components.forEach(comp => {
            if (comp.overheat) hasShort = true;
        });

        const statusElement = document.getElementById('circuitStatus');
        if (hasShort) {
            statusElement.textContent = '⚠️ Короткое замыкание!';
            statusElement.className = 'status-error';
        } else {
            statusElement.textContent = '✅ Цепь исправна';
            statusElement.className = 'status-ok';
        }
    }

    animationFrame = (timestamp) => {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.updateSimulation(deltaTime);
        this.draw();

        requestAnimationFrame(this.animationFrame);
    }

    draw() {
        // Очищаем канвас
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Сохраняем контекст для трансформаций
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Рисуем сетку
        this.drawGrid();

        // Рисуем провода
        this.wires.forEach(wire => {
            wire.draw(this.ctx);
        });

        // Рисуем компоненты
        this.components.forEach(component => {
            component.draw(this.ctx);
        });

        this.ctx.restore();

        // Рисуем временный провод поверх всего
        if (this.temporaryWire) {
            this.drawTemporaryWire(this.ctx);
        }

        // Рисуем выделение
        if (this.selectedComponent) {
            this.ctx.save();
            this.ctx.translate(this.offsetX, this.offsetY);
            this.ctx.scale(this.scale, this.scale);

            if (this.selectedComponent.drawSelection) {
                this.selectedComponent.drawSelection(this.ctx);
            }

            this.ctx.restore();
        }

        // Рисуем HUD
        this.drawHUD();
    }



    drawGrid() {
        const gridSize = 20 * this.scale;
        const startX = -this.offsetX % gridSize;
        const startY = -this.offsetY % gridSize;

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;

        // Вертикальные линии
        for (let x = startX; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Горизонтальные линии
        for (let y = startY; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Основные линии (каждые 5)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        const majorGridSize = gridSize * 5;
        const majorStartX = -this.offsetX % majorGridSize;
        const majorStartY = -this.offsetY % majorGridSize;

        for (let x = majorStartX; x < this.canvas.width; x += majorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = majorStartY; y < this.canvas.height; y += majorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawHUD() {
        // Информация о симуляции
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 90);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Симуляция: ${this.isRunning ? 'Запущена' : 'Остановлена'}`, 20, 30);
        this.ctx.fillText(`Компонентов: ${this.components.length}`, 20, 50);
        this.ctx.fillText(`Проводов: ${this.wires.length}`, 20, 70);
        this.ctx.fillText(`FPS: ${Math.round(this.fps)}`, 20, 90);

        // Информация о выбранном компоненте
        if (this.selectedComponent) {
            const yStart = 120;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, yStart, 200, 80);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(`Выбран: ${this.selectedComponent.name}`, 20, yStart + 20);

            if (this.selectedComponent.voltage !== undefined) {
                this.ctx.fillText(`Напряжение: ${this.selectedComponent.voltage.toFixed(2)}V`, 20, yStart + 40);
            }

            if (this.selectedComponent.current !== undefined) {
                this.ctx.fillText(`Ток: ${(this.selectedComponent.current * 1000).toFixed(1)}mA`, 20, yStart + 60);
            }
        }

        this.ctx.restore();
    }

}

// Класс для сетки
class Grid {
    constructor(size = 20) {
        this.size = size;
        this.color = 'rgba(0, 0, 0, 0.1)';
        this.majorColor = 'rgba(0, 0, 0, 0.2)';
    }

    draw(ctx, canvas, offsetX, offsetY, scale) {
        const gridSize = this.size * scale;
        const startX = -offsetX % gridSize;
        const startY = -offsetY % gridSize;

        // Мелкая сетка
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;

        // Вертикальные линии
        for (let x = startX; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Горизонтальные линии
        for (let y = startY; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Крупная сетка (каждые 5 линий)
        const majorGridSize = gridSize * 5;
        const majorStartX = -offsetX % majorGridSize;
        const majorStartY = -offsetY % majorGridSize;

        ctx.strokeStyle = this.majorColor;
        ctx.lineWidth = 1;

        for (let x = majorStartX; x < canvas.width; x += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = majorStartY; y < canvas.height; y += majorGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
}

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    window.simulator = new CircuitSimulator();
    console.log('Симулятор загружен!');
});