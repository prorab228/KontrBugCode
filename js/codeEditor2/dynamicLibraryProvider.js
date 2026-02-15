// dynamicLibraryProvider.js - упрощенная версия
class DynamicLibraryProvider extends SuggestionProvider {
    constructor() {
        super();
        this.usedLibraries = new Set();
    }

    updateFromCode(code) {
        this.suggestions = [];
        this.usedLibraries = this.extractUsedLibraries(code);
        this.createSuggestions();
    }

    extractUsedLibraries(code) {
        const libraries = new Set();
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Поиск #include директив
            const includeMatch = trimmedLine.match(/#include\s+[<"]([^>"]+)[>"]/);
            if (includeMatch) {
                let libName = includeMatch[1].replace('.h', '');
                libName = libName.split('/').pop();
                libName = libName.split('\\').pop();
                libraries.add(libName);
            }
        }

        return libraries;
    }

    createSuggestions() {
        // Для каждой библиотеки добавляем базовые предложения
        this.usedLibraries.forEach(libraryName => {
            // Добавляем саму библиотеку как класс
            this.addSuggestion(
                libraryName,
                libraryName,
                libraryName,
                'library_class',
                'библиотека',
                0
            );

            // Добавляем методы для известных библиотек
            this.addLibraryMethods(libraryName);
        });
    }

    addLibraryMethods(libraryName) {
        const libraryMethods = {
            'SoftwareSerial': [
                ['.begin', 'begin(baud)', 'begin()', 'software_serial_method', 'метод SoftwareSerial', -1],
                ['.print', 'print(data)', 'print()', 'software_serial_method', 'метод SoftwareSerial', -1],
                ['.available', 'available()', 'available()', 'software_serial_method', 'метод SoftwareSerial', 0],
                ['.read', 'read()', 'read()', 'software_serial_method', 'метод SoftwareSerial', 0],
                ['.write', 'write(data)', 'write()', 'software_serial_method', 'метод SoftwareSerial', -1]
            ],
            'Servo': [
                ['.attach', 'attach(pin)', 'attach()', 'servo_method', 'метод Servo', -1],
                ['.write', 'write(angle)', 'write()', 'servo_method', 'метод Servo', -1],
                ['.read', 'read()', 'read()', 'servo_method', 'метод Servo', 0]
            ],
            'LiquidCrystal': [
                ['.begin', 'begin(cols, rows)', 'begin()', 'lcd_method', 'метод LCD', -1],
                ['.clear', 'clear()', 'clear()', 'lcd_method', 'метод LCD', 0],
                ['.setCursor', 'setCursor(col, row)', 'setCursor()', 'lcd_method', 'метод LCD', -1],
                ['.print', 'print(text)', 'print()', 'lcd_method', 'метод LCD', -1]
            ]
        };

        const methods = libraryMethods[libraryName];
        if (methods) {
            methods.forEach(method => this.addSuggestion(...method));
        }
    }

    getMethodSuggestions(className, methodPart) {
        // Ищем методы для библиотечных классов
        const allMethods = this.getSuggestions(`.${methodPart}`).filter(s =>
            s.type.includes('_method') &&
            s.typeLabel.includes(className)
        );

        return allMethods;
    }

    isLibraryClass(className) {
        return this.usedLibraries.has(className);
    }
}