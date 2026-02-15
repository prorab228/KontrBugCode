// Базовый класс парсера
class BaseParser {
    constructor() {
        // methodMap будет определен в дочерних классах
        this.methodMap = {};
    }

    // Проверяем, поддерживается ли блок по его типу
    supports(blockType) {
        return blockType in this.methodMap;
    }

    // Получаем метод для парсинга блока
    getParseMethod(blockType) {
        return this.methodMap[blockType];
    }

    // Общие утилитные методы
    parseExpression(block, parser) {
        return block ? parser.parseExpression(block) : '0';
    }

    getPinFromBlock(block, fieldName, defaultValue = '0') {
        return block.getFieldValue(fieldName) || defaultValue;
    }

    cleanVariableName(name) {
        if (!name) return 'var';
        let cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[0-9]/.test(cleaned)) cleaned = '_' + cleaned;
        if (!cleaned || cleaned === '_') cleaned = 'var';
        return cleaned;
    }
}