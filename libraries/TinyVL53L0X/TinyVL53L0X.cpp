#include "TinyVL53L0X.h"

bool TinyVL53L0X::init() {
    Wire.begin();
    
    // Инициализация датчика
    Wire.beginTransmission(0x29);
    Wire.write(0x80); Wire.write(0x01);
    Wire.write(0xFF); Wire.write(0x01);
    Wire.endTransmission();
    
    delay(10);
    return true;
}

void TinyVL53L0X::startContinuous() {
    Wire.beginTransmission(0x29);
    Wire.write(0x80); Wire.write(0x01);
    Wire.write(0xFF); Wire.write(0x01);
    Wire.write(0x00); Wire.write(0x00);
    Wire.endTransmission();
    delay(10);
}

uint16_t TinyVL53L0X::readRangeContinuousMillimeters() {
    Wire.beginTransmission(0x29);
    Wire.write(0x14); // Регистр результата измерения
    Wire.endTransmission();
    
    Wire.requestFrom(0x29, 12);
    for (uint8_t i = 0; i < 9; i++) Wire.read();
    
    uint16_t range = Wire.read() << 8;
    range |= Wire.read();
    return range;
}