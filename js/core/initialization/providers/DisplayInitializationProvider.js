class DisplayInitializationProvider extends BaseInitializationProvider {
    constructor() {
        super();

        this.initializationMap = {
            'display_oled_text': this.initializeOLED,
            'display_oled_clear': this.initializeOLED
        };
    }

    initializeOLED = (workspace) => {
        return [
            'if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {',
            '  Serial.println(F("SSD1306 allocation failed"));',
            '  for(;;);',
            '}',
            'display.clearDisplay();',
            'display.setTextSize(1);',
            'display.setTextColor(SSD1306_WHITE);'
        ];
    }
}