class BaseInitializationProvider {
    constructor() {
        this.initializationMap = {};
    }

    getInitializationCode(blockType, workspace) {
        const initializer = this.initializationMap[blockType];
        return initializer ? initializer(workspace) : [];
    }
}