class LibraryParser {
    constructor() {
        this.libraries = new Map();
        this.parsedLibraries = new Set();
        this.projectLibraries = new Set();
        this.electronLibrariesPath = null;
        this.ipcAvailable = false;
        
        this.initIPC();
    }

    initIPC() {
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                this.ipcRenderer = ipcRenderer;
                this.ipcAvailable = true;
                console.log('IPC Renderer available for library parsing');
            } catch (error) {
                console.warn('IPC Renderer not available:', error);
            }
        }
    }

    async init(projectPath) {
        this.projectPath = projectPath || '.';
        
        if (this.ipcAvailable) {
            try {
                const result = await this.ipcRenderer.invoke('get-libraries-path');
                this.electronLibrariesPath = result.path;
                console.log('Libraries path from main process:', this.electronLibrariesPath);
            } catch (error) {
                console.warn('Could not get libraries path via IPC:', error);
                this.electronLibrariesPath = './libraries';
            }
        } else {
            this.electronLibrariesPath = './libraries';
        }
        
        await this.scanProjectLibraries();
    }

    async scanProjectLibraries() {
        console.log('Scanning project libraries via IPC...');
        
        const allLibraries = new Set();
        
        if (this.ipcAvailable && this.electronLibrariesPath) {
            try {
                const result = await this.ipcRenderer.invoke('scan-libraries', this.electronLibrariesPath);
                if (result.success && result.libraries) {
                    result.libraries.forEach(lib => allLibraries.add(lib));
                    console.log(`Found ${result.libraries.length} libraries via IPC`);
                    
                    // Логируем найденные библиотеки для отладки
                    console.log('Available libraries from header files:', Array.from(result.libraries));
                }
            } catch (error) {
                console.warn('Error scanning libraries via IPC:', error);
            }
        }

        this.projectLibraries = allLibraries;
        console.log(`Total libraries available: ${allLibraries.size}`);
        
        if (allLibraries.size === 0) {
            console.warn('No libraries found! Check if libraries folder exists and contains valid header files.');
        }
    }

    async parseLibrary(libraryName) {
        if (this.parsedLibraries.has(libraryName)) {
            return this.libraries.get(libraryName);
        }

        console.log(`Parsing library via IPC: ${libraryName}`);

        const libraryInfo = await this.parseLibraryViaIPC(libraryName);

        if (libraryInfo) {
            // Конвертируем массивы обратно в Map
            const convertedInfo = this.convertToMaps(libraryInfo);
            this.libraries.set(libraryName, convertedInfo);
            this.parsedLibraries.add(libraryName);
            
            console.log(`Library ${libraryName} parsed successfully:`, {
                classes: convertedInfo.classes.size,
                methods: Array.from(convertedInfo.methods.values()).flat().length
            });
            
            // Логируем найденные классы и методы для отладки
            convertedInfo.classes.forEach((classInfo, className) => {
                console.log(`  Class: ${className} with ${classInfo.methods.length} methods`);
            });
        } else {
            console.warn(`Failed to parse library via IPC: ${libraryName}`);
            // Создаем базовую информацию о библиотеке
            const fallbackInfo = this.createFallbackLibrary(libraryName);
            this.libraries.set(libraryName, fallbackInfo);
            this.parsedLibraries.add(libraryName);
        }

        return this.libraries.get(libraryName);
    }

    // Остальные методы без изменений...
    convertToMaps(libraryInfo) {
        const classesMap = new Map();
        if (Array.isArray(libraryInfo.classes)) {
            libraryInfo.classes.forEach(cls => {
                classesMap.set(cls.name, cls);
            });
        }

        const methodsMap = new Map();
        if (Array.isArray(libraryInfo.methods)) {
            libraryInfo.methods.forEach(methodGroup => {
                methodsMap.set(methodGroup.className, methodGroup.methods);
            });
        }

        return {
            ...libraryInfo,
            classes: classesMap,
            methods: methodsMap
        };
    }

    async parseLibraryViaIPC(libraryName) {
        if (!this.ipcAvailable) return null;

        try {
            const result = await this.ipcRenderer.invoke('parse-library', {
                libraryName: libraryName,
                librariesPath: this.electronLibrariesPath
            });
            
            return result.success ? result.libraryInfo : null;
        } catch (error) {
            console.error(`Error parsing library ${libraryName} via IPC:`, error);
            return null;
        }
    }

    createFallbackLibrary(libraryName) {
        return {
            name: libraryName,
            classes: new Map([[libraryName, {
                name: libraryName,
                methods: [],
                constructors: [{ parameters: [] }],
                type: 'class'
            }]]),
            functions: [],
            constants: [],
            methods: new Map([[libraryName, []]]),
            filePath: null
        };
    }

    hasLibraryInProject(libraryName) {
        return this.projectLibraries.has(libraryName);
    }

    getAvailableLibraries() {
        return Array.from(this.projectLibraries);
    }

    clearCache() {
        this.libraries.clear();
        this.parsedLibraries.clear();
    }
}