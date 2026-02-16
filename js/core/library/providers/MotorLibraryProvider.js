class MotorLibraryProvider extends BaseLibraryProvider {
    constructor() {
        super();

        this.libraryMap = {
            'motor_servo': {
                includes: ['#include <Servo.h>'],
                declarations: ['Servo servo;']
            },
            'l298n_begin':{
                includes: [],
                declarations: []
            },
            'l298n_dual_begin':{
                includes: [],
                declarations: []
            }
        };


    }



    getDynamicConfig(blockType, workspace) {
        const dynamicConfigs = {
            'l298n_begin': {
                includes: [],
                dynamicDeclarations: [
                    (block) => {
                        const Block = workspace?.getAllBlocks(false)
                            .find(b => b.type === 'l298n_begin');
                        if (Block) {
                            const in1 = Block.getFieldValue('IN1') || '3';
                            const in2 = Block.getFieldValue('IN2') || '4';
                            const ena = Block.getFieldValue('ENA') || '5';
                //            const in1 = this.getPinFromBlock(block, 'IN1');
                //            const in2 = this.getPinFromBlock(block, 'IN2');
                //            const ena = this.getPinFromBlock(block, 'ENA');
                            return `int L298N_IN1 = ${in1};\nint L298N_IN2 = ${in2};\nint L298N_ENA = ${ena};`;
                        }
                        return 'f34rgfvrgfrg3';
                    }
                ]
            },
            'l298n_dual_begin': {
                includes: [],
                dynamicDeclarations: [
                    (block) => {
                        const Block = workspace?.getAllBlocks(false)
                            .find(b => b.type === 'l298n_dual_begin');
                        if (Block) {
                            const in1 = Block.getFieldValue('IN1') || '3';
                            const in2 = Block.getFieldValue('IN2') || '4';
                            const ena = Block.getFieldValue('ENA') || '5';
                            const in3 = Block.getFieldValue('IN3') || '3';
                            const in4 = Block.getFieldValue('IN4') || '4';
                            const enb = Block.getFieldValue('ENB') || '5';
                //            const in1 = this.getPinFromBlock(block, 'IN1');
                //            const in2 = this.getPinFromBlock(block, 'IN2');
                //            const ena = this.getPinFromBlock(block, 'ENA');
                            return `int L298N_IN1 = ${in1};\nint L298N_IN2 = ${in2};\nint L298N_ENA = ${ena};\nint L298N_IN3 = ${in3};\nint L298N_IN4 = ${in4};\nint L298N_ENB = ${enb};`;
                        }
                        return 'f34rgfvrgfrg3';
                    }
                ]
            }

        };

        return dynamicConfigs[blockType];
    }
}