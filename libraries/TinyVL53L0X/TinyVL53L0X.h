#ifndef TinyVL53L0X_h
#define TinyVL53L0X_h

#include <TinyWireM.h>
#define Wire TinyWireM

class TinyVL53L0X {
public:
    bool init();
    uint16_t readRangeContinuousMillimeters();
    void startContinuous();
};

#endif