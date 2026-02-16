class MotorInitializationProvider extends BaseInitializationProvider {
    constructor() {
        super();

        this.initializationMap = {
            'controlbug_motors': this.initializeControlBugMotors,
            'motor_servo': this.initializeServo
        };
    }


    initializeControlBugMotors = (workspace) => {
        return [
            'pinMode(11, OUTPUT);',
            'pinMode(10, OUTPUT);',
            'pinMode(3, OUTPUT);',
            'pinMode(9, OUTPUT);'
        ];
    }

    initializeL298NBegin = (workspace) => {
         const motorBlock = workspace?.getAllBlocks(false)
            .find(b => b.type === 'l298n_begin');
        if (motorBlock) {
            const in1 = motorBlock.getFieldValue('IN1') || '3';
            const in2 = motorBlock.getFieldValue('IN2') || '4';
            const ena = motorBlock.getFieldValue('ENA') || '5';
//            const in1 = this.getPinFromBlock(block, 'IN1');
//            const in2 = this.getPinFromBlock(block, 'IN2');
//            const ena = this.getPinFromBlock(block, 'ENA');
            return [`int L298N_IN1 = {in1}; \n  int L298N_IN2 = {in2}; \n int L298N_ENA = {ena};`];
        }
        return '';
    }

    initializeL298NDualBegin = (block) => {
        const in1 = this.getPinFromBlock(block, 'IN1');
        const in2 = this.getPinFromBlock(block, 'IN2');
        const ena = this.getPinFromBlock(block, 'ENA');
        const in3 = this.getPinFromBlock(block, 'IN3');
        const in4 = this.getPinFromBlock(block, 'IN4');
        const enb = this.getPinFromBlock(block, 'ENB');
        return `int L298N_IN1 = {in1}, L298N_IN2 = {in2}, L298N_ENA = {ena}, int L298N_IN3 = {in3} , L298N_IN4 = {in4}, L298N_ENB = {enb};`;
    }

    initializeServo = (workspace) => {
        const servoBlock = workspace?.getAllBlocks(false)
            .find(b => b.type === 'motor_servo');
        if (servoBlock) {
            const pin = servoBlock.getFieldValue('PIN') || '9';
            return [`servo.attach(${pin});`];
        }
        return [];
    }
}