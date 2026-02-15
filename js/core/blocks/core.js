// Кастомные блоки для Arduino с яркими цветами и русскими названиями
// Базовые блоки

// Режим отображения блоков (true - русский, false - английский)
let simpleMode = localStorage.getItem('simpleMode') !== 'false';

// Функция для получения текста в зависимости от режима
function getBlockText(russian, english) {
    return simpleMode ? russian : english;
}

// Функция переключения режима
function toggleSimpleMode() {
    simpleMode = !simpleMode;
    localStorage.setItem('simpleMode', simpleMode);

    if (window.UIManager) {
        window.UIManager.showNotification(simpleMode ? 'Режим: Простой 🟰' : 'Режим: Обычный 🔤');
    }
    setTimeout(() => location.reload(), 500);
}

// Базовые блоки Arduino
Blockly.Blocks['arduino_setup'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("⚙️ Настройка", "⚙️ Setup"));
        this.appendStatementInput("SETUP_CODE")
            .setCheck(null);
        this.setColour(0);
        this.setTooltip(getBlockText("Функция setup() - выполняется один раз при старте", "Function setup() - runs once at startup"));
        this.setHelpUrl("");
    }
};

Blockly.Blocks['arduino_loop'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🔄 Программа", "🔄 Loop"));
        this.appendStatementInput("LOOP_CODE")
            .setCheck(null);
        this.setColour(0);
        this.setTooltip(getBlockText("Функция loop() - выполняется постоянно в цикле", "Function loop() - runs continuously in loop"));
        this.setHelpUrl("");
    }
};

// Блок для сброса платы
Blockly.Blocks['system_reset'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(getBlockText("🔄 Сброс платы", "🔄 Reset Board"));
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(0);
        this.setTooltip(getBlockText("Перезагрузить Arduino", "Reset Arduino board"));
    }
};

// Блок информации о плате
Blockly.Blocks['board_info_display'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("📋 Информация о плате");
        this.setOutput(true, "String");
        this.setColour(0);
        this.setTooltip("Показать информацию о текущей плате");
    }
};

// Экспортируем функции
if (typeof window !== 'undefined') {
    window.toggleSimpleMode = toggleSimpleMode;
    window.getBlockText = getBlockText;
}