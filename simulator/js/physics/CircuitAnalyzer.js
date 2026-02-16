class CircuitAnalyzer {
    constructor(simulator) {
        this.simulator = simulator;
        this.nodes = new Map(); // Карта узлов цепи
        this.branches = []; // Ветви цепи
        this.sources = []; // Источники напряжения
    }

    // Построение графа цепи
    buildCircuitGraph() {
        this.nodes.clear();
        this.branches = [];
        this.sources = [];

        // Собираем все уникальные точки соединения (узлы)
        const nodeMap = new Map(); // Координаты -> узел

        // Проходим по всем компонентам
        this.simulator.components.forEach(component => {
            component.terminals.forEach(terminal => {
                const nodeKey = `${Math.round(terminal.x)}_${Math.round(terminal.y)}`;

                if (!nodeMap.has(nodeKey)) {
                    const node = {
                        id: `node_${nodeMap.size}`,
                        x: terminal.x,
                        y: terminal.y,
                        components: [],
                        terminals: [],
                        voltage: 0,
                        isGround: terminal.type === 'ground'
                    };
                    nodeMap.set(nodeKey, node);
                }

                const node = nodeMap.get(nodeKey);
                node.components.push(component);
                node.terminals.push(terminal);

                // Сохраняем ссылку на узел в терминале
                terminal.node = node;
            });
        });

        // Проходим по всем проводам для объединения узлов
        this.simulator.wires.forEach(wire => {
            if (wire.startTerminal && wire.endTerminal) {
                const startKey = `${Math.round(wire.startTerminal.x)}_${Math.round(wire.startTerminal.y)}`;
                const endKey = `${Math.round(wire.endTerminal.x)}_${Math.round(wire.endTerminal.y)}`;

                if (nodeMap.has(startKey) && nodeMap.has(endKey) && startKey !== endKey) {
                    // Объединяем узлы
                    const startNode = nodeMap.get(startKey);
                    const endNode = nodeMap.get(endKey);

                    // Переносим все компоненты и терминалы в startNode
                    endNode.components.forEach(comp => {
                        if (!startNode.components.includes(comp)) {
                            startNode.components.push(comp);
                        }
                    });

                    endNode.terminals.forEach(term => {
                        if (!startNode.terminals.includes(term)) {
                            startNode.terminals.push(term);
                            term.node = startNode;
                        }
                    });

                    // Удаляем endNode
                    nodeMap.delete(endKey);
                }
            }
        });

        // Сохраняем узлы
        this.nodes = nodeMap;

        // Находим источники напряжения
        this.sources = this.simulator.components.filter(comp =>
            comp.isVoltageSource && comp.isVoltageSource()
        );

        // Строим ветви цепи
        this.buildBranches();
    }

    // Построение ветвей цепи
    buildBranches() {
        this.branches = [];
        const visitedComponents = new Set();

        // Начинаем от каждого источника
        this.sources.forEach(source => {
            if (!visitedComponents.has(source.id)) {
                const branch = this.traverseBranch(source, null, [], visitedComponents);
                if (branch.length > 0) {
                    this.branches.push(branch);
                }
            }
        });

        // Если есть компоненты, не подключенные к источникам (например, пассивные цепи)
        this.simulator.components.forEach(component => {
            if (!visitedComponents.has(component.id) &&
                !component.isVoltageSource &&
                component.terminals.some(t => t.connected)) {

                const branch = this.traverseBranch(component, null, [], visitedComponents);
                if (branch.length > 0) {
                    this.branches.push(branch);
                }
            }
        });
    }

    // Обход ветви цепи
    traverseBranch(currentComponent, fromTerminal, currentBranch, visitedComponents) {
        if (visitedComponents.has(currentComponent.id)) {
            return currentBranch;
        }

        visitedComponents.add(currentComponent.id);
        currentBranch.push(currentComponent);

        // Ищем следующие компоненты через провода
        currentComponent.terminals.forEach(terminal => {
            if (terminal === fromTerminal) return;

            if (terminal.wire) {
                let nextComponent = null;
                if (terminal.wire.startTerminal === terminal) {
                    nextComponent = terminal.wire.endComponent;
                } else if (terminal.wire.endTerminal === terminal) {
                    nextComponent = terminal.wire.startComponent;
                }

                if (nextComponent && !visitedComponents.has(nextComponent.id)) {
                    this.traverseBranch(nextComponent, terminal, currentBranch, visitedComponents);
                }
            }
        });

        return currentBranch;
    }

    // Анализ типа соединения (последовательное/параллельное)
    analyzeConnectionType(components) {
        if (components.length < 2) return 'single';

        // Проверяем, все ли компоненты подключены между одними и теми же узлами
        const nodePairs = new Set();

        components.forEach(comp => {
            if (comp.terminals.length >= 2) {
                const node1 = comp.terminals[0].node;
                const node2 = comp.terminals[1].node;
                if (node1 && node2) {
                    const pairKey = `${node1.id}-${node2.id}`;
                    const reverseKey = `${node2.id}-${node1.id}`;
                    nodePairs.add(pairKey);
                    nodePairs.add(reverseKey);
                }
            }
        });

        if (nodePairs.size === 2) {
            return 'parallel'; // Все компоненты между двумя узлами
        } else if (components.every((comp, i, arr) => {
            if (i === 0) return true;
            const prevComp = arr[i-1];
            // Проверяем, соединены ли компоненты последовательно
            return this.areComponentsInSeries(prevComp, comp);
        })) {
            return 'series';
        }

        return 'mixed';
    }

    // Проверка последовательного соединения
    areComponentsInSeries(comp1, comp2) {
        // Два компонента соединены последовательно, если они имеют общий узел
        // и этот узел не подключен к другим компонентам
        for (const term1 of comp1.terminals) {
            for (const term2 of comp2.terminals) {
                if (term1.node && term2.node && term1.node.id === term2.node.id) {
                    // Проверяем, есть ли другие компоненты на этом узле
                    const otherComponents = term1.node.components.filter(c =>
                        c !== comp1 && c !== comp2
                    );
                    return otherComponents.length === 0;
                }
            }
        }
        return false;
    }

    // Расчет эквивалентного сопротивления для ветви
    calculateBranchResistance(branch) {
        const connectionType = this.analyzeConnectionType(branch);

        if (connectionType === 'series') {
            // Последовательное соединение: R_total = ΣR_i
            return branch.reduce((sum, comp) => sum + (comp.resistance || 0), 0);
        } else if (connectionType === 'parallel') {
            // Параллельное соединение: 1/R_total = Σ(1/R_i)
            const conductanceSum = branch.reduce((sum, comp) => {
                return sum + 1/(comp.resistance || Infinity);
            }, 0);
            return conductanceSum > 0 ? 1/conductanceSum : Infinity;
        } else {
            // Смешанное соединение - используем рекурсивный расчет
            return this.calculateMixedResistance(branch);
        }
    }

    // Расчет смешанного сопротивления
    calculateMixedResistance(components) {
        // Упрощенный алгоритм для смешанных соединений
        // Группируем параллельные компоненты, затем считаем последовательно

        let simplifiedComponents = [...components];
        let changed = true;

        while (changed && simplifiedComponents.length > 1) {
            changed = false;

            // Ищем параллельные пары
            for (let i = 0; i < simplifiedComponents.length; i++) {
                for (let j = i + 1; j < simplifiedComponents.length; j++) {
                    const comp1 = simplifiedComponents[i];
                    const comp2 = simplifiedComponents[j];

                    if (this.areComponentsInParallel(comp1, comp2)) {
                        // Заменяем параллельную пару эквивалентным сопротивлением
                        const R1 = comp1.resistance || Infinity;
                        const R2 = comp2.resistance || Infinity;
                        const R_eq = 1/(1/R1 + 1/R2);
                        const equivalentComp = {
                            resistance: R_eq,
                            name: `${comp1.name}||${comp2.name}`,
                            id: `eq_${comp1.id}_${comp2.id}`,
                            terminals: []
                        };

                        simplifiedComponents.splice(j, 1);
                        simplifiedComponents.splice(i, 1, equivalentComp);
                        changed = true;
                        break;
                    }
                }
                if (changed) break;
            }

            // Ищем последовательные пары
            if (!changed) {
                for (let i = 0; i < simplifiedComponents.length - 1; i++) {
                    const comp1 = simplifiedComponents[i];
                    const comp2 = simplifiedComponents[i + 1];

                    if (this.areComponentsInSeries(comp1, comp2)) {
                        // Заменяем последовательную пару эквивалентным сопротивлением
                        const R_eq = (comp1.resistance || 0) + (comp2.resistance || 0);
                        const equivalentComp = {
                            resistance: R_eq,
                            name: `${comp1.name}+${comp2.name}`,
                            id: `eq_${comp1.id}_${comp2.id}`,
                            terminals: []
                        };

                        simplifiedComponents.splice(i, 2, equivalentComp);
                        changed = true;
                        break;
                    }
                }
            }
        }

        return simplifiedComponents[0]?.resistance || 0;
    }

    // Проверка параллельного соединения
    areComponentsInParallel(comp1, comp2) {
        if (comp1.terminals.length < 2 || comp2.terminals.length < 2) return false;

        const nodes1 = comp1.terminals.map(t => t.node?.id).filter(id => id);
        const nodes2 = comp2.terminals.map(t => t.node?.id).filter(id => id);

        return nodes1.length === 2 && nodes2.length === 2 &&
               ((nodes1[0] === nodes2[0] && nodes1[1] === nodes2[1]) ||
                (nodes1[0] === nodes2[1] && nodes1[1] === nodes2[0]));
    }

    // Расчет токов и напряжений в цепи
    solveCircuit() {
        this.buildCircuitGraph();

        if (this.sources.length === 0) {
            console.log('Нет источников напряжения в цепи');
            return;
        }

        // Сбрасываем напряжения и токи
        this.resetAllValues();

        // Для каждого источника рассчитываем его цепь
        this.sources.forEach(source => {
            this.solveForSource(source);
        });

        // Обновляем провода
        this.updateWires();

        // Обновляем компоненты на основе новых напряжений
        this.updateComponents();
    }

    solveForSource(source) {
        // Находим все компоненты, подключенные к этому источнику
        const visited = new Set();
        const connectedComponents = [];

        const dfs = (component) => {
            if (visited.has(component.id)) return;
            visited.add(component.id);
            connectedComponents.push(component);

            // Ищем связанные компоненты через провода
            this.simulator.wires.forEach(wire => {
                if (wire.startComponent === component) {
                    dfs(wire.endComponent);
                }
                if (wire.endComponent === component) {
                    dfs(wire.startComponent);
                }
            });
        };

        dfs(source);

        if (connectedComponents.length <= 1) {
            console.log('Нет подключенных компонентов к источнику', source.name);
            return;
        }

        // Анализируем тип соединения
        const connectionType = this.analyzeConnectionType(connectedComponents);
        console.log(`Тип соединения для ${source.name}: ${connectionType}`);

        // Рассчитываем цепь в зависимости от типа соединения
        switch(connectionType) {
            case 'series':
                this.solveSeriesCircuit(source, connectedComponents);
                break;
            case 'parallel':
                this.solveParallelCircuit(source, connectedComponents);
                break;
            case 'mixed':
                this.solveMixedCircuit(source, connectedComponents);
                break;
            default:
                this.solveSimpleCircuit(source, connectedComponents);
        }
    }

    // Решение последовательной цепи
    solveSeriesCircuit(source, components) {
        // В последовательной цепи ток одинаков, напряжения суммируются
        const totalResistance = this.calculateBranchResistance(components.filter(c => c !== source));

        if (totalResistance <= 0) {
            console.log('Короткое замыкание в последовательной цепи');
            this.handleShortCircuit(components, source);
            return;
        }

        // Источник может быть AC или DC
        let sourceVoltage;
        if (source.isAC) {
            sourceVoltage = source.outputVoltageAC / Math.sqrt(2); // RMS
        } else {
            sourceVoltage = source.outputVoltage;
        }

        const current = sourceVoltage / totalResistance;

        // Распределяем напряжение по компонентам
        let voltageSum = 0;
        components.forEach(comp => {
            if (comp !== source) {
                comp.current = current;
                comp.voltage = current * (comp.resistance || 0);
                voltageSum += comp.voltage;

                // Обновляем терминалы компонента
                this.updateComponentTerminals(comp);
            }
        });

        console.log(`Последовательная цепь: I=${(current*1000).toFixed(1)}mA, R_total=${totalResistance}Ω, U_total=${voltageSum.toFixed(2)}V`);
    }

    // Решение параллельной цепи
    solveParallelCircuit(source, components) {
        // В параллельной цепи напряжение одинаково, токи суммируются
        let sourceVoltage;
        if (source.isAC) {
            sourceVoltage = source.outputVoltageAC / Math.sqrt(2); // RMS
        } else {
            sourceVoltage = source.outputVoltage;
        }

        let totalCurrent = 0;
        const nonSourceComponents = components.filter(c => c !== source);

        nonSourceComponents.forEach(comp => {
            if (comp.resistance > 0) {
                comp.voltage = sourceVoltage;
                comp.current = sourceVoltage / comp.resistance;
                totalCurrent += comp.current;

                this.updateComponentTerminals(comp);
            }
        });

        console.log(`Параллельная цепь: U=${sourceVoltage.toFixed(2)}V, I_total=${(totalCurrent*1000).toFixed(1)}mA`);
    }

    // Решение смешанной цепи
    solveMixedCircuit(source, components) {
        // Упрощаем цепь до эквивалентного сопротивления
        const nonSourceComponents = components.filter(c => c !== source);
        const equivalentResistance = this.calculateBranchResistance(nonSourceComponents);

        if (equivalentResistance <= 0) {
            console.log('Короткое замыкание в смешанной цепи');
            this.handleShortCircuit(components, source);
            return;
        }

        let sourceVoltage;
        if (source.isAC) {
            sourceVoltage = source.outputVoltageAC / Math.sqrt(2);
        } else {
            sourceVoltage = source.outputVoltage;
        }

        const totalCurrent = sourceVoltage / equivalentResistance;

        // Используем упрощенный расчет для смешанных цепей
        // Распределяем ток пропорционально сопротивлениям
        this.distributeCurrents(source, nonSourceComponents, totalCurrent);

        console.log(`Смешанная цепь: R_eq=${equivalentResistance.toFixed(1)}Ω, I_total=${(totalCurrent*1000).toFixed(1)}mA`);
    }

    // Распределение токов в смешанной цепи
    distributeCurrents(source, components, totalCurrent) {
        // Упрощенный алгоритм: считаем, что все компоненты либо последовательно, либо параллельно
        // В реальной реализации здесь должен быть метод узловых потенциалов

        // Пока просто равномерно распределим ток по компонентам
        const currentPerComponent = totalCurrent / components.length;

        components.forEach(comp => {
            if (comp.resistance > 0) {
                comp.current = currentPerComponent;
                comp.voltage = currentPerComponent * comp.resistance;
                this.updateComponentTerminals(comp);
            }
        });
    }

    // Решение простой цепи
    solveSimpleCircuit(source, components) {
        // Для простых цепей (один источник + одна нагрузка)
        const load = components.find(c => c !== source && c.resistance > 0);

        if (!load) return;

        let sourceVoltage;
        if (source.isAC) {
            sourceVoltage = source.outputVoltageAC / Math.sqrt(2);
        } else {
            sourceVoltage = source.outputVoltage;
        }

        const current = sourceVoltage / load.resistance;
        load.current = current;
        load.voltage = sourceVoltage;

        this.updateComponentTerminals(load);

        console.log(`Простая цепь: U=${sourceVoltage.toFixed(2)}V, I=${(current*1000).toFixed(1)}mA`);
    }

    // Обновление терминалов компонента
    updateComponentTerminals(component) {
        if (component.terminals.length >= 2) {
            const terminal1 = component.terminals[0];
            const terminal2 = component.terminals[1];

            // Устанавливаем напряжения на терминалах
            if (component.isAC) {
                terminal1.voltageAC = component.voltage || 0;
                terminal2.voltageAC = 0;
            } else {
                terminal1.voltage = component.voltage || 0;
                terminal2.voltage = 0;
            }

            // Обновляем узел
            if (terminal1.node) {
                terminal1.node.voltage = component.voltage || 0;
            }
            if (terminal2.node) {
                terminal2.node.voltage = 0;
            }
        }
    }

    // Сброс всех значений
    resetAllValues() {
        this.simulator.components.forEach(comp => {
            comp.voltage = 0;
            comp.current = 0;
            comp.power = 0;
            comp.overheat = false;

            comp.terminals.forEach(terminal => {
                terminal.voltage = 0;
                terminal.voltageAC = 0;
            });

            // Сброс состояния специфичных компонентов
           // if (comp.type === 'led') comp.isLit = false;
           // if (comp.type === 'motor') comp.isRunning = false;
           // if (comp.type === 'buzzer') comp.isActive = false;
        });

        this.simulator.wires.forEach(wire => {
            wire.voltage = 0;
            wire.current = 0;
            wire.overheat = false;
        });
    }

    updateWires() {
        this.simulator.wires.forEach(wire => {
            if (wire.startTerminal && wire.endTerminal) {
                // Напряжение на проводе - разница между терминалами
                const startVoltage = wire.startTerminal.voltage || 0;
                const endVoltage = wire.endTerminal.voltage || 0;
                wire.voltage = Math.abs(startVoltage - endVoltage);

                // Ток в проводе - берем из компонентов
                // Приоритет: источник -> нагрузка
                let current = 0;

                // Проверяем, есть ли источник в цепи
                if (wire.startComponent && wire.startComponent.isVoltageSource) {
                    current = wire.startComponent.current || 0;
                } else if (wire.endComponent && wire.endComponent.isVoltageSource) {
                    current = wire.endComponent.current || 0;
                } else if (wire.startComponent) {
                    current = wire.startComponent.current || 0;
                } else if (wire.endComponent) {
                    current = wire.endComponent.current || 0;
                }

                wire.current = current;

                // Проверяем на перегрев
                wire.overheat = wire.current > wire.maxCurrent;
            }
        });
    }

    // Обновление компонентов на основе новых напряжений
    updateComponents() {
        this.simulator.components.forEach(comp => {
            if (comp.type === 'powersupply') {
                // Для источника питания специальная логика
                if (comp.calculateLoadCurrent) {
                    comp.calculateLoadCurrent();
                }
            } else if (comp.updateFromVoltage) {
                comp.updateFromVoltage();
            }

            // Пересчет мощности
            if (comp.voltage && comp.current) {
                comp.power = comp.voltage * comp.current;
            }
        });
    }

    handleShortCircuit(components, source) {
        components.forEach(comp => {
            if (comp !== source) {
                comp.current = 999;
                comp.voltage = 0;
                comp.overheat = true;
            }
        });

        if (source.type === 'powersupply') {
            source.tripped = true;
            source.outputVoltage = 0;
        }

        // Обновляем провода
        this.updateWires();
    }

    // Вспомогательный метод для поиска связанных компонентов
    findConnectedComponents(startComponent) {
        const visited = new Set();
        const result = [];

        const dfs = (component) => {
            if (visited.has(component.id)) return;
            visited.add(component.id);
            result.push(component);

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
}