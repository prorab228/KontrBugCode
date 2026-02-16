class VoltagePropagator {
    constructor(simulator) {
        this.simulator = simulator;
        this.nodes = new Map(); // Узлы цепи
        this.branches = []; // Ветви цепи
        this.simulationTime = 0;
        this.timeStep = 0.01; // 10ms шаг симуляции
    }

    // Основной метод симуляции
    simulate(deltaTime) {
        this.simulationTime += deltaTime;

        // 1. Строим граф цепи
        this.buildCircuitGraph();

        // 2. Рассчитываем узлы
        this.calculateNodeVoltages();

        // 3. Рассчитываем токи ветвей
        this.calculateBranchCurrents();

        // 4. Обновляем компоненты
        this.updateComponents();

        // 5. Проверяем условия
        this.checkConditions();
    }

    // Построение графа цепи
    buildCircuitGraph() {
        this.nodes.clear();
        this.branches = [];

        // Собираем все уникальные точки соединения
        const nodePoints = new Map(); // key: "x,y" -> node

        // Проходим по всем компонентам
        this.simulator.components.forEach(component => {
            component.terminals.forEach(terminal => {
                if (terminal.connected) {
                    const key = `${Math.round(terminal.x)},${Math.round(terminal.y)}`;

                    if (!nodePoints.has(key)) {
                        const node = {
                            id: `node_${nodePoints.size}`,
                            x: terminal.x,
                            y: terminal.y,
                            components: [],
                            terminals: [],
                            voltage: 0,
                            isGround: false
                        };
                        nodePoints.set(key, node);
                    }

                    const node = nodePoints.get(key);
                    node.components.push(component);
                    node.terminals.push(terminal);

                    // Проверяем, является ли узел землей
                    if (terminal.type === 'ground' ||
                        (component.type === 'powersupply' && terminal.name === 'COM') ||
                        (component.type === 'battery' && terminal.name === '-')) {
                        node.isGround = true;
                        node.voltage = 0;
                    }
                }
            });
        });

        // Добавляем узлы в общий список
        nodePoints.forEach(node => {
            this.nodes.set(node.id, node);
        });

        // Строим ветви (провода)
        this.simulator.wires.forEach(wire => {
            if (wire.startTerminal && wire.endTerminal) {
                const startKey = `${Math.round(wire.startTerminal.x)},${Math.round(wire.startTerminal.y)}`;
                const endKey = `${Math.round(wire.endTerminal.x)},${Math.round(wire.endTerminal.y)}`;

                const startNode = this.findNodeByPoint(wire.startTerminal.x, wire.startTerminal.y);
                const endNode = this.findNodeByPoint(wire.endTerminal.x, wire.endTerminal.y);

                if (startNode && endNode) {
                    const branch = {
                        id: wire.id,
                        startNode,
                        endNode,
                        wire,
                        resistance: wire.resistance,
                        current: 0,
                        voltage: 0
                    };
                    this.branches.push(branch);

                    // Добавляем ветвь к узлам
                    startNode.branches = startNode.branches || [];
                    endNode.branches = endNode.branches || [];
                    startNode.branches.push(branch);
                    endNode.branches.push(branch);
                }
            }
        });

        // Добавляем компоненты как ветви
        this.simulator.components.forEach(component => {
            if (component.terminals.length >= 2 && component.terminals[0].connected && component.terminals[1].connected) {
                const term1 = component.terminals[0];
                const term2 = component.terminals[1];

                const node1 = this.findNodeByPoint(term1.x, term1.y);
                const node2 = this.findNodeByPoint(term2.x, term2.y);

                if (node1 && node2) {
                    const branch = {
                        id: component.id,
                        startNode: node1,
                        endNode: node2,
                        component,
                        resistance: component.getImpedance(component.frequency),
                        current: 0,
                        voltage: 0
                    };
                    this.branches.push(branch);

                    node1.branches = node1.branches || [];
                    node2.branches = node2.branches || [];
                    node1.branches.push(branch);
                    node2.branches.push(branch);
                }
            }
        });
    }

    // Поиск узла по координатам
    findNodeByPoint(x, y) {
        const tolerance = 5;
        for (const node of this.nodes.values()) {
            const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
            if (distance < tolerance) {
                return node;
            }
        }
        return null;
    }

    // Расчет напряжений в узлах
    calculateNodeVoltages() {
        // Находим все источники напряжения
        const voltageSources = this.simulator.components.filter(comp =>
            comp.isVoltageSource && comp.isVoltageSource()
        );

        // Находим землю
        const groundNodes = Array.from(this.nodes.values()).filter(node => node.isGround);

        // Устанавливаем землю
        groundNodes.forEach(node => {
            node.voltage = 0;
        });

        // Устанавливаем напряжения от источников
        voltageSources.forEach(source => {
            source.terminals.forEach(terminal => {
                if (terminal.connected) {
                    const node = this.findNodeByPoint(terminal.x, terminal.y);
                    if (node) {
                        // Получаем напряжение с учетом AC/DC и времени
                        const voltage = source.getTerminalVoltage(terminal.name, this.simulationTime);
                        node.voltage = voltage;

                        // Помечаем узел как источник
                        node.isSource = true;
                        node.sourceComponent = source;
                    }
                }
            });
        });

        // Распространяем напряжения по проводам (идеальные провода)
        let changed = true;
        while (changed) {
            changed = false;

            for (const branch of this.branches) {
                if (branch.wire) { // Это провод
                    if (branch.startNode.voltage !== undefined && branch.endNode.voltage === undefined) {
                        branch.endNode.voltage = branch.startNode.voltage;
                        changed = true;
                    } else if (branch.endNode.voltage !== undefined && branch.startNode.voltage === undefined) {
                        branch.startNode.voltage = branch.endNode.voltage;
                        changed = true;
                    }
                }
            }
        }

        // Для оставшихся узлов применяем метод узловых потенциалов
        const unknownNodes = Array.from(this.nodes.values()).filter(node =>
            node.voltage === undefined && !node.isGround
        );

        if (unknownNodes.length > 0) {
            this.solveNodeVoltages(unknownNodes);
        }
    }

    // Решение системы уравнений для узлов
    solveNodeVoltages(unknownNodes) {
        // Упрощенный метод: для каждого узла применяем закон Кирхгофа
        unknownNodes.forEach(node => {
            let totalCurrentIn = 0;
            let totalConductance = 0;

            node.branches?.forEach(branch => {
                const otherNode = branch.startNode === node ? branch.endNode : branch.startNode;
                const resistance = branch.resistance || 1;
                const conductance = 1 / resistance;

                if (otherNode.voltage !== undefined) {
                    totalCurrentIn += conductance * otherNode.voltage;
                    totalConductance += conductance;
                }
            });

            if (totalConductance > 0) {
                node.voltage = totalCurrentIn / totalConductance;
            } else {
                node.voltage = 0;
            }
        });
    }

    // Расчет токов в ветвях
    calculateBranchCurrents() {
        this.branches.forEach(branch => {
            const voltageDiff = Math.abs(branch.startNode.voltage - branch.endNode.voltage);

            if (branch.resistance > 0) {
                branch.current = voltageDiff / branch.resistance;
                branch.voltage = voltageDiff;

                // Обновляем компонент или провод
                if (branch.component) {
                    branch.component.current = branch.current;
                    branch.component.voltage = branch.voltage;
                } else if (branch.wire) {
                    branch.wire.current = branch.current;
                    branch.wire.voltage = branch.voltage;

                    // Проверка на перегрев провода
                    if (branch.current > 1) {
                        branch.wire.overheat = true;
                    }
                }
            }
        });
    }

    // Обновление компонентов
    updateComponents() {
        this.simulator.components.forEach(component => {
            // Обновляем напряжения на терминалах
            component.terminals.forEach(terminal => {
                if (terminal.connected) {
                    const node = this.findNodeByPoint(terminal.x, terminal.y);
                    if (node) {
                        terminal.voltage = node.voltage || 0;
                    }
                }
            });

            // Вызываем обновление компонента
            if (component.updateFromInputs) {
                component.updateFromInputs(this.timeStep);
            }

            // Для цифровых компонентов
            if (component.isDigitalComponent && component.updateDigital) {
                component.updateDigital();
            }

            // Для источников сигналов
            if (component.isSignalSource && component.updateSignal) {
                component.updateSignal(this.simulationTime);
            }
        });
    }

    // Проверка условий
    checkConditions() {
        // Проверка на короткое замыкание
        let shortCircuit = false;

        this.branches.forEach(branch => {
            if (branch.current > 10) { // Ток > 10A - короткое замыкание
                shortCircuit = true;
                if (branch.component) {
                    branch.component.overheat = true;
                    branch.component.broken = true;
                }
            }
        });

        // Проверка на перегрев
        this.simulator.components.forEach(component => {
            if (component.power > component.getMaxPower()) {
                component.overheat = true;
            }
        });

        return { shortCircuit };
    }

    // Сброс симуляции
    reset() {
        this.simulationTime = 0;
        this.nodes.clear();
        this.branches = [];

        this.simulator.components.forEach(component => {
            component.reset();
        });

        this.simulator.wires.forEach(wire => {
            wire.current = 0;
            wire.voltage = 0;
            wire.overheat = false;
        });
    }

    // Получение статистики цепи
    getCircuitStats() {
        let totalPower = 0;
        let maxCurrent = 0;
        let maxVoltage = 0;

        this.simulator.components.forEach(component => {
            totalPower += component.power;
            maxCurrent = Math.max(maxCurrent, Math.abs(component.current));
            maxVoltage = Math.max(maxVoltage, Math.abs(component.voltage));
        });

        return {
            totalPower: totalPower.toFixed(3),
            maxCurrent: maxCurrent.toFixed(3),
            maxVoltage: maxVoltage.toFixed(3),
            nodeCount: this.nodes.size,
            branchCount: this.branches.length,
            isAC: this.simulator.components.some(comp => comp.isAC),
            frequency: this.getDominantFrequency()
        };
    }

    // Получение доминирующей частоты
    getDominantFrequency() {
        const frequencies = new Map();

        this.simulator.components.forEach(component => {
            if (component.frequency > 0) {
                frequencies.set(component.frequency, (frequencies.get(component.frequency) || 0) + 1);
            }
        });

        let maxFreq = 0;
        let maxCount = 0;

        frequencies.forEach((count, freq) => {
            if (count > maxCount) {
                maxCount = count;
                maxFreq = freq;
            }
        });

        return maxFreq;
    }
}