class WorkspaceManager {
    static loadExample(workspace, exampleName = 'blink') {
        if (!workspace) return;

        try {
            workspace.clear();

            const examples = {
                'start': this.createStartExample,
                'blink': this.createBlinkExample,
                'button': this.createButtonExample,
                'ultrasonic': this.createUltrasonicExample,
                'dc_motor': this.createDCMotorExample,
                'servo': this.createServoExample,
                'oled': this.createOLEDExample,
                'bluetooth': this.createBluetoothExample,
                'line_follower': this.createLineFollowerExample,
                'serial':this.createSerialExample,

            };

            if (examples[exampleName]) {
                examples[exampleName].call(this, workspace);
            }

            if (window.UIManager) {
                window.UIManager.showNotification(`Пример "${this.getExampleName(exampleName)}" загружен!`);
            }

        } catch (error) {
            console.error('Error loading example:', error);
            if (window.UIManager) {
                window.UIManager.showNotification('Ошибка загрузки примера', true);
            }
        }
    }

    static getExampleName(exampleName) {
        const names = {
            'start': 'Пустой',
            'blink': 'Мигающий светодиод',
            'button': 'Управление кнопкой',
            'ultrasonic': 'Ультразвуковой дальномер',
            'dc_motor': 'DC мотор',
            'servo': 'Сервомотор',
            'oled': 'OLED дисплей',
            'bluetooth': 'Bluetooth',
            'line_follower': 'Движение по линии',
            'serial': 'Serial порт'
        };
        return names[exampleName] || exampleName;
    }

    static createStartExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);



        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        
    }

    static createBlinkExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const pinModeBlock = workspace.newBlock('pin_mode');
        pinModeBlock.setFieldValue('13', 'PIN');
        pinModeBlock.setFieldValue('OUTPUT', 'MODE');
        pinModeBlock.initSvg();
        pinModeBlock.render();

        setupBlock.getInput('SETUP_CODE').connection.connect(pinModeBlock.previousConnection);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        const digitalWriteHigh = workspace.newBlock('digital_write');
        digitalWriteHigh.setFieldValue('13', 'PIN');
        digitalWriteHigh.setFieldValue('HIGH', 'STATE');
        digitalWriteHigh.initSvg();
        digitalWriteHigh.render();

        const delay1 = workspace.newBlock('delay');
        delay1.setFieldValue('1000', 'TIME');
        delay1.initSvg();
        delay1.render();

        const digitalWriteLow = workspace.newBlock('digital_write');
        digitalWriteLow.setFieldValue('13', 'PIN');
        digitalWriteLow.setFieldValue('LOW', 'STATE');
        digitalWriteLow.initSvg();
        digitalWriteLow.render();

        const delay2 = workspace.newBlock('delay');
        delay2.setFieldValue('1000', 'TIME');
        delay2.initSvg();
        delay2.render();

        loopBlock.getInput('LOOP_CODE').connection.connect(digitalWriteHigh.previousConnection);
        digitalWriteHigh.nextConnection.connect(delay1.previousConnection);
        delay1.nextConnection.connect(digitalWriteLow.previousConnection);
        digitalWriteLow.nextConnection.connect(delay2.previousConnection);
    }

    static createButtonExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const pinModeLed = workspace.newBlock('pin_mode');
        pinModeLed.setFieldValue('13', 'PIN');
        pinModeLed.setFieldValue('OUTPUT', 'MODE');
        pinModeLed.initSvg();
        pinModeLed.render();

        const pinModeBtn = workspace.newBlock('pin_mode');
        pinModeBtn.setFieldValue('2', 'PIN');
        pinModeBtn.setFieldValue('INPUT_PULLUP', 'MODE');
        pinModeBtn.initSvg();
        pinModeBtn.render();

        setupBlock.getInput('SETUP_CODE').connection.connect(pinModeLed.previousConnection);
        pinModeLed.nextConnection.connect(pinModeBtn.previousConnection);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 200);

        const ifBlock = workspace.newBlock('controls_if');
        ifBlock.initSvg();
        ifBlock.render();

        const digitalRead = workspace.newBlock('digital_read');
        digitalRead.setFieldValue('2', 'PIN');
        digitalRead.initSvg();
        digitalRead.render();

        const digitalWrite = workspace.newBlock('digital_write');
        digitalWrite.setFieldValue('13', 'PIN');
        digitalWrite.setFieldValue('HIGH', 'STATE');
        digitalWrite.initSvg();
        digitalWrite.render();

        ifBlock.getInput('CONDITION').connection.connect(digitalRead.outputConnection);
        ifBlock.getInput('THEN').connection.connect(digitalWrite.previousConnection);
        loopBlock.getInput('LOOP_CODE').connection.connect(ifBlock.previousConnection);
    }

    // workspaceManager.js - добавление примера для Serial input

    static createSerialExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const serialBegin = workspace.newBlock('serial_begin');
        serialBegin.setFieldValue('9600', 'BAUD');
        serialBegin.initSvg();
        serialBegin.render();

        setupBlock.getInput('SETUP_CODE').connection.connect(serialBegin.previousConnection);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        // Проверка наличия данных
        const ifBlock = workspace.newBlock('controls_if');
        ifBlock.initSvg();
        ifBlock.render();

        const serialAvailable = workspace.newBlock('serial_available');
        serialAvailable.initSvg();
        serialAvailable.render();

        // Чтение строки
        const serialReadString = workspace.newBlock('serial_read_string');
        serialReadString.initSvg();
        serialReadString.render();

        // Вывод обратно
        const serialPrint = workspace.newBlock('serial_println');
        serialPrint.initSvg();
        serialPrint.render();

        const textBlock = workspace.newBlock('text');
        textBlock.setFieldValue('Получено: ', 'TEXT');
        textBlock.initSvg();
        textBlock.render();

        const textJoin = workspace.newBlock('text_join');
        textJoin.initSvg();
        textJoin.render();

        // Соединение блоков
        ifBlock.getInput('CONDITION').connection.connect(serialAvailable.outputConnection);
        ifBlock.getInput('THEN').connection.connect(serialPrint.previousConnection);

        textJoin.getInput('TEXT1').connection.connect(textBlock.outputConnection);
        textJoin.getInput('TEXT2').connection.connect(serialReadString.outputConnection);
        serialPrint.getInput('TEXT').connection.connect(textJoin.outputConnection);

        loopBlock.getInput('LOOP_CODE').connection.connect(ifBlock.previousConnection);
    }

    static createUltrasonicExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const serialBegin = workspace.newBlock('serial_begin');
        serialBegin.setFieldValue('9600', 'BAUD');
        serialBegin.initSvg();
        serialBegin.render();

        setupBlock.getInput('SETUP_CODE').connection.connect(serialBegin.previousConnection);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        const ultrasonic = workspace.newBlock('sensor_ultrasonic');
        ultrasonic.setFieldValue('9', 'TRIG');
        ultrasonic.setFieldValue('10', 'ECHO');
        ultrasonic.initSvg();
        ultrasonic.render();

        const serialPrint = workspace.newBlock('serial_print');
        serialPrint.initSvg();
        serialPrint.render();

        const textBlock = workspace.newBlock('text');
        textBlock.setFieldValue('Distance: ', 'TEXT');
        textBlock.initSvg();
        textBlock.render();

        const mathArithmetic = workspace.newBlock('math_arithmetic');
        mathArithmetic.setFieldValue('ADD', 'OP');
        mathArithmetic.initSvg();
        mathArithmetic.render();

        const delayBlock = workspace.newBlock('delay');
        delayBlock.setFieldValue('500', 'TIME');
        delayBlock.initSvg();
        delayBlock.render();

        mathArithmetic.getInput('A').connection.connect(textBlock.outputConnection);
        mathArithmetic.getInput('B').connection.connect(ultrasonic.outputConnection);
        serialPrint.getInput('TEXT').connection.connect(mathArithmetic.outputConnection);

        loopBlock.getInput('LOOP_CODE').connection.connect(serialPrint.previousConnection);
        serialPrint.nextConnection.connect(delayBlock.previousConnection);
    }

    static createDCMotorExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        // Двигатель вперед
        const motorForward = workspace.newBlock('motor_dc');
        motorForward.setFieldValue('5', 'PIN1');
        motorForward.setFieldValue('6', 'PIN2');
        motorForward.initSvg();
        motorForward.render();

        const speedForward = workspace.newBlock('math_number');
        speedForward.setFieldValue('200', 'NUM');
        speedForward.initSvg();
        speedForward.render();

        const delay1 = workspace.newBlock('delay');
        delay1.setFieldValue('2000', 'TIME');
        delay1.initSvg();
        delay1.render();

        // Остановка
        const motorStop = workspace.newBlock('motor_dc');
        motorStop.setFieldValue('5', 'PIN1');
        motorStop.setFieldValue('6', 'PIN2');
        motorStop.initSvg();
        motorStop.render();

        const speedStop = workspace.newBlock('math_number');
        speedStop.setFieldValue('0', 'NUM');
        speedStop.initSvg();
        speedStop.render();

        const delay2 = workspace.newBlock('delay');
        delay2.setFieldValue('1000', 'TIME');
        delay2.initSvg();
        delay2.render();

        // Двигатель назад
        const motorBackward = workspace.newBlock('motor_dc');
        motorBackward.setFieldValue('5', 'PIN1');
        motorBackward.setFieldValue('6', 'PIN2');
        motorBackward.initSvg();
        motorBackward.render();

        const speedBackward = workspace.newBlock('math_number');
        speedBackward.setFieldValue('-200', 'NUM');
        speedBackward.initSvg();
        speedBackward.render();

        const delay3 = workspace.newBlock('delay');
        delay3.setFieldValue('2000', 'TIME');
        delay3.initSvg();
        delay3.render();

        // Соединение блоков
        motorForward.getInput('SPEED').connection.connect(speedForward.outputConnection);
        motorStop.getInput('SPEED').connection.connect(speedStop.outputConnection);
        motorBackward.getInput('SPEED').connection.connect(speedBackward.outputConnection);

        loopBlock.getInput('LOOP_CODE').connection.connect(motorForward.previousConnection);
        motorForward.nextConnection.connect(delay1.previousConnection);
        delay1.nextConnection.connect(motorStop.previousConnection);
        motorStop.nextConnection.connect(delay2.previousConnection);
        delay2.nextConnection.connect(motorBackward.previousConnection);
        motorBackward.nextConnection.connect(delay3.previousConnection);
    }

    static createServoExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        // Серво в положение 0°
        const servo1 = workspace.newBlock('motor_servo');
        servo1.setFieldValue('9', 'PIN');
        servo1.initSvg();
        servo1.render();

        const angle1 = workspace.newBlock('math_number');
        angle1.setFieldValue('0', 'NUM');
        angle1.initSvg();
        angle1.render();

        const delay1 = workspace.newBlock('delay');
        delay1.setFieldValue('1000', 'TIME');
        delay1.initSvg();
        delay1.render();

        // Серво в положение 90°
        const servo2 = workspace.newBlock('motor_servo');
        servo2.setFieldValue('9', 'PIN');
        servo2.initSvg();
        servo2.render();

        const angle2 = workspace.newBlock('math_number');
        angle2.setFieldValue('90', 'NUM');
        angle2.initSvg();
        angle2.render();

        const delay2 = workspace.newBlock('delay');
        delay2.setFieldValue('1000', 'TIME');
        delay2.initSvg();
        delay2.render();

        // Серво в положение 180°
        const servo3 = workspace.newBlock('motor_servo');
        servo3.setFieldValue('9', 'PIN');
        servo3.initSvg();
        servo3.render();

        const angle3 = workspace.newBlock('math_number');
        angle3.setFieldValue('180', 'NUM');
        angle3.initSvg();
        angle3.render();

        const delay3 = workspace.newBlock('delay');
        delay3.setFieldValue('1000', 'TIME');
        delay3.initSvg();
        delay3.render();

        // Соединение блоков
        servo1.getInput('ANGLE').connection.connect(angle1.outputConnection);
        servo2.getInput('ANGLE').connection.connect(angle2.outputConnection);
        servo3.getInput('ANGLE').connection.connect(angle3.outputConnection);

        loopBlock.getInput('LOOP_CODE').connection.connect(servo1.previousConnection);
        servo1.nextConnection.connect(delay1.previousConnection);
        delay1.nextConnection.connect(servo2.previousConnection);
        servo2.nextConnection.connect(delay2.previousConnection);
        delay2.nextConnection.connect(servo3.previousConnection);
        servo3.nextConnection.connect(delay3.previousConnection);
    }

    static createOLEDExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        // Очистка дисплея
        const clearDisplay = workspace.newBlock('display_oled_clear');
        clearDisplay.initSvg();
        clearDisplay.render();

        // Текст на дисплее
        const displayText = workspace.newBlock('display_oled_text');
        displayText.initSvg();
        displayText.render();

        const textBlock = workspace.newBlock('text');
        textBlock.setFieldValue('Hello World!', 'TEXT');
        textBlock.initSvg();
        textBlock.render();

        const xPos = workspace.newBlock('math_number');
        xPos.setFieldValue('0', 'NUM');
        xPos.initSvg();
        xPos.render();

        const yPos = workspace.newBlock('math_number');
        yPos.setFieldValue('0', 'NUM');
        yPos.initSvg();
        yPos.render();

        const delayBlock = workspace.newBlock('delay');
        delayBlock.setFieldValue('1000', 'TIME');
        delayBlock.initSvg();
        delayBlock.render();

        // Соединение блоков
        displayText.getInput('TEXT').connection.connect(textBlock.outputConnection);
        displayText.getInput('X').connection.connect(xPos.outputConnection);
        displayText.getInput('Y').connection.connect(yPos.outputConnection);

        loopBlock.getInput('LOOP_CODE').connection.connect(clearDisplay.previousConnection);
        clearDisplay.nextConnection.connect(displayText.previousConnection);
        displayText.nextConnection.connect(delayBlock.previousConnection);
    }

    static createBluetoothExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        const serialBegin = workspace.newBlock('serial_begin');
        serialBegin.setFieldValue('9600', 'BAUD');
        serialBegin.initSvg();
        serialBegin.render();

        setupBlock.getInput('SETUP_CODE').connection.connect(serialBegin.previousConnection);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 150);

        // Получение данных по Bluetooth
        const btReceive = workspace.newBlock('bluetooth_receive');
        btReceive.initSvg();
        btReceive.render();

        const ifBlock = workspace.newBlock('controls_if');
        ifBlock.initSvg();
        ifBlock.render();

        const compareBlock = workspace.newBlock('logic_compare');
        compareBlock.setFieldValue('NEQ', 'OP');
        compareBlock.initSvg();
        compareBlock.render();

        const textBlock = workspace.newBlock('text');
        textBlock.setFieldValue('', 'TEXT');
        textBlock.initSvg();
        textBlock.render();

        // Отправка ответа
        const btSend = workspace.newBlock('bluetooth_send');
        btSend.initSvg();
        btSend.render();

        const responseText = workspace.newBlock('text');
        responseText.setFieldValue('Received: ', 'TEXT');
        responseText.initSvg();
        responseText.render();

        const mathArithmetic = workspace.newBlock('math_arithmetic');
        mathArithmetic.setFieldValue('ADD', 'OP');
        mathArithmetic.initSvg();
        mathArithmetic.render();

        // Соединение блоков
        compareBlock.getInput('A').connection.connect(btReceive.outputConnection);
        compareBlock.getInput('B').connection.connect(textBlock.outputConnection);
        ifBlock.getInput('CONDITION').connection.connect(compareBlock.outputConnection);

        mathArithmetic.getInput('A').connection.connect(responseText.outputConnection);
        mathArithmetic.getInput('B').connection.connect(btReceive.outputConnection);
        btSend.getInput('DATA').connection.connect(mathArithmetic.outputConnection);

        ifBlock.getInput('THEN').connection.connect(btSend.previousConnection);
        loopBlock.getInput('LOOP_CODE').connection.connect(ifBlock.previousConnection);
    }

    static createLineFollowerExample(workspace) {
        const setupBlock = workspace.newBlock('arduino_setup');
        setupBlock.initSvg();
        setupBlock.render();
        setupBlock.moveBy(50, 50);

        // Настройка пинов для моторов
        const pinModeMotor1 = workspace.newBlock('pin_mode');
        pinModeMotor1.setFieldValue('5', 'PIN');
        pinModeMotor1.setFieldValue('OUTPUT', 'MODE');
        pinModeMotor1.initSvg();
        pinModeMotor1.render();

        const pinModeMotor2 = workspace.newBlock('pin_mode');
        pinModeMotor2.setFieldValue('6', 'PIN');
        pinModeMotor2.setFieldValue('OUTPUT', 'MODE');
        pinModeMotor2.initSvg();
        pinModeMotor2.render();

        setupBlock.getInput('SETUP_CODE').connection.connect(pinModeMotor1.previousConnection);
        pinModeMotor1.nextConnection.connect(pinModeMotor2.previousConnection);

        const loopBlock = workspace.newBlock('arduino_loop');
        loopBlock.initSvg();
        loopBlock.render();
        loopBlock.moveBy(50, 200);

        // Левый датчик линии
        const leftSensor = workspace.newBlock('sensor_ir_line');
        leftSensor.setFieldValue('7', 'PIN');
        leftSensor.initSvg();
        leftSensor.render();

        // Правый датчик линии
        const rightSensor = workspace.newBlock('sensor_ir_line');
        rightSensor.setFieldValue('8', 'PIN');
        rightSensor.initSvg();
        rightSensor.render();

        // Условие: оба датчика на белом
        const ifBothWhite = workspace.newBlock('controls_if');
        ifBothWhite.initSvg();
        ifBothWhite.render();

        const andBlock = workspace.newBlock('logic_operation');
        andBlock.setFieldValue('AND', 'OP');
        andBlock.initSvg();
        andBlock.render();

        const notLeft = workspace.newBlock('logic_boolean');
        notLeft.setFieldValue('FALSE', 'BOOL');
        notLeft.initSvg();
        notLeft.render();

        const notRight = workspace.newBlock('logic_boolean');
        notRight.setFieldValue('FALSE', 'BOOL');
        notRight.initSvg();
        notRight.render();

        // Двигаться вперед
        const motorForward = workspace.newBlock('motor_dc');
        motorForward.setFieldValue('5', 'PIN1');
        motorForward.setFieldValue('6', 'PIN2');
        motorForward.initSvg();
        motorForward.render();

        const speedForward = workspace.newBlock('math_number');
        speedForward.setFieldValue('150', 'NUM');
        speedForward.initSvg();
        speedForward.render();

        // Условие: левый на черном
        const ifLeftBlack = workspace.newBlock('controls_if');
        ifLeftBlack.initSvg();
        ifLeftBlack.render();

        // Поворот направо
        const motorRight = workspace.newBlock('motor_dc');
        motorRight.setFieldValue('5', 'PIN1');
        motorRight.setFieldValue('6', 'PIN2');
        motorRight.initSvg();
        motorRight.render();

        const speedRight = workspace.newBlock('math_number');
        speedRight.setFieldValue('-100', 'NUM');
        speedRight.initSvg();
        speedRight.render();

        // Условие: правый на черном
        const ifRightBlack = workspace.newBlock('controls_if');
        ifRightBlack.initSvg();
        ifRightBlack.render();

        // Поворот налево
        const motorLeft = workspace.newBlock('motor_dc');
        motorLeft.setFieldValue('5', 'PIN1');
        motorLeft.setFieldValue('6', 'PIN2');
        motorLeft.initSvg();
        motorLeft.render();

        const speedLeft = workspace.newBlock('math_number');
        speedLeft.setFieldValue('100', 'NUM');
        speedLeft.initSvg();
        speedLeft.render();

        // Соединение блоков
        andBlock.getInput('A').connection.connect(leftSensor.outputConnection);
        andBlock.getInput('B').connection.connect(rightSensor.outputConnection);
        ifBothWhite.getInput('CONDITION').connection.connect(andBlock.outputConnection);
        motorForward.getInput('SPEED').connection.connect(speedForward.outputConnection);
        ifBothWhite.getInput('THEN').connection.connect(motorForward.previousConnection);

        ifLeftBlack.getInput('CONDITION').connection.connect(leftSensor.outputConnection);
        motorRight.getInput('SPEED').connection.connect(speedRight.outputConnection);
        ifLeftBlack.getInput('THEN').connection.connect(motorRight.previousConnection);

        ifRightBlack.getInput('CONDITION').connection.connect(rightSensor.outputConnection);
        motorLeft.getInput('SPEED').connection.connect(speedLeft.outputConnection);
        ifRightBlack.getInput('THEN').connection.connect(motorLeft.previousConnection);

        loopBlock.getInput('LOOP_CODE').connection.connect(ifBothWhite.previousConnection);
        ifBothWhite.nextConnection.connect(ifLeftBlack.previousConnection);
        ifLeftBlack.nextConnection.connect(ifRightBlack.previousConnection);
    }

    static clearWorkspace(workspace) {
        if (!workspace) return false;

        if (confirm('Очистить рабочую область?')) {
            workspace.clear();
            return true;
        }
        return false;
    }

    static async handleOpenProject(event, filePath) {
        if (!window.ipcRenderer) return;

        const result = await window.ipcRenderer.invoke('load-sketch', filePath);
        if (result.success) {
            if (window.UIManager) {
                window.UIManager.updateCodeOutput(result.content);
                window.UIManager.showNotification('Проект загружен: ' + filePath);
            }
            return result.content;
        } else {
            if (window.UIManager) {
                window.UIManager.showNotification('Ошибка загрузки: ' + result.error, true);
            }
        }
    }
}

// Регистрируем класс в глобальной области видимости
window.WorkspaceManager = WorkspaceManager;