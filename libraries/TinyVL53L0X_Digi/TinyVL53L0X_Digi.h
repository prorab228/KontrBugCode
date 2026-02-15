#ifndef TinyVL53L0X_Digi_h
#define TinyVL53L0X_Digi_h

#include <TinyWireM.h>

#define VL53L0X_I2C_ADDR 0x29

class TinyVL53L0X {
public:
    // Инициализация датчика
    bool begin() {
        TinyWireM.begin();
        
        // Проверка наличия устройства
        TinyWireM.beginTransmission(VL53L0X_I2C_ADDR);
        if(TinyWireM.endTransmission() != 0) return false;
        
        // Базовая инициализация
        TinyWireM.beginTransmission(VL53L0X_I2C_ADDR);
		  TinyWireM.write(0x89); TinyWireM.write(0x01); // Более точный режим
		  TinyWireM.endTransmission();
		  delay(10);
        
        return true;
    }
    
    // Чтение расстояния в миллиметрах
    uint16_t readRange() {
        // Запуск измерения
        TinyWireM.beginTransmission(VL53L0X_I2C_ADDR);
	  TinyWireM.write(0x00); TinyWireM.write(0x01);
	  TinyWireM.endTransmission();
	  
	  // Ожидание данных
	  delay(30);
	  
	  // Чтение результата
	  TinyWireM.beginTransmission(VL53L0X_I2C_ADDR);
	  TinyWireM.write(0x14);
	  TinyWireM.endTransmission();
	  
	  TinyWireM.requestFrom(VL53L0X_I2C_ADDR, (uint8_t)12);
	  for (uint8_t i=0; i<10; i++) TinyWireM.read(); // Пропуск лишних данных
        
        uint16_t distance = TinyWireM.read() << 8;
        distance |= TinyWireM.read();
        
        return distance;
    }
    


private:
    void writeReg(uint8_t reg, uint8_t value) {
        TinyWireM.beginTransmission(VL53L0X_I2C_ADDR);
        TinyWireM.write(reg);
        TinyWireM.write(value);
        TinyWireM.endTransmission();
    }
};

#endif