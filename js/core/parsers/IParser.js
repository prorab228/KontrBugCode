// Интерфейс парсера
class IParser {
    constructor() {
        this.supportedTypes = [];
    }

    parse(block, parser) {
        throw new Error('Method parse() must be implemented');
    }

    getSensorInitialization(block) {
        return null;
    }
}