class CircuitSolver {
    constructor(simulator) {
        this.simulator = simulator;
    }

    solve() {
        const { components, wires } = this.simulator;

        console.log('=== РАСЧЕТ ЦЕПИ ===');

        // 1. Сбрасываем все значения
        components.forEach(comp => {
            comp.voltage = 0;
            comp.current = 0;
            comp.power = 0;
            if (comp.type === 'led') comp.isLit = false;
            if (comp.type === 'motor') comp.isRunning = false;
            comp.overheat = false;
        });

        wires.forEach(wire => {
            wire.current = 0;
            wire.voltage = 0;
            wire.overheat = false;
        });

        // 2. Находим все активные источники питания
        const activeSources = components.filter(comp => {
            if (comp.type === 'powersupply') return comp.isEnabled;
            if (comp.type === 'battery') return !comp.broken && comp.currentCapacity > 0;
            if (comp.type === 'arduino') return true;
            return false;
        });

        console.log(`Активных источников: ${activeSources.length}`);

        if (activeSources.length === 0) {
            console.log('Нет активных источников питания');
            return;
        }

        // 3. Для каждого источника находим подключенную цепь
        activeSources.forEach(source => {
            this.solveForSource(source);
        });
    }

    solveForSource(source) {
        // Получаем напряжение источника
        let sourceVoltage = 0;
        if (source.type === 'powersupply') {
            sourceVoltage = source.outputVoltage;
            console.log(`Источник питания ${source.name}: ${sourceVoltage}V, включен: ${source.isEnabled}`);
        } else if (source.type === 'battery') {
            sourceVoltage = source.voltage;
            console.log(`Батарея ${source.name}: ${sourceVoltage}V, заряд: ${source.currentCapacity}/${source.capacity}`);
        } else if (source.type === 'arduino') {
            sourceVoltage = 5;
            console.log(`Arduino ${source.name}: ${sourceVoltage}V`);
        }

        if (sourceVoltage <= 0) {
            console.log(`Источник ${source.name} неактивен`);
            return;
        }

        // Находим все компоненты, подключенные к этому источнику
        const connectedComponents = this.findConnectedComponents(source);

        console.log(`Подключено компонентов к ${source.name}: ${connectedComponents.length}`);

        if (connectedComponents.length <= 1) {
            console.log('Нет подключенных компонентов');
            return;
        }

        // Проверяем, есть ли полная цепь (от + к -)
        const hasCompleteCircuit = this.checkCompleteCircuit(connectedComponents, source);

        if (!hasCompleteCircuit) {
            console.log('Цепь разомкнута');
            return;
        }

        // Рассчитываем цепь
        this.calculateCircuit(connectedComponents, source, sourceVoltage);
    }

    findConnectedComponents(startComponent) {
        const visited = new Set();
        const result = [];

        const dfs = (component) => {
            if (visited.has(component.id)) return;
            visited.add(component.id);
            result.push(component);

            // Ищем компоненты, подключенные через провода
            this.simulator.wires.forEach(wire => {
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

    checkCompleteCircuit(components, source) {
        // Ищем положительную и отрицательную клеммы источника
        const positiveTerms = source.terminals.filter(t =>
            t.name === 'V+' || t.name === '+' || t.name === 'anode' ||
            (t.type === 'power' && !t.name.includes('GND') && !t.name.includes('COM'))
        );

        const negativeTerms = source.terminals.filter(t =>
            t.name === 'COM' || t.name === 'GND' || t.name === '-' || t.name === 'cathode' ||
            t.type === 'ground'
        );

        // Проверяем подключены ли обе клеммы
        let positiveConnected = false;
        let negativeConnected = false;

        components.forEach(comp => {
            if (comp === source) return;

            comp.terminals.forEach(terminal => {
                if (terminal.connected) {
                    // Проверяем подключен ли терминал к источнику
                    if (positiveTerms.some(pt =>
                        terminal.wire &&
                        (terminal.wire.startTerminal === pt || terminal.wire.endTerminal === pt)
                    )) {
                        positiveConnected = true;
                    }

                    if (negativeTerms.some(nt =>
                        terminal.wire &&
                        (terminal.wire.startTerminal === nt || terminal.wire.endTerminal === nt)
                    )) {
                        negativeConnected = true;
                    }
                }
            });
        });

        console.log(`Цепь ${source.name}: + подключен: ${positiveConnected}, - подключен: ${negativeConnected}`);
        return positiveConnected && negativeConnected;
    }

    calculateCircuit(components, source, sourceVoltage) {
        // Рассчитываем общее сопротивление цепи
        let totalResistance = 0;
        let totalVoltageDrop = 0;

        components.forEach(comp => {
            if (comp !== source) {
                if (comp.type === 'resistor') {
                    totalResistance += comp.resistance || 0;
                    console.log(`Резистор ${comp.name}: ${comp.resistance}Ω`);
                } else if (comp.type === 'led') {
                    const ledResistance = comp.forwardResistance || 220;
                    const ledVoltageDrop = comp.forwardVoltage || 2.0;
                    totalResistance += ledResistance;
                    totalVoltageDrop += ledVoltageDrop;
                    console.log(`LED ${comp.name}: R=${ledResistance}Ω, U_drop=${ledVoltageDrop}V`);
                } else if (comp.type === 'motor') {
                    const motorResistance = comp.windingResistance || 24;
                    totalResistance += motorResistance;
                    console.log(`Мотор ${comp.name}: ${motorResistance}Ω`);
                }
            }
        });

        console.log(`Общее сопротивление: ${totalResistance}Ω, Падение напряжения: ${totalVoltageDrop}V`);

        if (totalResistance === 0) {
            console.log('Короткое замыкание!');
            this.handleShortCircuit(components, source);
            return;
        }

        // Рассчитываем ток по закону Ома
        const effectiveVoltage = Math.max(0, sourceVoltage - totalVoltageDrop);
        const current = effectiveVoltage / totalResistance;

        console.log(`Ток цепи: ${(current * 1000).toFixed(1)}mA (U_эфф=${effectiveVoltage.toFixed(2)}V)`);

        // Распределяем значения по компонентам
        components.forEach(comp => {
            if (comp !== source) {
                comp.current = current;

                if (comp.type === 'resistor') {
                    comp.voltage = current * comp.resistance;
                } else if (comp.type === 'led') {
                    comp.voltage = comp.forwardVoltage || 2.0;
                    comp.isLit = current > 0.001;
                } else if (comp.type === 'motor') {
                    comp.voltage = current * (comp.windingResistance || 24);
                    comp.isRunning = current > 0.01;
                }

                comp.power = comp.voltage * current;

                console.log(`${comp.name}: U=${comp.voltage.toFixed(2)}V, I=${(comp.current * 1000).toFixed(1)}mA, P=${comp.power.toFixed(3)}W`);
            }
        });

        // Обновляем провода
        this.updateWires(components, current);
    }

    handleShortCircuit(components, source) {
        components.forEach(comp => {
            if (comp !== source) {
                comp.current = 999;
                comp.voltage = 0;
                comp.overheat = true;
                if (comp.type === 'led') comp.isLit = false;
                if (comp.type === 'motor') comp.isRunning = false;
            }
        });

        // Для источников питания срабатывает защита
        if (source.type === 'powersupply') {
            source.tripped = true;
            source.outputVoltage = 0;
        }
    }

    updateWires(components, current) {
        const componentIds = new Set(components.map(c => c.id));

        this.simulator.wires.forEach(wire => {
            if (componentIds.has(wire.startComponent.id) &&
                componentIds.has(wire.endComponent.id)) {
                wire.current = current;
                wire.overheat = current > 1;
            }
        });
    }
}