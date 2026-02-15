class SpecialHelperProvider extends BaseHelperProvider {
    constructor() {
        super();

        this.helperMap = {
            'ir_transmitter_begin': this.generateIRHelper,
            'ir_transmitter_send': this.generateIRHelper,
            'ir_receiver_begin': this.generateIRHelper,
            'ir_receiver_read': this.generateIRHelper,
            'buzzer_melody': this.generateBuzzerMelodyHelper
        };
    }

    generateIRHelper = () => {
        return `
void setupIR() {
  // Инициализация IR
}

unsigned long readIRCode() {
  if (irRecv.decode(&results)) {
    unsigned long code = results.value;
    irRecv.resume();
    return code;
  }
  return 0;
}
`;
    }

    generateBuzzerMelodyHelper = () => {
        return `
// Buzzer melody helper
void playMelody(int pin, int notes[], int durations[], int length) {
  for (int i = 0; i < length; i++) {
    tone(pin, notes[i], durations[i]);
    delay(durations[i] * 1.3);
    noTone(pin);
  }
}
`;
    }
}