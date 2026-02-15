class DisplayLibraryProvider extends BaseLibraryProvider {
    constructor() {
        super();

        this.libraryMap = {
            'display_oled_text': {
                includes: [
                    '#include <Wire.h>',
                    '#include <Adafruit_GFX.h>',
                    '#include <Adafruit_SSD1306.h>'
                ],
                declarations: ['Adafruit_SSD1306 display(128, 64, &Wire, -1);']
            },
            'display_oled_clear': {
                includes: [
                    '#include <Wire.h>',
                    '#include <Adafruit_GFX.h>',
                    '#include <Adafruit_SSD1306.h>'
                ],
                declarations: ['Adafruit_SSD1306 display(128, 64, &Wire, -1);']
            },
            'lcd_i2c_begin': {
                includes: ['#include <Wire.h>', '#include <LiquidCrystal_I2C.h>']
            },
            'lcd_spi_begin': {
                includes: ['#include <LiquidCrystal.h>']
            },
            'neopixel_begin': {
                includes: ['#include <Adafruit_NeoPixel.h>']
            }
        };
    }

    getDynamicConfig(blockType, workspace) {
        const dynamicConfigs = {
            'lcd_i2c_begin': {
                includes: ['#include <Wire.h>', '#include <LiquidCrystal_I2C.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const Block = workspace?.getAllBlocks(false)
                            .find(b => b.type === 'lcd_i2c_begin');
                        if (Block) {
                            const addr = Block.getFieldValue('ADDRESS') || '0x27';
                            return `LiquidCrystal_I2C lcd(${addr}, 16, 2);`;
                        }
                        return 'LiquidCrystal_I2C lcd(0x27, 16, 2);';
                    }
                ]
            }
        };

        return dynamicConfigs[blockType];
    }
}