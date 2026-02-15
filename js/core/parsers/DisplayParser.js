class DisplayParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'display_oled_text': this.parseOLEDText,
            'display_oled_clear': this.parseOLEDClear,
            'lcd_i2c_begin': this.parseLcdI2CBegin,
            'lcd_spi_begin': this.parseLcdSpiBegin,
            'lcd_print': this.parseLcdPrint,
            'lcd_clear': this.parseLcdClear,
            'lcd_backlight': this.parseLcdBacklight,
            'rgb_led_common_cathode': this.parseRgbLedCommonCathode,
            'rgb_led_common_anode': this.parseRgbLedCommonAnode,
            'neopixel_begin': this.parseNeoPixelBegin,
            'neopixel_set_color': this.parseNeoPixelSetColor,
            'neopixel_show': this.parseNeoPixelShow,
            'neopixel_clear': this.parseNeoPixelClear
        };
    }

    parseOLEDText = (block, parser) => {
        try {
            const textBlock = block.getInputTargetBlock('TEXT');
            const xBlock = block.getInputTargetBlock('X');
            const yBlock = block.getInputTargetBlock('Y');
            const text = textBlock ? parser.parseExpression(textBlock) : '""';
            const x = xBlock ? parser.parseExpression(xBlock) : '0';
            const y = yBlock ? parser.parseExpression(yBlock) : '0';
            return `display.setCursor(${x}, ${y});\n  display.print(${text});\n  display.display();`;
        } catch (error) {
            return '// Ошибка парсинга OLED дисплея';
        }
    }

    parseOLEDClear = () => {
        return 'display.clearDisplay();\n  display.display();';
    }

    parseLcdI2CBegin = (block, parser) => {
        const address = block.getFieldValue('ADDRESS') || '0x27';
        return `lcd.init();\n  lcd.backlight();\n  // I2C адрес: ${address}`;
    }

    parseLcdSpiBegin = (block, parser) => {
        const rs = this.getPinFromBlock(block, 'RS');
        const e = this.getPinFromBlock(block, 'E');
        const d4 = this.getPinFromBlock(block, 'D4');
        const d5 = this.getPinFromBlock(block, 'D5');
        const d6 = this.getPinFromBlock(block, 'D6');
        const d7 = this.getPinFromBlock(block, 'D7');
        return `LiquidCrystal lcd(${rs}, ${e}, ${d4}, ${d5}, ${d6}, ${d7});\n  lcd.begin(16, 2);`;
    }

    parseLcdPrint = (block, parser) => {
        const row = block.getFieldValue('ROW') || '0';
        const col = block.getFieldValue('COL') || '0';
        const textBlock = block.getInputTargetBlock('TEXT');
        const text = textBlock ? parser.parseExpression(textBlock) : '""';
        return `lcd.setCursor(${col}, ${row});\n  lcd.print(${text});`;
    }

    parseLcdClear = () => {
        return 'lcd.clear();';
    }

    parseLcdBacklight = (block, parser) => {
        const state = block.getFieldValue('STATE');
        return state === 'ON' ? 'lcd.backlight();' : 'lcd.noBacklight();';
    }

    parseRgbLedCommonCathode = (block, parser) => {
        const rPin = this.getPinFromBlock(block, 'R_PIN');
        const gPin = this.getPinFromBlock(block, 'G_PIN');
        const bPin = this.getPinFromBlock(block, 'B_PIN');
        const redBlock = block.getInputTargetBlock('RED');
        const greenBlock = block.getInputTargetBlock('GREEN');
        const blueBlock = block.getInputTargetBlock('BLUE');
        const red = redBlock ? parser.parseExpression(redBlock) : '0';
        const green = greenBlock ? parser.parseExpression(greenBlock) : '0';
        const blue = blueBlock ? parser.parseExpression(blueBlock) : '0';
        return `analogWrite(${rPin}, ${red});\n  analogWrite(${gPin}, ${green});\n  analogWrite(${bPin}, ${blue});`;
    }

    parseRgbLedCommonAnode = (block, parser) => {
        const rPin = this.getPinFromBlock(block, 'R_PIN');
        const gPin = this.getPinFromBlock(block, 'G_PIN');
        const bPin = this.getPinFromBlock(block, 'B_PIN');
        const redBlock = block.getInputTargetBlock('RED');
        const greenBlock = block.getInputTargetBlock('GREEN');
        const blueBlock = block.getInputTargetBlock('BLUE');
        const red = redBlock ? parser.parseExpression(redBlock) : '0';
        const green = greenBlock ? parser.parseExpression(greenBlock) : '0';
        const blue = blueBlock ? parser.parseExpression(blueBlock) : '0';
        return `analogWrite(${rPin}, 255 - ${red});\n  analogWrite(${gPin}, 255 - ${green});\n  analogWrite(${bPin}, 255 - ${blue});`;
    }

    parseNeoPixelBegin = (block, parser) => {
        const pin = this.getPinFromBlock(block, 'PIN');
        const count = block.getFieldValue('COUNT') || '1';
        return `Adafruit_NeoPixel strip = Adafruit_NeoPixel(${count}, ${pin}, NEO_GRB + NEO_KHZ800);\n  strip.begin();`;
    }

    parseNeoPixelSetColor = (block, parser) => {
        const pixel = block.getFieldValue('PIXEL') || '0';
        const redBlock = block.getInputTargetBlock('RED');
        const greenBlock = block.getInputTargetBlock('GREEN');
        const blueBlock = block.getInputTargetBlock('BLUE');
        const red = redBlock ? parser.parseExpression(redBlock) : '0';
        const green = greenBlock ? parser.parseExpression(greenBlock) : '0';
        const blue = blueBlock ? parser.parseExpression(blueBlock) : '0';
        return `strip.setPixelColor(${pixel}, strip.Color(${red}, ${green}, ${blue}));`;
    }

    parseNeoPixelShow = () => {
        return 'strip.show();';
    }

    parseNeoPixelClear = () => {
        return 'strip.clear();\n  strip.show();';
    }

    getSensorInitialization = (block) => {
        if (block.type.startsWith('display_oled_')) {
            return `if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n    Serial.println(F("SSD1306 allocation failed"));\n    for(;;);\n  }\n  display.clearDisplay();\n  display.setTextSize(1);\n  display.setTextColor(SSD1306_WHITE);`;
        }
        return null;
    }
}