class CommunicationLibraryProvider extends BaseLibraryProvider {
    constructor() {
        super();

        this.libraryMap = {
            'bluetooth_begin': {
                includes: ['#include <SoftwareSerial.h>']
            },
            'bluetooth_send': {
                includes: ['#include <SoftwareSerial.h>']
            },
            'bluetooth_receive': {
                includes: ['#include <SoftwareSerial.h>']
            },
            'ir_transmitter_begin': {
                includes: ['#include <IRremote.h>'],
                declarations: ['IRsend irSend;']
            },
            'ir_transmitter_send': {
                includes: ['#include <IRremote.h>'],
                declarations: ['IRsend irSend;']
            },
            'ir_receiver_begin': {
                includes: ['#include <IRremote.h>'],
                declarations: ['IRrecv irRecv(2);', 'decode_results results;']
            },
            'ir_receiver_read': {
                includes: ['#include <IRremote.h>'],
                declarations: ['IRrecv irRecv(2);', 'decode_results results;']
            }
        };
    }

    getDynamicConfig(blockType, workspace) {
        const dynamicConfigs = {
            'bluetooth_begin': {
                includes: ['#include <SoftwareSerial.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const rxPin = block.getFieldValue('RX_PIN') || '10';
                        const txPin = block.getFieldValue('TX_PIN') || '11';
                        return `SoftwareSerial BT(${rxPin}, ${txPin}); // RX, TX`;
                    }
                ]
            },
            'bluetooth_send': {
                includes: ['#include <SoftwareSerial.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const bluetoothBlock = workspace?.getAllBlocks(false)
                            .find(b => b.type === 'bluetooth_begin');
                        if (bluetoothBlock) {
                            const rxPin = bluetoothBlock.getFieldValue('RX_PIN') || '10';
                            const txPin = bluetoothBlock.getFieldValue('TX_PIN') || '11';
                            return `SoftwareSerial BT(${rxPin}, ${txPin}); // RX, TX`;
                        }
                        return 'SoftwareSerial BT(10, 11); // RX, TX (default)';
                    }
                ]
            },
            'bluetooth_receive': {
                includes: ['#include <SoftwareSerial.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const bluetoothBlock = workspace?.getAllBlocks(false)
                            .find(b => b.type === 'bluetooth_begin');
                        if (bluetoothBlock) {
                            const rxPin = bluetoothBlock.getFieldValue('RX_PIN') || '10';
                            const txPin = bluetoothBlock.getFieldValue('TX_PIN') || '11';
                            return `SoftwareSerial BT(${rxPin}, ${txPin}); // RX, TX`;
                        }
                        return 'SoftwareSerial BT(10, 11); // RX, TX (default)';
                    }
                ]
            },
            'ir_receiver_begin': {
                includes: ['#include <IRremote.h>'],
                dynamicDeclarations: [
                    (block) => {
                        const pin = block.getFieldValue('PIN') || '2';
                        return `IRrecv irRecv(${pin});`;
                    },
                    (block) => {
                        return 'decode_results results;';
                    }
                ]
            }
        };

        return dynamicConfigs[blockType];
    }
}