// Блоки для звука

Blockly.Blocks['buzzer_beep'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🔊 Зуммер", "🔊 Buzzer"))
            .appendField("PIN")
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN")
            .appendField(getBlockText("частота", "frequency"))
            .appendField(new Blockly.FieldNumber(1000, 31, 15000, 1), "FREQUENCY")
            .appendField(getBlockText("длительность", "duration"))
            .appendField(new Blockly.FieldNumber(1000, 0, 60000, 1), "DURATION");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Издать звук зуммером", "Make sound with buzzer"));
    }
};

Blockly.Blocks['buzzer_note'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎵 Нота", "🎵 Note"))
            .appendField(getBlockText("Пин", "Pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN")
            .appendField(getBlockText("Нота", "Note"))
            .appendField(new Blockly.FieldDropdown([
                [getBlockText("До (C4)", "C4"), "262"], [getBlockText("До# (C#4)", "C#4"), "277"], [getBlockText("Ре (D4)", "D4"), "294"],
                [getBlockText("Ре# (D#4)", "D#4"), "311"], [getBlockText("Ми (E4)", "E4"), "330"], [getBlockText("Фа (F4)", "F4"), "349"],
                [getBlockText("Фа# (F#4)", "F#4"), "370"], [getBlockText("Соль (G4)", "G4"), "392"], [getBlockText("Соль# (G#4)", "G#4"), "415"],
                [getBlockText("Ля (A4)", "A4"), "440"], [getBlockText("Ля# (A#4)", "A#4"), "466"], [getBlockText("Си (B4)", "B4"), "494"],
                [getBlockText("До (C5)", "C5"), "523"], [getBlockText("До# (C#5)", "C#5"), "554"], [getBlockText("Ре (D5)", "D5"), "587"],
                [getBlockText("Ре# (D#5)", "D#5"), "622"], [getBlockText("Ми (E5)", "E5"), "659"], [getBlockText("Фа (F5)", "F5"), "698"],
                [getBlockText("Фа# (F#5)", "F#5"), "740"], [getBlockText("Соль (G5)", "G5"), "784"], [getBlockText("Соль# (G#5)", "G#5"), "831"],
                [getBlockText("Ля (A5)", "A5"), "880"], [getBlockText("Ля# (A#5)", "A#5"), "932"], [getBlockText("Си (B5)", "B5"), "988"]
            ]), "NOTE");
        this.appendValueInput("DURATION")
            .setCheck("Number")
            .appendField(getBlockText("Длительность (мс)", "Duration (ms)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Воспроизведение ноты на зуммере", "Play note on buzzer"));
    }
};

Blockly.Blocks['buzzer_melody'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎵 Мелодия", "🎵 Melody"))
            .appendField(getBlockText("Пин", "Pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.appendValueInput("NOTES")
            .setCheck("Array")
            .appendField(getBlockText("Ноты (массив частот)", "Notes (frequency array)"));
        this.appendValueInput("DURATIONS")
            .setCheck("Array")
            .appendField(getBlockText("Длительности (массив мс)", "Durations (ms array)"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Воспроизведение мелодии на зуммере", "Play melody on buzzer"));
    }
};

Blockly.Blocks['buzzer_stop'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🎵 Остановить звук", "🎵 Stop Sound"))
            .appendField(getBlockText("Пин", "Pin"))
            .appendField(new Blockly.FieldDropdown(() => getPinMenu('digital')), "PIN");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip(getBlockText("Остановка воспроизведения звука на зуммере", "Stop sound on buzzer"));
    }
};