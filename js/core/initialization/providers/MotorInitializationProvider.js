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