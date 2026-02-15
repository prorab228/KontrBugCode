class BaseHelperProvider {
    constructor() {
        this.helperMap = {};
    }

    getHelperCode(blockType) {
        return this.helperMap[blockType] ? this.helperMap[blockType]() : null;
    }
}