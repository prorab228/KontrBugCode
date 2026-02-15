class ArrayParser extends BaseParser {
    constructor() {
        super();

        this.methodMap = {
            'array_create': this.parseArrayCreate,
            'array_output': this.parseArrayOutput,
            'array_set': this.parseArraySet,
            'array_get': this.parseArrayGet,
            'array_length': this.parseArrayLength,
            'array_find': this.parseArrayFind,
            'array_fill': this.parseArrayFill,
            'array_copy': this.parseArrayCopy,
            'array_sum': this.parseArraySum,
            'array_average': this.parseArrayAverage,
            'array_min': this.parseArrayMin,
            'array_max': this.parseArrayMax,
            'array_from_string': this.parseArrayFromString,
            'array_join': this.parseArrayJoin,
            'array_reverse': this.parseArrayReverse,
            'array_slice': this.parseArraySlice,
            'variables_declare_array': this.parseVariableDeclareArray,
            'array_literal': this.parseArrayLiteral
        };
    }

    parseArrayCreate = (block, parser) => {
        try {
            const varName = this.cleanVariableName(block.getFieldValue('NAME'));
            const type = block.getFieldValue('TYPE');
            const size = block.getFieldValue('SIZE') || '5';

            let values = [];
            for (let i = 0; i < parseInt(size); i++) {
                const valueBlock = block.getInputTargetBlock(`VALUE_${i}`);
                if (valueBlock) {
                    values.push(parser.parseExpression(valueBlock));
                } else {
                    values.push(this.getDefaultValue(type));
                }
            }

            if (values.length > 0) {
                return `${type} ${varName}[${size}] = {${values.join(', ')}};`;
            } else {
                return `${type} ${varName}[${size}];`;
            }
        } catch (error) {
            console.error('Error parsing array_create1:', error);
            return `// Ошибка создания массива`;
        }
    }

    parseArrayOutput = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        return varName;
    }

    parseArrayGetAll = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        return varName;
    }

    parseMelodyArray = (block, parser) => {
        try {
            let values = [];
            for (let i = 0; i < 4; i++) {
                const valueBlock = block.getInputTargetBlock(`NOTE_${i}`);
                if (valueBlock) {
                    values.push(parser.parseExpression(valueBlock));
                } else {
                    // Значения по умолчанию для мелодии
                    const defaultNotes = [262, 294, 330, 349]; // C4, D4, E4, F4
                    values.push(defaultNotes[i] || '0');
                }
            }
            return `{${values.join(', ')}}`;
        } catch (error) {
            console.error('Error parsing melody_array:', error);
            return '{0, 0, 0, 0}';
        }
    }

    parseArraySet = (block, parser) => {
        try {
            const varName = this.cleanVariableName(block.getFieldValue('NAME'));
            const indexBlock = block.getInputTargetBlock('INDEX');
            const valueBlock = block.getInputTargetBlock('VALUE');

            if (!indexBlock || !valueBlock) {
                return `// Ошибка: не указан индекс или значение`;
            }

            const index = parser.parseExpression(indexBlock);
            const value = parser.parseExpression(valueBlock);

            return `${varName}[${index}] = ${value};`;
        } catch (error) {
            console.error('Error parsing array_set:', error);
            return `// Ошибка установки элемента массива`;
        }
    }

    parseArrayGet = (block, parser) => {
        try {
            const varName = this.cleanVariableName(block.getFieldValue('NAME'));
            const indexBlock = block.getInputTargetBlock('INDEX');

            if (!indexBlock) {
                return `${varName}[0]`;
            }

            const index = parser.parseExpression(indexBlock);
            return `${varName}[${index}]`;
        } catch (error) {
            console.error('Error parsing array_get:', error);
            return '0';
        }
    }

    parseArrayLength = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        return `sizeof(${varName}) / sizeof(${varName}[0])`;
    }

    parseArrayFind = (block, parser) => {
        try {
            const varName = this.cleanVariableName(block.getFieldValue('NAME'));
            const valueBlock = block.getInputTargetBlock('VALUE');

            if (!valueBlock) {
                return '-1';
            }

            const value = parser.parseExpression(valueBlock);
            const size = `sizeof(${varName}) / sizeof(${varName}[0])`;

            return `findInArray(${varName}, ${size}, ${value})`;
        } catch (error) {
            console.error('Error parsing array_find:', error);
            return '-1';
        }
    }

    parseArrayFill = (block, parser) => {
        try {
            const varName = this.cleanVariableName(block.getFieldValue('NAME'));
            const valueBlock = block.getInputTargetBlock('VALUE');

            if (!valueBlock) {
                return `// Ошибка: не указано значение`;
            }

            const value = parser.parseExpression(valueBlock);
            const size = `sizeof(${varName}) / sizeof(${varName}[0])`;

            return `fillArray(${varName}, ${size}, ${value});`;
        } catch (error) {
            console.error('Error parsing array_fill:', error);
            return `// Ошибка заполнения массива`;
        }
    }

    parseArrayCopy = (block) => {
        try {
            const source = this.cleanVariableName(block.getFieldValue('SOURCE'));
            const dest = this.cleanVariableName(block.getFieldValue('DEST'));

            const sourceSize = `sizeof(${source}) / sizeof(${source}[0])`;
            const destSize = `sizeof(${dest}) / sizeof(${dest}[0])`;

            return `copyArray(${source}, ${dest}, min(${sourceSize}, ${destSize}));`;
        } catch (error) {
            console.error('Error parsing array_copy:', error);
            return `// Ошибка копирования массива`;
        }
    }

    parseArraySum = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        const size = `sizeof(${varName}) / sizeof(${varName}[0])`;
        return `arraySum(${varName}, ${size})`;
    }

    parseArrayAverage = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        const size = `sizeof(${varName}) / sizeof(${varName}[0])`;
        return `arrayAverage(${varName}, ${size})`;
    }

    parseArrayMin = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        const size = `sizeof(${varName}) / sizeof(${varName}[0])`;
        return `arrayMin(${varName}, ${size})`;
    }

    parseArrayMax = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        const size = `sizeof(${varName}) / sizeof(${varName}[0])`;
        return `arrayMax(${varName}, ${size})`;
    }

    parseArrayFromString = (block, parser) => {
        try {
            const varName = this.cleanVariableName(block.getFieldValue('NAME'));
            const delimiter = block.getFieldValue('DELIMITER') || ',';
            const stringBlock = block.getInputTargetBlock('STRING');

            if (!stringBlock) {
                return `// Ошибка: не указана строка`;
            }

            const string = parser.parseExpression(stringBlock);
            return `stringToArray(${string}, "${delimiter}", ${varName});`;
        } catch (error) {
            console.error('Error parsing array_from_string:', error);
            return `// Ошибка преобразования строки в массив`;
        }
    }

    parseArrayJoin = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        const delimiter = block.getFieldValue('DELIMITER') || ', ';
        const size = `sizeof(${varName}) / sizeof(${varName}[0])`;

        return `arrayJoin(${varName}, ${size}, "${delimiter}")`;
    }

    parseArrayReverse = (block) => {
        const varName = this.cleanVariableName(block.getFieldValue('NAME'));
        const size = `sizeof(${varName}) / sizeof(${varName}[0])`;

        return `reverseArray(${varName}, ${size});`;
    }

    parseArraySlice = (block) => {
        try {
            const sourceName = this.cleanVariableName(block.getFieldValue('NAME'));
            const resultName = this.cleanVariableName(block.getFieldValue('RESULT'));
            const start = block.getFieldValue('START') || '0';
            const end = block.getFieldValue('END') || '5';

            return `sliceArray(${sourceName}, ${resultName}, ${start}, ${end});`;
        } catch (error) {
            console.error('Error parsing array_slice:', error);
            return `// Ошибка создания среза массива`;
        }
    }

    parseVariableDeclareArray = (block) => {
        try {
            const varName = this.cleanVariableName(block.getFieldValue('VAR'));
            const type = block.getFieldValue('TYPE');
            const size = block.getFieldValue('SIZE') || '10';

            return `${type} ${varName}[${size}];`;
        } catch (error) {
            console.error('Error parsing variables_declare_array:', error);
            return `// Ошибка объявления массива`;
        }
    }

    parseArrayLiteral = (block, parser) => {
        try {
            let values = [];

            // Собираем значения только до первого пустого элемента
            let index = 0;
            while (true) {
                const inputName = `VALUE_${index}`;
                const valueBlock = block.getInputTargetBlock(inputName);

                // Если нет блока, прекращаем сбор
                if (!valueBlock) {
                    break;
                }

                // Проверяем, существует ли поле с таким именем
                let fieldExists = false;
                for (let i = 0; i < block.inputList.length; i++) {
                    if (block.inputList[i].name === inputName) {
                        fieldExists = true;
                        break;
                    }
                }

                if (!fieldExists) break;

                // Добавляем значение
                values.push(parser.parseExpression(valueBlock));
                index++;

                // Защита от бесконечного цикла
                if (index > 20) break;
            }

            // Если нет значений, возвращаем пустой массив
            if (values.length === 0) {
                return '{}';
            }

            return `{${values.join(', ')}}`;
        } catch (error) {
            console.error('Error parsing array_literal:', error);
            return '{}';
        }
    }

    getDefaultValue(type) {
        const defaults = {
            'int': '0',
            'float': '0.0',
            'bool': 'false',
            'String': '""',
            'char': "'\\0'"
        };
        return defaults[type] || '0';
    }
}