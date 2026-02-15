class MotorLibraryProvider extends BaseLibraryProvider {
    constructor() {
        super();

        this.libraryMap = {
            'motor_servo': {
                includes: ['#include <Servo.h>'],
                declarations: ['Servo servo;']
            },
            'l298n_begin': {
                declarations: [
                    'int L298N_IN1, L298N_IN2, L298N_ENA;'
                ]
            },
            'l298n_dual_begin': {
                declarations: [
                    'int L298N_IN1, L298N_IN2, L298N_ENA;',
                    'int L298N_IN3, L298N_IN4, L298N_ENB;'
                ]
            }
        };
    }
}