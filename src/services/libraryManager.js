// optimizedLibraryManager.js
const path = require('path');
const fs = require('fs-extra');

class LibraryManager {
    constructor() {
        this.initialized = false;
        this.librariesPath = null;
        this.librariesCache = new Map();
        this.parsedLibraries = new Map();
        this.cacheTimeout = 30000; // 30 секунд кэш
    }

    async initialize() {
        if (this.initialized) return;

        console.log('Initializing OptimizedLibraryManager...');
        const pathResult = await this.findLibrariesPath();

        if (pathResult.success) {
            this.librariesPath = pathResult.path;
            console.log('Libraries path found:', this.librariesPath);

            // Предзагрузка библиотек в фоне
            this.preloadLibraries().catch(console.error);
        }

        this.initialized = true;
    }




    getLibrariesPath() {
        return this.librariesPath;
    }

    async findLibrariesPath() {
        const possiblePaths = [
            path.join(process.resourcesPath, 'libraries'),
            path.join(__dirname, 'libraries'),
            path.join(process.cwd(), 'libraries'),
            './libraries'
        ];

        for (const libPath of possiblePaths) {
            try {
                if (await fs.pathExists(libPath)) {
                    return { success: true, path: libPath };
                }
            } catch (error) {
                // Пропускаем ошибки
            }
        }

        // Создаем папку по умолчанию
        const defaultPath = path.join(process.resourcesPath, 'libraries');
        await fs.ensureDir(defaultPath);
        return { success: true, path: defaultPath };
    }

    async preloadLibraries() {
        try {
            const items = await fs.readdir(this.librariesPath);
            const libraryPromises = items.map(async item => {
                const itemPath = path.join(this.librariesPath, item);
                const stat = await fs.stat(itemPath);
              //  console.log(`Lib ${itemPath} Path: ${stat}`);
                if (stat.isDirectory() && !item.startsWith('.')) {
                    const libraryNames = await this.fastExtractLibraryNames(itemPath);
                    return libraryNames;
                }
                return [];
            });

            const allLibraries = (await Promise.all(libraryPromises)).flat();
            this.librariesCache.set('available', {
                data: allLibraries,
                timestamp: Date.now()
            });

            console.log(`Preloaded ${allLibraries.length} libraries:`, allLibraries);
        } catch (error) {
            console.warn('Preload libraries error:', error.message);
        }
    }

    async fastExtractLibraryNames(libPath) {
        try {
            const headerFiles = await this.findHeaderFilesFast(libPath);
            const names = new Set();

            for (const headerFile of headerFiles.slice(0, 1)) { // Ограничиваем количество файлов
                const name = this.quickExtractLibraryName(headerFile);
               // console.log(`Find Lib ${name} in ${libPath}`);
                if (name) names.add(name);
            }

            if (names.size === 0) {
                names.add(path.basename(libPath));
            }

            return Array.from(names);
        } catch (error) {
            return [path.basename(libPath)];
        }
    }

    async findHeaderFilesFast(libPath, maxDepth = 1) {
        const headerFiles = [];

        const search = async (currentPath, depth = 0) => {
            if (depth > maxDepth) return;

            try {
                const items = await fs.readdir(currentPath);

                for (const item of items) {
                    if (item.startsWith('.')) continue;

                    const itemPath = path.join(currentPath, item);
                    const stat = await fs.stat(itemPath);

                    if (stat.isDirectory()) {
                        if (depth < maxDepth) {
                            await search(itemPath, depth + 1);
                        }
                    } else if (item.endsWith('.h')) {
                        headerFiles.push({
                            name: item,
                            path: itemPath
                        });
                    }
                }
            } catch (error) {
                // Пропускаем ошибки доступа
            }
        };

        await search(libPath);
        return headerFiles;
    }

//    quickExtractLibraryName(headerFile) {
//        try {
//            // Быстрое чтение только начала файла
//            const content = fs.readFileSync(headerFile.path, 'utf8', { encoding: 'utf8', flag: 'r' });
//
//            // Быстрый поиск по первым 10 строкам
//            const lines = content.split('\n').slice(0, 10).join('\n');
//            console.log(`lib ${headerFile.name.replace('.h', '')} `);
//            // Ищем include guard
//            const guardMatch = lines.match(/#(?:ifndef|define)\s+(\w+)_H/);
//
//            console.log(` guard: ${guardMatch}`);
//            if (guardMatch) return guardMatch[1];
//
//
//            // Ищем название класса
//            const classMatch = lines.match(/class\s+(\w+)/);
//            console.log(`class: ${classMatch}`);
//
//            if (classMatch) return classMatch[1];
//
//
//            // Используем имя файла
//            return headerFile.name.replace('.h', '');
//        } catch (error) {
//            return headerFile.name.replace('.h', '');
//        }
//    }

    quickExtractLibraryName(headerFile) {
        try {
            const content = fs.readFileSync(headerFile.path, 'utf8', { encoding: 'utf8', flag: 'r' });

            // ПРОСТАЯ ОЧИСТКА ОТ КОММЕНТАРИЕВ
            const cleanContent = this.quickRemoveComments(content);

            // Берем первые 15 строк для анализа
            const lines = cleanContent.split('\n').slice(0, 15).join('\n');

           // console.log(`Processing: ${headerFile.name}`);

          /*  // 1. Ищем include guard (самый надежный способ)
            const guardMatches = [
                ...lines.matchAll(/#(?:ifndef|define)\s+(\w+)_H\b/g),
                ...lines.matchAll(/#(?:ifndef|define)\s+(\w+)_H_/g),
                ...lines.matchAll(/#(?:ifndef|define)\s+(\w+)_h\b/g),
                ...lines.matchAll(/#(?:ifndef|define)\s+(\w+)_h_/g)
            ];

            for (const match of guardMatches) {
                if (match[1]) {
                    const name = match[1].replace(/_(H|h|H_|h_)$/, '');
                    console.log(`Found guard: ${name}`);
                    return name;
                }
            }

            // 2. Ищем #pragma once
            if (lines.includes('#pragma once')) {
                const name = headerFile.name.replace('.h', '');
                console.log(`Found #pragma once: ${name}`);
                return name;
            }

         /*   // 3. Ищем классы и структуры
            const classMatch = lines.match(/(?:class|struct)\s+(\w+)/);
            if (classMatch) {
                console.log(`Found class/struct: ${classMatch[1]}`);
                return classMatch[1];
            }*/

            // 4. Используем имя файла
            const fileName = headerFile.name.replace('.h', '');
           // console.log(`Using filename: ${fileName}`);
            return fileName;

        } catch (error) {
            console.warn(`Error reading ${headerFile.name}:`, error.message);
            return headerFile.name.replace('.h', '');
        }
    }

    quickRemoveComments(content) {
        return content
            // Удаляем блочные комментарии /* */
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Удаляем строчные комментарии //
            .replace(/\/\/.*$/gm, '')
            // Удаляем лишние пустые строки
            .replace(/\n\s*\n/g, '\n')
            .trim();
    }

    async handleScanLibraries() {
        const cacheKey = 'available';
        const cached = this.librariesCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            console.log('Returning cached libraries');
            return { success: true, libraries: cached.data };
        }

        try {
            const items = await fs.readdir(this.librariesPath);
            const libraries = new Set();

            for (const item of items) {
                const itemPath = path.join(this.librariesPath, item);
                const stat = await fs.stat(itemPath);

                if (stat.isDirectory() && !item.startsWith('.')) {
                    const libraryNames = await this.fastExtractLibraryNames(itemPath);
                    libraryNames.forEach(name => libraries.add(name));
                }
            }

            const libraryArray = Array.from(libraries);

            // Обновляем кэш
            this.librariesCache.set(cacheKey, {
                data: libraryArray,
                timestamp: Date.now()
            });

            return { success: true, libraries: libraryArray };
        } catch (error) {
            console.error('Scan libraries error:', error);
            return { success: false, error: error.message };
        }
    }

    async handleParseLibrary(event, data) {
        if (!data?.libraryName) {
            return { success: false, error: 'libraryName is required' };
        }

        const { libraryName } = data;
        const cacheKey = `parsed_${libraryName}`;

        // Проверяем кэш
        const cached = this.parsedLibraries.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            console.log(`Returning cached library: ${libraryName}`);
            return { success: true, libraryInfo: cached.data };
        }

        try {
            const libFolder = await this.findLibraryFolderFast(libraryName);
            if (!libFolder) {
                return { success: false, error: `Library ${libraryName} not found` };
            }

            const libraryInfo = await this.fastParseLibrary(libFolder, libraryName);

            // Кэшируем результат
            this.parsedLibraries.set(cacheKey, {
                data: libraryInfo,
                timestamp: Date.now()
            });

            return { success: true, libraryInfo };
        } catch (error) {
            console.error(`Parse library error ${libraryName}:`, error);
            return { success: false, error: error.message };
        }
    }

    async findLibraryFolderFast(libraryName) {
        try {
            const items = await fs.readdir(this.librariesPath);

            for (const item of items) {
                const itemPath = path.join(this.librariesPath, item);
                const stat = await fs.stat(itemPath);

                if (stat.isDirectory() && !item.startsWith('.')) {
                    // ОСНОВНАЯ ПРОВЕРКА: сравниваем имя папки с именем библиотеки (игнорируя версии)
                    const folderNameWithoutVersion = this.removeVersionFromFolderName(item);
                    const libraryNameLower = libraryName.toLowerCase();
                    const folderNameLower = folderNameWithoutVersion.toLowerCase();

                    console.log(`Checking folder: ${item} -> ${folderNameWithoutVersion} for library: ${libraryName}`);

                    // 1. Проверка по имени папки без версии
                    if (folderNameLower === libraryNameLower) {
                        console.log(`✓ Found by folder name: ${item}`);
                        return itemPath;
                    }

                    // 2. Проверка по основному header файлу
                    const mainHeader = path.join(itemPath, `${libraryName}.h`);
                    if (await fs.pathExists(mainHeader)) {
                        console.log(`✓ Found by main header: ${mainHeader}`);
                        return itemPath;
                    }

                    // 3. Проверка по любому header файлу с именем библиотеки
                    const headerFiles = await this.findHeaderFilesFast(itemPath, 1);
                    for (const headerFile of headerFiles) {
                        const headerName = headerFile.name.replace('.h', '').toLowerCase();
                        if (headerName === libraryNameLower) {
                            console.log(`✓ Found by header file: ${headerFile.name}`);
                            return itemPath;
                        }
                    }

                    // 4. Проверка по содержимому header файлов (извлечение имени библиотеки)
                    if (headerFiles.length > 0) {
                        const extractedNames = await this.fastExtractLibraryNames(itemPath);
                        if (extractedNames.some(name => name.toLowerCase() === libraryNameLower)) {
                            console.log(`✓ Found by extracted name from headers`);
                            return itemPath;
                        }
                    }
                }
            }

            console.log(`✗ Library folder not found for: ${libraryName}`);
            return null;
        } catch (error) {
            console.error(`Error finding library folder for ${libraryName}:`, error);
            return null;
        }
    }

    // Новый метод для удаления версии из имени папки
    removeVersionFromFolderName(folderName) {
        // Удаляем версии типа: -1.0.0, -2.0, _v1, .v2.0.1 и т.д.
        const versionPatterns = [
            /-\d+\.\d+\.\d+/,    // -1.0.0, -2.1.3
            /-\d+\.\d+/,         // -1.0, -2.1
            /_v\d+\.\d+\.\d+/,   // _v1.0.0, _v2.1.3
            /_v\d+\.\d+/,        // _v1.0, _v2.1
            /\.v\d+\.\d+\.\d+/,  // .v1.0.0, .v2.1.3
            /\.v\d+\.\d+/,       // .v1.0, .v2.1
            /-\d+/,              // -1, -2
            /_v\d+/,             // _v1, _v2
        ];

        let cleanName = folderName;
        for (const pattern of versionPatterns) {
            cleanName = cleanName.replace(pattern, '');
        }

        console.log(`Folder name: ${folderName} -> ${cleanName}`);
        return cleanName;
    }

    async fastParseLibrary(libPath, libraryName) {
        const libraryInfo = {
            name: libraryName,
            classes: new Map(),
            methods: new Map()
        };

        const headerFiles = await this.findHeaderFilesFast(libPath, 5); // Ограничиваем глубину

        for (const headerFile of headerFiles.slice(0, 10)) { // Ограничиваем количество файлов
            try {
                const content = await fs.readFile(headerFile.path, 'utf8');
                this.fastExtractClasses(content, libraryInfo, headerFile.name);
            } catch (error) {
                console.error(`Parse library error ${headerFile}:`, error);
                // Пропускаем ошибки парсинга
            }
        }

        return this.serializeForIPC(libraryInfo);
    }

    fastExtractClasses(content, libraryInfo, fileName) {
        const cleanContent = this.removeCommentsFast(content);
        console.log(`Processing file: ${fileName}`);

        // УЛУЧШЕННОЕ извлечение классов с полным телом
        const classRegex = /class\s+(\w+)[^{]*\{([\s\S]*?)^\s*\}\s*;/gm;
        const structRegex = /struct\s+(\w+)[^{]*\{([\s\S]*?)^\s*\}\s*;/gm;

        let match;

        // Обрабатываем классы
        while ((match = classRegex.exec(cleanContent)) !== null) {
            const className = match[1];
            const classBody = match[2];

            console.log(`Found class: ${className}`);
            console.log(`Full class body length: ${classBody.length} chars`);
            console.log(`Class body preview: ${classBody.substring(0, 500)}...`);

            this.processClassFast(className, classBody, libraryInfo, fileName);
        }

        // Обрабатываем структуры
        while ((match = structRegex.exec(cleanContent)) !== null) {
            const className = match[1];
            const classBody = match[2];

            console.log(`Found struct: ${className}`);
            this.processClassFast(className, classBody, libraryInfo, fileName);
        }
    }

    removeCommentsFast(content) {
        return content
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');
    }

     processClassFast(className, classBody, libraryInfo, fileName) {
        if (!libraryInfo.classes.has(className)) {
            libraryInfo.classes.set(className, {
                name: className,
                methods: [],
                constructors: []
            });
        }

        const classInfo = libraryInfo.classes.get(className);

        // Извлекаем конструкторы
        const constructorRegex = new RegExp(`${className}\\s*\\(([^)]*)\\)`, 'g');
        let constrMatch;
        while ((constrMatch = constructorRegex.exec(classBody)) !== null) {
            classInfo.constructors.push({
                parameters: this.fastParseParameters(constrMatch[1])
            });
        }

        // ИСПОЛЬЗУЕМ УЛУЧШЕННЫЙ МЕТОД ДЛЯ ИЗВЛЕЧЕНИЯ МЕТОДОВ
        this.extractMethodsAdvanced(classBody, classInfo);

        // Создаем подсказки
        this.createMethodSuggestionsFast(classInfo, libraryInfo);
    }


        // Альтернативный улучшенный regex для методов
    extractMethodsAdvanced(classBody, classInfo) {
        console.log(`Extracting methods for class: ${classInfo.name}`);
     //   console.log(`Body: ${classBody}`);
        // УЛУЧШЕННЫЕ РЕГУЛЯРНЫЕ ВЫРАЖЕНИЯ ДЛЯ СЛОЖНЫХ ТИПОВ

        // 1. Основное выражение для методов с возвращаемыми типами (включая size_t, uint8_t и т.д.)
        const mainMethodRegex = /(?:virtual\s+|static\s+|inline\s+|explicit\s+)*([a-zA-Z_][\w:\s*&<>]*?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*(?:override)?\s*(?:final)?\s*(?:=\s*0)?\s*(?:=\s*default)?\s*[;{]/g;

        let match;
        while ((match = mainMethodRegex.exec(classBody)) !== null) {
            const returnType = match[1].trim();
            const methodName = match[2].trim();
            const paramsString = match[3];

            if (this.shouldSkipMethod(methodName, classInfo.name)) continue;

            console.log(`Found method: ${returnType} ${methodName}(${paramsString})`);

            classInfo.methods.push({
                name: methodName,
                returnType: returnType,
                parameters: this.fastParseParameters(paramsString)
            });
        }

        // 2. Выражение для методов без возвращаемого типа (void по умолчанию)
        const voidMethodRegex = /(?:virtual\s+|static\s+|inline\s+)*(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*(?:override)?\s*(?:final)?\s*(?:=\s*0)?\s*(?:=\s*default)?\s*[;{]/g;

        while ((match = voidMethodRegex.exec(classBody)) !== null) {
            const methodName = match[1].trim();
            const paramsString = match[2];

            if (this.shouldSkipMethod(methodName, classInfo.name)) continue;

            console.log(`Found void method: ${methodName}(${paramsString})`);

            classInfo.methods.push({
                name: methodName,
                returnType: 'void',
                parameters: this.fastParseParameters(paramsString)
            });
        }

        // 3. Специальное выражение для методов с типами, содержащими подчеркивания (size_t, uint8_t и т.д.)
        this.extractSpecialTypedMethods(classBody, classInfo);

        // 4. Using-декларации
        this.extractUsingDeclarations(classBody, classInfo);
    }

// Новый метод для извлечения методов со специальными типами
    extractSpecialTypedMethods(classBody, classInfo) {
        // Специальное выражение для методов с типами вроде size_t, uint8_t и т.д.
        const specialTypeRegex = /(?:virtual\s+|static\s+|inline\s+)*([a-zA-Z_][\w]*_(?:t|T)\b\s*[*&]?\s*)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*(?:override)?\s*(?:final)?\s*(?:=\s*0)?\s*[;{]/g;

        let match;
        while ((match = specialTypeRegex.exec(classBody)) !== null) {
            const returnType = match[1].trim();
            const methodName = match[2].trim();
            const paramsString = match[3];

            if (this.shouldSkipMethod(methodName, classInfo.name)) continue;

            console.log(`Found special typed method: ${returnType} ${methodName}(${paramsString})`);

            // Проверяем, не добавлен ли уже этот метод
            const alreadyExists = classInfo.methods.some(m =>
                m.name === methodName &&
                m.parameters.length === this.fastParseParameters(paramsString).length
            );

            if (!alreadyExists) {
                classInfo.methods.push({
                    name: methodName,
                    returnType: returnType,
                    parameters: this.fastParseParameters(paramsString)
                });
            }
        }
    }

    shouldSkipMethod(methodName, className) {
        const skipPatterns = [
            methodName.startsWith('~'),           // Деструкторы
            methodName.startsWith('operator'),    // Операторы
            methodName === className,             // Конструкторы (уже обработаны отдельно)
            methodName === 'if' || methodName === 'for' || methodName === 'while', // Ключевые слова
            methodName.length === 0               // Пустые имена
        ];

        return skipPatterns.some(pattern => pattern === true);
    }

    // Новый метод для извлечения using-деклараций
    extractUsingDeclarations(classBody, classInfo) {
        // Using-декларации вида: using BaseClass::methodName;
        const usingRegex = /using\s+(\w+::\w+);/g;
        let usingMatch;

        while ((usingMatch = usingRegex.exec(classBody)) !== null) {
            const fullMethod = usingMatch[1];
            const parts = fullMethod.split('::');

            if (parts.length === 2) {
                const baseClass = parts[0];
                const methodName = parts[1];

                console.log(`Found using declaration: ${baseClass}::${methodName}`);

                // Добавляем метод как унаследованный
                classInfo.methods.push({
                    name: methodName,
                    returnType: 'unknown', // Мы не знаем тип из using-декларации
                    parameters: [],
                    inheritedFrom: baseClass
                });
            }
        }

        // Using-декларации для типов (пока пропускаем)
        const usingTypeRegex = /using\s+(\w+)\s*=\s*[^;]+;/g;
        let usingTypeMatch;
        while ((usingTypeMatch = usingTypeRegex.exec(classBody)) !== null) {
            console.log(`Found type alias: ${usingTypeMatch[0]}`);
        }
    }




     fastParseParameters(paramString) {
        if (!paramString.trim()) return [];

        const params = [];
        const paramList = paramString.split(',');

        for (const param of paramList) {
            const trimmed = param.trim();
            if (!trimmed) continue;

            // УЛУЧШЕННЫЙ парсинг для сложных типов
            const complexMatch = trimmed.match(/^([\w\s*&<>]+?)\s+(\w+)(?:\s*=\s*[^,]+)?$/);

            if (complexMatch) {
                const type = complexMatch[1].trim().replace(/\s+/g, ' ');
                const name = complexMatch[2].trim();

                params.push({
                    type: type,
                    name: name
                });
            } else {
                // Fallback: простой split
                const parts = trimmed.split(/\s+/).filter(p => p.trim());
                if (parts.length >= 2) {
                    const type = parts.slice(0, -1).join(' ');
                    const name = parts[parts.length - 1].replace(/=.*$/, '');
                    params.push({ type, name });
                } else if (parts.length === 1 && parts[0] !== 'void') {
                    params.push({ type: parts[0], name: 'param' });
                }
            }
        }

        return params;
    }

    createMethodSuggestionsFast(classInfo, libraryInfo) {
        const className = classInfo.name;
        const methods = [];

        // Конструкторы
        classInfo.constructors.forEach(constructor => {
            const paramList = constructor.parameters.map(p =>
                p.name && p.name !== 'param' ? `${p.type} ${p.name}` : p.type
            ).join(', ');

            methods.push({
                matchText: `.${className}`,
                displayText: `${className}(${paramList})`,
                insertText: `${className}()`,
                type: 'constructor_method',
                typeLabel: `конструктор ${className}`,
                cursorOffset: -1
            });
        });

        // Методы класса
        classInfo.methods.forEach(method => {
            const paramList = method.parameters.map(p =>
                p.name && p.name !== 'param' ? `${p.type} ${p.name}` : p.type
            ).join(', ');

            const paramNames = method.parameters.map(p => p.name || 'param').join(', ');

            // Добавляем возвращаемый тип в отображение
            const displayText = `${method.returnType} ${method.name}(${paramList})`;

            // Для унаследованных методов добавляем специальную метку
            const typeLabel = method.inheritedFrom
                ? `метод ${className} → унаследован от ${method.inheritedFrom}`
                : `метод ${className} → ${method.returnType}`;

            methods.push({
                matchText: `.${method.name}`,
                displayText: displayText,
                insertText: `${method.name}(${paramNames})`,
                type: 'library_method',
                typeLabel: typeLabel,
                cursorOffset: -1
            });

            console.log(`Created method suggestion: ${displayText}`);
        });

        if (!libraryInfo.methods.has(className)) {
            libraryInfo.methods.set(className, []);
        }
        libraryInfo.methods.get(className).push(...methods);
    }

    serializeForIPC(libraryInfo) {
        return {
            ...libraryInfo,
            classes: Array.from(libraryInfo.classes.entries()).map(([name, cls]) => ({
                name: cls.name,
                methods: cls.methods || [],
                constructors: cls.constructors || []
            })),
            methods: Array.from(libraryInfo.methods.entries()).map(([className, methods]) => ({
                className,
                methods
            }))
        };
    }

    // Очистка кэша
    clearCache() {
        this.librariesCache.clear();
        this.parsedLibraries.clear();
    }
}

module.exports = LibraryManager;