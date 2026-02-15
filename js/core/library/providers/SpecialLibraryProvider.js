class SpecialLibraryProvider extends BaseLibraryProvider {
    constructor() {
        super();

        this.libraryMap = {
            'eeprom_write': {
                includes: ['#include <EEPROM.h>']
            },
            'eeprom_read': {
                includes: ['#include <EEPROM.h>']
            },
            'rtc_begin': {
                includes: ['#include <iarduino_RTC.h>']
            },
            'encoder_begin': {
                declarations: [
                    'volatile long encoderValue = 0;',
                    'volatile int encoderCLK = 2;',
                    'volatile int encoderDT = 3;'
                ]
            }
        };
    }

    getDynamicConfig(blockType, workspace) {
        const dynamicConfigs = {
            'rtc_begin': {
                includes: ['#include <iarduino_RTC.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const module = block.getFieldValue('MODULE') || 'DS1302';

                        if (module === 'DS1302') {
                            const rstPin = block.getFieldValue('RST_PIN') || '6';
                            const datPin = block.getFieldValue('DAT_PIN') || '7';
                            const clkPin = block.getFieldValue('CLK_PIN') || '8';
                            return `iarduino_RTC rtc(RTC_DS1302, ${datPin}, ${clkPin}, ${rstPin});`;
                        } else if (module === 'DS1307') {
                            return 'iarduino_RTC rtc(RTC_DS1307);';
                        } else if (module === 'DS3231') {
                            return 'iarduino_RTC rtc(RTC_DS3231);';
                        } else {
                            return 'iarduino_RTC rtc(RTC_DS1302);';
                        }
                    }
                ]
            },
            'encoder_begin': {
                dynamicDeclarations: [
                    (block) => {
                        const clk = block.getFieldValue('CLK') || '2';
                        return `volatile int encoderCLK = ${clk};`;
                    },
                    (block) => {
                        const dt = block.getFieldValue('DT') || '3';
                        return `volatile int encoderDT = ${dt};`;
                    },
                    (block) => {
                        return 'volatile long encoderValue = 0;';
                    }
                ]
            }
        };

        return dynamicConfigs[blockType];
    }
}