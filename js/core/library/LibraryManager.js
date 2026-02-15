class LibraryManager {
    constructor() {
        this.dynamicDeclarations = new Map();
        this.providers = new Map();
        this.registerProviders();
    }

    registerProviders() {
        const providerInstances = [
            new SensorLibraryProvider(),
            new MotorLibraryProvider(),
            new DisplayLibraryProvider(),
            new ESPLibraryProvider(),
            new CommunicationLibraryProvider(),
            new SpecialLibraryProvider()
        ];

        // Строим кэш для быстрого поиска
        providerInstances.forEach(provider => {
            Object.keys(provider.libraryMap).forEach(blockType => {
                this.providers.set(blockType, provider);
            });
        });
    }

    getProvider(blockType) {
        return this.providers.get(blockType) || null;
    }

    getRequiredLibraries(usedBlockTypes, workspace = null) {
        const includes = new Set(['#include <Arduino.h>']);
        const declarations = new Set();

        usedBlockTypes.forEach(blockType => {
            this.addLibraryForBlock(blockType, includes, declarations, workspace);
        });

        this.processDynamicDeclarations(declarations, workspace);

        return { includes, declarations };
    }

    addLibraryForBlock(blockType, includes, declarations, workspace) {
        const provider = this.getProvider(blockType);
        if (!provider) return;

        const libraryConfig = provider.getLibraryConfig(blockType, workspace);
        if (!libraryConfig) return;

        libraryConfig.includes?.forEach(include => {
            if (!this.isDuplicateInclude(includes, include)) {
                includes.add(include);
            }
        });

        libraryConfig.declarations?.forEach(declaration => {
            if (!this.isDuplicateDeclaration(declarations, declaration)) {
                declarations.add(declaration);
            }
        });

        if (libraryConfig.dynamicDeclarations) {
            libraryConfig.dynamicDeclarations.forEach(decl => {
                this.dynamicDeclarations.set(blockType, decl);
            });
        }
    }

    isDuplicateInclude(includesSet, newInclude) {
        const normalizedNew = newInclude.toLowerCase().replace(/\s+/g, '');
        for (let existing of includesSet) {
            if (existing.toLowerCase().replace(/\s+/g, '') === normalizedNew) {
                return true;
            }
        }
        return false;
    }

    isDuplicateDeclaration(declarationsSet, newDeclaration) {
        const normalizedNew = newDeclaration.toLowerCase().replace(/\s+/g, '');
        for (let existing of declarationsSet) {
            if (existing.toLowerCase().replace(/\s+/g, '') === normalizedNew) {
                return true;
            }
        }
        return false;
    }

    processDynamicDeclarations(declarations, workspace) {
        if (!workspace) return;

        const blocks = workspace.getAllBlocks(false);

        this.dynamicDeclarations.forEach((declarationFn, blockType) => {
            const block = blocks.find(b => b.type === blockType);
            if (block) {
                const dynamicDecl = declarationFn(block);
                if (dynamicDecl) {
                    declarations.add(dynamicDecl);
                }
            }
        });
    }
}