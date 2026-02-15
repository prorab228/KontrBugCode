class MotorParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'motor_dc': this.parseDCMotor,
            'controlbug_motors': this.parseControlBugMotors,
            'motor_servo': this.parseServo,
            'motor_stepper': this.parseStepper,
            'l298n_begin': this.parseL298NBegin,
            'l298n_motor': this.parseL298NMotor,
            'l298n_dual_begin': this.parseL298NDualBegin,
            'l298n_dual_motors': this.parseL298NDualMotors
        };
    }

    parseDCMotor = (block, parser) => {
        try {
            const pin1 = this.getPinFromBlock(block, 'PIN1');
            const pin2 = this.getPinFromBlock(block, 'PIN2');
            const speedBlock = block.getInputTargetBlock('SPEED');
            const speed = speedBlock ? parser.parseExpression(speedBlock) : '0';
            return `setDCMotor(${pin1}, ${pin2}, ${speed});`;
        } catch (error) {
            return '// Ошибка парсинга DC мотора';
        }
    }

    parseControlBugMotors = (block, parser) => {
        try {
            const leftSpeed = block.getFieldValue('LEFT');
            const rightSpeed = block.getFieldValue('RIGHT');
            return `setControlBugMotors(${leftSpeed}, ${rightSpeed});`;
        } catch (error) {
            return '// Ошибка парсинга моторов КонтрБаг';
        }
    }

    parseServo = (block, parser) => {
        try {
            const pin = this.getPinFromBlock(block, 'PIN');
            const angleBlock = block.getInputTargetBlock('ANGLE');
            const angle = angleBlock ? parser.parseExpression(angleBlock) : '90';
            return `servo.attach(${pin});\n  servo.write(${angle});`;
        } catch (error) {
            return '// Ошибка парсинга сервомотора';
        }
    }

    parseStepper = (block, parser) => {
        try {
            const pin1 = this.getPinFromBlock(block, 'PIN1');
            const pin2 = this.getPinFromBlock(block, 'PIN2');
            const pin3 = this.getPinFromBlock(block, 'PIN3');
            const pin4 = this.getPinFromBlock(block, 'PIN4');
            const stepsBlock = block.getInputTargetBlock('STEPS');
            const steps = stepsBlock ? parser.parseExpression(stepsBlock) : '0';
            return `stepMotor(${pin1}, ${pin2}, ${pin3}, ${pin4}, ${steps});`;
        } catch (error) {
            return '// Ошибка парсинга шагового мотора';
        }
    }

    parseL298NBegin = (block) => {
        const in1 = this.getPinFromBlock(block, 'IN1');
        const in2 = this.getPinFromBlock(block, 'IN2');
        const ena = this.getPinFromBlock(block, 'ENA');
        return `pinMode(${in1}, OUTPUT);\n  pinMode(${in2}, OUTPUT);\n  pinMode(${ena}, OUTPUT);`;
    }

    parseL298NMotor = (block, parser) => {
        const speed = block.getFieldValue('SPEED') || '0';
        return `setL298NMotor(${speed});`;
    }

    parseL298NDualBegin = (block) => {
        const in1 = this.getPinFromBlock(block, 'IN1');
        const in2 = this.getPinFromBlock(block, 'IN2');
        const ena = this.getPinFromBlock(block, 'ENA');
        const in3 = this.getPinFromBlock(block, 'IN3');
        const in4 = this.getPinFromBlock(block, 'IN4');
        const enb = this.getPinFromBlock(block, 'ENB');
        return `pinMode(${in1}, OUTPUT);\n  pinMode(${in2}, OUTPUT);\n  pinMode(${ena}, OUTPUT);\n  pinMode(${in3}, OUTPUT);\n  pinMode(${in4}, OUTPUT);\n  pinMode(${enb}, OUTPUT);`;
    }

    parseL298NDualMotors = (block, parser) => {
        const motorA = block.getFieldValue('MOTOR_A') || '0';
        const motorB = block.getFieldValue('MOTOR_B') || '0';
        return `setL298NDualMotors(${motorA}, ${motorB});`;
    }

    getSensorInitialization = (block) => {
        if (block.type === 'motor_servo') {
            const pin = this.getPinFromBlock(block, 'PIN', '9');
            return `servo.attach(${pin});`;
        }
        return null;
    }
}