// coreArduinoProvider.js - с правильной инициализацией
class CoreArduinoProvider extends SuggestionProvider {
    constructor() {
        super();
        // Сначала инициализируем methodsByObject
        this.methodsByObject = {
            'String': [],
            'Serial': []
        };
        // Затем настраиваем предложения
        this.setupCoreSuggestions();
    }

    setupCoreSuggestions() {
        // Основные функции Arduino
        const functions = [
            ['pinMode', 'pinMode(pin, mode)', 'pinMode()', 'function', 'функция', -1],
            ['digitalWrite', 'digitalWrite(pin, value)', 'digitalWrite()', 'function', 'функция', -1],
            ['digitalRead', 'digitalRead(pin)', 'digitalRead()', 'function', 'функция', -1],
            ['analogRead', 'analogRead(pin)', 'analogRead()', 'function', 'функция', -1],
            ['analogWrite', 'analogWrite(pin, value)', 'analogWrite()', 'function', 'функция', -1],
            ['delay', 'delay(ms)', 'delay()', 'function', 'функция', -1],
            ['millis', 'millis()', 'millis()', 'function', 'функция', 0],
            ['micros', 'micros()', 'micros()', 'function', 'функция', 0],
            ['random', 'random(max) / random(min, max)', 'random()', 'function', 'функция', -1],
            ['map', 'map(value, fromLow, fromHigh, toLow, toHigh)', 'map()', 'function', 'функция', -1],
            ['constrain', 'constrain(x, a, b)', 'constrain()', 'function', 'функция', -1],
            ['abs', 'abs(x)', 'abs()', 'function', 'функция', -1],
            ['min', 'min(x, y)', 'min()', 'function', 'функция', -1],
            ['max', 'max(x, y)', 'max()', 'function', 'функция', -1]
        ];

        // Ключевые слова
        const keywords = [
            ['include', 'include', 'include ', 'keyword', 'ключ. слово', 0],
            ['void', 'void', 'void ', 'keyword', 'ключ. слово', 0],
            ['if', 'if', 'if ()', 'keyword', 'ключ. слово', -1],
            ['else', 'else', 'else ', 'keyword', 'ключ. слово', 0],
            ['for', 'for', 'for ()', 'keyword', 'ключ. слово', -1],
            ['while', 'while', 'while ()', 'keyword', 'ключ. слово', -1],
            ['return', 'return', 'return ', 'keyword', 'ключ. слово', 0],
            ['true', 'true', 'true', 'constant', 'константа', 0],
            ['false', 'false', 'false', 'constant', 'константа', 0],
            ['HIGH', 'HIGH', 'HIGH', 'constant', 'константа', 0],
            ['LOW', 'LOW', 'LOW', 'constant', 'константа', 0],
            ['INPUT', 'INPUT', 'INPUT', 'constant', 'константа', 0],
            ['OUTPUT', 'OUTPUT', 'OUTPUT', 'constant', 'константа', 0],
            ['INPUT_PULLUP', 'INPUT_PULLUP', 'INPUT_PULLUP', 'constant', 'константа', 0]
        ];

        // Типы данных
        const types = [
            ['int', 'int', 'int ', 'type', 'тип', 0],
            ['float', 'float', 'float ', 'type', 'тип', 0],
            ['boolean', 'boolean', 'boolean ', 'type', 'тип', 0],
            ['byte', 'byte', 'byte ', 'type', 'тип', 0],
            ['char', 'char', 'char ', 'type', 'тип', 0],
            ['String', 'String', 'String ', 'type', 'тип', 0],
            ['long', 'long', 'long ', 'type', 'тип', 0]
        ];

        // Глобальные объекты Arduino
        const globalObjects = [
            ['Serial', 'Serial', 'Serial', 'global_object', 'объект Serial', 0]
        ];

        functions.forEach(func => this.addSuggestion(...func));
        keywords.forEach(keyword => this.addSuggestion(...keyword));
        types.forEach(type => this.addSuggestion(...type));
        globalObjects.forEach(obj => this.addSuggestion(...obj));

        // Добавляем методы для встроенных классов
        this.addStringMethods();
        this.addSerialMethods();
    }

    addStringMethods() {
        const stringMethods = [
            ['charAt', 'charAt(index)', 'charAt()', 'string_method', 'метод String', -1],
            ['compareTo', 'compareTo(string)', 'compareTo()', 'string_method', 'метод String', -1],
            ['concat', 'concat(string)', 'concat()', 'string_method', 'метод String', -1],
            ['endsWith', 'endsWith(suffix)', 'endsWith()', 'string_method', 'метод String', -1],
            ['equals', 'equals(string)', 'equals()', 'string_method', 'метод String', -1],
            ['equalsIgnoreCase', 'equalsIgnoreCase(string)', 'equalsIgnoreCase()', 'string_method', 'метод String', -1],
            ['indexOf', 'indexOf(val) / indexOf(val, from)', 'indexOf()', 'string_method', 'метод String', -1],
            ['lastIndexOf', 'lastIndexOf(val) / lastIndexOf(val, from)', 'lastIndexOf()', 'string_method', 'метод String', -1],
            ['length', 'length()', 'length()', 'string_method', 'метод String', 0],
            ['replace', 'replace(substring, newString)', 'replace()', 'string_method', 'метод String', -1],
            ['startsWith', 'startsWith(prefix)', 'startsWith()', 'string_method', 'метод String', -1],
            ['substring', 'substring(from) / substring(from, to)', 'substring()', 'string_method', 'метод String', -1],
            ['toInt', 'toInt()', 'toInt()', 'string_method', 'метод String', 0],
            ['toFloat', 'toFloat()', 'toFloat()', 'string_method', 'метод String', 0],
            ['toDouble', 'toDouble()', 'toDouble()', 'string_method', 'метод String', 0],
            ['toLowerCase', 'toLowerCase()', 'toLowerCase()', 'string_method', 'метод String', 0],
            ['toUpperCase', 'toUpperCase()', 'toUpperCase()', 'string_method', 'метод String', 0],
            ['trim', 'trim()', 'trim()', 'string_method', 'метод String', 0],
            ['c_str', 'c_str()', 'c_str()', 'string_method', 'метод String', 0]
        ];

        stringMethods.forEach(method => {
            // Добавляем с точкой для поиска
            this.addSuggestion(`.${method[0]}`, method[1], method[2], method[3], method[4], method[5]);
            // Сохраняем для быстрого доступа
            this.methodsByObject.String.push({
                matchText: `.${method[0]}`,
                displayText: method[1],
                insertText: method[2],
                type: method[3],
                typeLabel: method[4],
                cursorOffset: method[5]
            });
        });
    }

    addSerialMethods() {
        const serialMethods = [
            ['begin', 'begin(speed)', 'begin()', 'serial_method', 'метод Serial', -1],
            ['print', 'print(data)', 'print()', 'serial_method', 'метод Serial', -1],
            ['println', 'println(data)', 'println()', 'serial_method', 'метод Serial', -1],
            ['available', 'available()', 'available()', 'serial_method', 'метод Serial', 0],
            ['read', 'read()', 'read()', 'serial_method', 'метод Serial', 0],
            ['readString', 'readString()', 'readString()', 'serial_method', 'метод Serial', 0],
            ['readBytes', 'readBytes(buffer, length)', 'readBytes()', 'serial_method', 'метод Serial', -1],
            ['find', 'find(target)', 'find()', 'serial_method', 'метод Serial', -1],
            ['findUntil', 'findUntil(target, terminal)', 'findUntil()', 'serial_method', 'метод Serial', -1],
            ['flush', 'flush()', 'flush()', 'serial_method', 'метод Serial', 0],
            ['write', 'write(data)', 'write()', 'serial_method', 'метод Serial', -1],
            ['setTimeout', 'setTimeout(time)', 'setTimeout()', 'serial_method', 'метод Serial', -1]
        ];

        serialMethods.forEach(method => {
            // Добавляем с точкой для поиска
            this.addSuggestion(`.${method[0]}`, method[1], method[2], method[3], method[4], method[5]);
            // Сохраняем для быстрого доступа
            this.methodsByObject.Serial.push({
                matchText: `.${method[0]}`,
                displayText: method[1],
                insertText: method[2],
                type: method[3],
                typeLabel: method[4],
                cursorOffset: method[5]
            });
        });
    }

    // Исправленный метод: получение методов для объектов
    getMethodSuggestions(objectName, methodPart) {
        console.log(`CoreArduinoProvider: поиск методов для ${objectName}.${methodPart}`);

        if (this.methodsByObject && this.methodsByObject[objectName]) {
            const methods = this.methodsByObject[objectName].filter(method =>
                method.matchText.toLowerCase().includes(`.${methodPart.toLowerCase()}`)
            );
            console.log(`Найдено методов ${objectName}:`, methods.length);
            return methods;
        }

        console.log(`Методы для ${objectName} не найдены`);
        return [];
    }

    // Проверка, является ли объект встроенным
    isBuiltInObject(objectName) {
        const result = ['String', 'Serial'].includes(objectName);
        console.log(`isBuiltInObject(${objectName}) = ${result}`);
        return result;
    }
}