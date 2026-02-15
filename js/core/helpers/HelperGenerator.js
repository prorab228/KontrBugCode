class HelperGenerator {
    constructor() {
        this.providers = new Map();
        this.registeredHelpers = new Set();
        this.registerProviders();
    }

    registerProviders() {
        const providerInstances = [
            new SensorHelperProvider(),
            new MotorHelperProvider(),
            new ESPHelperProvider(),
            new DisplayHelperProvider(),
            new SpecialHelperProvider(),
            new ArraysHelperProvider()
        ];

        providerInstances.forEach(provider => {
            Object.keys(provider.helperMap).forEach(blockType => {
                this.providers.set(blockType, provider);
            });
        });
    }

    generateHelpers(usedBlockTypes) {
        const helpers = [];

        usedBlockTypes.forEach(blockType => {
            const provider = this.providers.get(blockType);
            if (provider) {
                const helper = provider.getHelperCode(blockType);
                if (helper && !this.registeredHelpers.has(helper)) {
                    helpers.push(helper);
                    this.registeredHelpers.add(helper);
                }
            }
        });

        return helpers.join('\n');
    }
}