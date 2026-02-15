class InitializationGenerator {
    constructor() {
        this.providers = new Map();
        this.registerProviders();
    }

    registerProviders() {
        const providerInstances = [
            new SensorInitializationProvider(),
            new MotorInitializationProvider(),
            new ESPInitializationProvider(),
            new DisplayInitializationProvider(),
            new CommunicationInitializationProvider()
        ];

        providerInstances.forEach(provider => {
            Object.keys(provider.initializationMap).forEach(blockType => {
                this.providers.set(blockType, provider);
            });
        });
    }

    generateInitialization(usedBlockTypes, workspace = null) {
        const initCode = ['Serial.begin(9600);']; // Always include Serial
        const processedBlocks = new Set();

        usedBlockTypes.forEach(blockType => {
            if (processedBlocks.has(blockType)) return;

            const provider = this.providers.get(blockType);
            if (provider) {
                const code = provider.getInitializationCode(blockType, workspace);
                if (code && code.length > 0) {
                    initCode.push(...code);
                    processedBlocks.add(blockType);
                }
            }
        });

        return initCode;
    }
}