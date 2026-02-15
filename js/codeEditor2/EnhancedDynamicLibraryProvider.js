class EnhancedDynamicLibraryProvider extends SuggestionProvider {
    constructor() {
        super();
        this.usedLibraries = new Set();
        this.libraryParser = new LibraryParser();
        this.initialized = false;
        this.libraryMethods = new Map();
        this.availableLibraries = new Set();
        this.includeSuggestions = [];
        this.libraryClasses = new Map(); // Хранит классы библиотек
    }

    async init(projectPath) {
        if (this.initialized) return;

        try {
            await this.libraryParser.init(projectPath);
            this.availableLibraries = new Set(this.libraryParser.getAvailableLibraries());
            this.createIncludeSuggestions();
            this.initialized = true;
            console.log('EnhancedDynamicLibraryProvider initialized with IPC');
            console.log('Available libraries:', Array.from(this.availableLibraries));
        } catch (error) {
            console.warn('Error initializing EnhancedDynamicLibraryProvider:', error);
            this.initialized = true;
        }
    }




    updateFromCode(code) {
        this.suggestions = [];
        const previousLibraries = new Set(this.usedLibraries);
        this.usedLibraries = this.extractUsedLibraries(code);

        // Загружаем методы для новых библиотек
        this.loadNewLibraries(previousLibraries);

        this.createSuggestions();
    }

    extractUsedLibraries(code) {
        const libraries = new Set();
        const lines = code.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            const includeMatch = trimmedLine.match(/#include\s+[<"]([^>"]+)[>"]/);
            if (includeMatch) {
                const includePath = includeMatch[1];
                const libraryName = this.extractLibraryNameFromInclude(includePath);
                if (libraryName && this.availableLibraries.has(libraryName)) {
                    libraries.add(libraryName);
                    console.log(`Detected library usage: ${libraryName} from include ${includePath}`);
                }
            }
        }

        return libraries;
    }

    extractLibraryNameFromInclude(includePath) {
        let fileName = includePath.split('/').pop();
        fileName = fileName.split('\\').pop();
        fileName = fileName.replace('.h', '');

        console.log(`Extracted library name from include: ${fileName}`);
        return fileName;
    }

    async loadNewLibraries(previousLibraries) {
        const newLibraries = new Set([...this.usedLibraries].filter(x => !previousLibraries.has(x)));

        const promises = Array.from(newLibraries).map(async (libraryName) => {
            console.log(`Loading new library: ${libraryName}`);
            await this.parseAndStoreLibrary(libraryName);
        });

        await Promise.all(promises);
    }


    async parseAndStoreLibrary(libraryName) {
        try {
            console.log(`Starting to parse library: ${libraryName}`);
            const libraryInfo = await this.libraryParser.parseLibrary(libraryName);

            if (libraryInfo) {
                console.log(`Library ${libraryName} parsed successfully, classes:`, libraryInfo.classes ? libraryInfo.classes.size : 0);

                // Сохраняем классы библиотеки
                if (libraryInfo.classes) {
                    libraryInfo.classes.forEach((classInfo, className) => {
                        const classKey = `${libraryName}.${className}`;
                        this.libraryClasses.set(classKey, classInfo);

                        console.log(`Adding class ${className} from library ${libraryName}`);

                        // Добавляем класс в подсказки
                        this.addSuggestion(
                            className,
                            `${className} (${libraryName})`,
                            className,
                            'library_class',
                            `класс ${libraryName}`,
                            0
                        );
                    });
                }

                // Сохраняем методы библиотеки
                if (libraryInfo.methods) {
                    libraryInfo.methods.forEach((methods, className) => {
                        if (methods && Array.isArray(methods)) {
                            const classKey = `${libraryName}.${className}`;
                            if (!this.libraryMethods.has(classKey)) {
                                this.libraryMethods.set(classKey, []);
                            }

                            console.log(`Adding ${methods.length} methods for class ${className}`);

                            methods.forEach(method => {
                                if (method && method.matchText) {
                                    // Сохраняем метод с привязкой к классу
                                    this.libraryMethods.get(classKey).push({
                                        ...method,
                                        library: libraryName,
                                        className: className
                                    });

                                    // Добавляем метод в общий пул подсказок
                                    this.addSuggestion(
                                        method.matchText,
                                        method.displayText,
                                        method.insertText,
                                        method.type,
                                        `${method.typeLabel} (${libraryName})`,
                                        method.cursorOffset
                                    );
                                }
                            });
                        }
                    });
                }
            } else {
                console.warn(`No info found for library: ${libraryName}`);
            }
        } catch (error) {
            console.warn(`Error loading library ${libraryName}:`, error);
        }
    }

    createMethodSuggestions(classInfo, libraryInfo) {
        const className = classInfo.name;
        const methods = [];

        classInfo.constructors.forEach((constructor) => {
            // ИСПРАВЛЕНИЕ: Отображаем имена параметров
            const paramList = constructor.parameters.map(p => {
                if (p.name && p.name !== 'param') {
                    return `${p.type} ${p.name}`;
                }
                return p.type;
            }).join(', ');

            const displayText = `${className}(${paramList})`;
            const insertText = `${className}(${constructor.parameters.map((p, i) => `\${${i+1}:${p.name || 'param'}}`).join(', ')})`;

            methods.push({
                matchText: `.${className}`,
                displayText: displayText,
                insertText: insertText,
                type: 'constructor_method',
                typeLabel: `конструктор ${className}`,
                cursorOffset: -1
            });
        });

        classInfo.methods.forEach(method => {
            // ИСПРАВЛЕНИЕ: Отображаем имена параметров
            const paramList = method.parameters.map(p => {
                if (p.name && p.name !== 'param') {
                    return `${p.type} ${p.name}`;
                }
                return p.type;
            }).join(', ');

            const displayText = `${method.name}(${paramList})`;

            // Создаем текст для вставки с плейсхолдерами
            const insertText = `${method.name}(${method.parameters.map((p, i) => `\${${i+1}:${p.name || 'param'}}`).join(', ')})`;
            const cursorOffset = method.parameters.length > 0 ? -1 : 0;

            methods.push({
                matchText: `.${method.name}`,
                displayText: displayText,
                insertText: insertText,
                type: 'library_method',
                typeLabel: `метод ${className}`,
                cursorOffset: cursorOffset
            });
        });

        if (!libraryInfo.methods.has(className)) {
            libraryInfo.methods.set(className, []);
        }

        libraryInfo.methods.get(className).push(...methods);
    }


    createIncludeSuggestions() {
        this.includeSuggestions = [];

        if (!this.availableLibraries || this.availableLibraries.size === 0) {
            console.log('No available libraries for include suggestions');
            return;
        }

        console.log(`Creating include suggestions for ${this.availableLibraries.size} libraries`);

        // ФИЛЬТРУЕМ ПУСТЫЕ И НЕВАЛИДНЫЕ ИМЕНА БИБЛИОТЕК
        const validLibraries = Array.from(this.availableLibraries).filter(libName =>
            libName &&
            libName.trim() !== '' &&
            libName.length > 1 && // исключаем слишком короткие имена
            !libName.startsWith('.') // исключаем скрытые файлы/папки
        );

        console.log(`Filtered to ${validLibraries.length} valid libraries:`, validLibraries);

        validLibraries.forEach(libraryName => {
            // УБЕДИТЕСЬ, ЧТО ИМЯ БИБЛИОТЕКИ НОРМАЛЬНОЕ
            const cleanLibraryName = libraryName.trim();
            if (!cleanLibraryName) return;

            // Подсказка для include с угловыми скобками
            this.includeSuggestions.push({
                matchText: `#include <${cleanLibraryName}`,
                displayText: `#include &lt;${cleanLibraryName}.h&gt;`,
                insertText: `#include <${cleanLibraryName}.h>`,
                type: 'include',
                typeLabel: 'подключение библиотеки',
                cursorOffset: 0
            });

            // Подсказка для include с кавычками
            this.includeSuggestions.push({
                matchText: `#include "${cleanLibraryName}`,
                displayText: `#include "${cleanLibraryName}.h"`,
                insertText: `#include "${cleanLibraryName}.h"`,
                type: 'include',
                typeLabel: 'подключение библиотеки',
                cursorOffset: 0
            });

//            // Подсказка только для имени библиотеки (без #include)
//            this.includeSuggestions.push({
//                matchText: cleanLibraryName,
//                displayText: `#include &lt;${cleanLibraryName}.h&gt;`,
//                insertText: `#include <${cleanLibraryName}.h>`,
//                type: 'include',
//                typeLabel: `подключение библиотеки3${cleanLibraryName}`,
//                cursorOffset: 0
//            });
        });

        // УДАЛЯЕМ ДУБЛИКАТЫ И ПУСТЫЕ ПОДСКАЗКИ
        this.includeSuggestions = this.includeSuggestions.filter(suggestion =>
            suggestion.displayText &&
            suggestion.displayText.trim() !== '' &&
            suggestion.insertText &&
            suggestion.insertText.trim() !== ''
        );

        console.log(`Created ${this.includeSuggestions.length} include suggestions`);
    }


    createSuggestions() {
        // Добавляем подсказки для include
        this.includeSuggestions.forEach(suggestion => {
            this.addSuggestion(
                suggestion.matchText,
                suggestion.displayText,
                suggestion.insertText,
                suggestion.type,
                suggestion.typeLabel,
                suggestion.cursorOffset
            );
        });

        // Методы уже добавлены в parseAndStoreLibrary
    }

    getMethodSuggestions(className, methodPart) {
        console.log(`Searching methods for class: ${className}, method part: ${methodPart}`);

        const allMethods = [];

        // Ищем методы во всех библиотеках для данного класса
        this.libraryMethods.forEach((methods, classKey) => {
            const [libraryName, storedClassName] = classKey.split('.');

            if (storedClassName === className) {
                const matchingMethods = methods.filter(method =>
                    method.matchText.toLowerCase().includes(`.${methodPart.toLowerCase()}`)
                );

                console.log(`Found ${matchingMethods.length} methods in ${libraryName} for class ${className}`);
                allMethods.push(...matchingMethods);
            }
        });

        return allMethods;
    }

    getIncludeSuggestions(currentWord) {
        let searchTerm = currentWord;

        // Извлекаем часть после #include
        if (currentWord.startsWith('#include')) {
            const match = currentWord.match(/#include\s*[<"]?([^<">]*)$/);
            searchTerm = match ? match[1] : '';
        }

        console.log(`Searching include suggestions for: "${searchTerm}"`);
        console.log(`Available suggestions: ${this.includeSuggestions.length}`);

        // ФИЛЬТРУЕМ ПУСТЫЕ И НЕКОРРЕКТНЫЕ ПОДСКАЗКИ
        const validSuggestions = this.includeSuggestions.filter(suggestion => {
            const isValid = suggestion.displayText &&
                           suggestion.displayText.length > 10 && // Минимальная длина
                           !suggestion.displayText.includes('undefined') &&
                           !suggestion.displayText.includes('null');

            if (!isValid) {
                console.warn(`Removing invalid suggestion: ${suggestion.displayText}`);
            }
            return isValid;
        });

        const results = validSuggestions.filter(suggestion => {
            const matches = suggestion.matchText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           suggestion.displayText.toLowerCase().includes(searchTerm.toLowerCase());
            return matches;
        });

        console.log(`Found ${results.length} include suggestions for "${searchTerm}"`);
        return results;
    }

    extractSearchTerm(currentWord) {
        // Извлекаем часть после #include
        const includeMatch = currentWord.match(/#include\s*[<"]?([^<">]*)$/);
        if (includeMatch) return includeMatch[1];

        // Если просто вводится имя библиотеки
        return currentWord;
    }

    getClassMethods(libraryName, className) {
        const classKey = `${libraryName}.${className}`;
        return this.libraryMethods.get(classKey) || [];
    }

    isLibraryClass(className) {
        for (const classKey of this.libraryClasses.keys()) {
            const [libraryName, storedClassName] = classKey.split('.');
            if (storedClassName === className) {
                return true;
            }
        }
        return false;
    }

    getClassLibrary(className) {
        for (const classKey of this.libraryClasses.keys()) {
            const [libraryName, storedClassName] = classKey.split('.');
            if (storedClassName === className) {
                return libraryName;
            }
        }
        return null;
    }

    // Переопределяем метод getSuggestions для поддержки include
getSuggestions(currentWord) {
    console.log(`EnhancedDynamicLibraryProvider: getSuggestions for "${currentWord}"`);

    let suggestions = [];

    // ВСЕГДА проверяем include подсказки независимо от currentWord
    const includeSuggestions = this.getIncludeSuggestions(currentWord);
    console.log(`Found ${includeSuggestions.length} include suggestions`);

    if (includeSuggestions.length > 0) {
        suggestions.push(...includeSuggestions);
    }

    // Также добавляем обычные подсказки
    const regularSuggestions = super.getSuggestions(currentWord);
    suggestions.push(...regularSuggestions);

    console.log(`Total suggestions: ${suggestions.length}`);
    return suggestions;
}
}

if (typeof window.EnhancedDynamicLibraryProvider === 'undefined') {
    window.EnhancedDynamicLibraryProvider = EnhancedDynamicLibraryProvider;
}