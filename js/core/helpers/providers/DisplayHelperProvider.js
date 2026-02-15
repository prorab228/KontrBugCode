class DisplayHelperProvider extends BaseHelperProvider {
     constructor() {
        super();

        this.helperMap = {
            'lcd_spi_begin': this.generateLcdSpiHelper,
            'rgb_led_common_cathode': this.generateRgbLedHelper,
            'rgb_led_common_anode': this.generateRgbLedHelper,
            'neopixel_begin': this.generateNeoPixelHelper
        };
    }

    generateLcdSpiHelper = () => {
        return `
#include <LiquidCrystal.h>
// Пины определяются в блоке инициализацииy
`;
    }

    generateRgbLedHelper = () => {
        return `
// RGB LED helper functions
void setRGBColor(int rPin, int gPin, int bPin, int r, int g, int b) {
  analogWrite(rPin, r);
  analogWrite(gPin, g);
  analogWrite(bPin, b);
}
`;
    }

    generateNeoPixelHelper = () => {
        return `
#include <Adafruit_NeoPixel.h>
// NeoPixel strip object defined in setup
`;
    }
}