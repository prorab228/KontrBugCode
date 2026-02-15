class BaseLibraryProvider {
    constructor() {
        this.libraryMap = {};
    }

    getLibraryConfig(blockType, workspace) {
        const staticConfig = this.getStaticConfig(blockType);
        const dynamicConfig = this.getDynamicConfig(blockType, workspace);

        return this.mergeConfigs(staticConfig, dynamicConfig);
    }

    getStaticConfig(blockType) {
        return this.libraryMap[blockType] || null;
    }

    getDynamicConfig(blockType, workspace) {
        // Переопределить в дочерних классах при необходимости
        return null;
    }

    mergeConfigs(staticConfig, dynamicConfig) {
        if (!staticConfig && !dynamicConfig) return null;
        if (!staticConfig) return dynamicConfig;
        if (!dynamicConfig) return staticConfig;

        return {
            includes: [...(staticConfig.includes || []), ...(dynamicConfig.includes || [])],
            declarations: [...(staticConfig.declarations || []), ...(dynamicConfig.declarations || [])],
            dynamicDeclarations: [...(staticConfig.dynamicDeclarations || []), ...(dynamicConfig.dynamicDeclarations || [])]
        };
    }
}