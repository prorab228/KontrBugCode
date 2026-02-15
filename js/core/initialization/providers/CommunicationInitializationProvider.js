class CommunicationInitializationProvider extends BaseInitializationProvider {
    constructor() {
        super();

        this.initializationMap = {
            'bluetooth_send': this.initializeBluetooth,
            'bluetooth_receive': this.initializeBluetooth
        };
    }

    initializeBluetooth = (workspace) => {
        const btBlock = workspace?.getAllBlocks(false)
            .find(b => b.type === 'bluetooth_begin');
        if (!btBlock) {
            return ['BT.begin(9600);'];
        }
        return [];
    }
}