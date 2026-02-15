class ParserManager {
    constructor() {
        this.parsers = [];
        this.parserCache = new Map(); // Кэш для быстрого поиска
        this.defaultParser = null;
        this.registerParsers();
    }

    registerParsers() {
        // Создаем и регистрируем парсеры
        const parserInstances = [
            new BasicParser(),
            new SensorParser(),
            new MotorParser(),
            new ESPParser(),
            new DisplayParser(),
            new CommunicationParser(),
            new FunctionParser(),
            new SpecialParser(),
            new ArrayParser()
        ];

        this.parsers = parserInstances;

        // Строим кэш: блок типа -> парсер
        parserInstances.forEach(parser => {
            Object.keys(parser.methodMap).forEach(blockType => {
                this.parserCache.set(blockType, parser);
            });
        });

        // Устанавливаем парсер по умолчанию
        this.defaultParser = new BasicParser();
    }

    // Получаем парсер для типа блока
    getParser(blockType) {
        // Ищем в кэше
        if (this.parserCache.has(blockType)) {
            return this.parserCache.get(blockType);
        }

        return this.defaultParser;
    }

    // Получаем метод парсинга для блока
    getParseMethod(blockType) {
        const parser = this.getParser(blockType);
        if (parser && parser.methodMap[blockType]) {
            return parser.methodMap[blockType].bind(parser);
        }
        return null;
    }

    // Парсим блок
    parseBlock(block, mainParser) {
        const parseMethod = this.getParseMethod(block.type);
        if (parseMethod) {
            return parseMethod(block, mainParser);
        }

        // Если метод не найден, используем дефолтный парсер
        if (this.defaultParser) {
            return `// Блок: ${block.type}`;
        }

        return null;
    }

    // Получаем инициализацию сенсора
    getSensorInitialization(block) {
        const parser = this.getParser(block.type);
        if (parser && parser.getSensorInitialization) {
            return parser.getSensorInitialization(block);
        }
        return null;
    }
}