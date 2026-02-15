#include <SSD1306wire.h>
#include <SSD1306_128x64.h>
#include <zxfont.h>
#include <Wire.h>

SSD1306wire oled;

void setup() {
  Serial.begin(9600);

  oled.begin(0x3C, &SSD1306_128x64);
  oled.setFont(ZXfont);

  Wire.setClock(400000);

  oled.clear();

  oled.setCursor(0, 0);
  oled.inverseFont(false);
  oled.print(F("Line 1"));
  oled.clearToEOL();

  oled.setCursor(0, 1);
  oled.inverseFont(true);
  oled.print(F("Line 2"));
  oled.clearToEOL();

  oled.setCursor(0, 2);
  oled.inverseFont(false);
  oled.print(F("Line 3"));
  oled.clearToEOL();

  oled.setCursor(0, 3);
  oled.print(F("\xDA\xC4\xC2\xD2\xBF\xC9\xCD\xCB\xD1\xBB\xD5\xB8"));
  oled.setCursor(0, 4);
  oled.print(F("\xB3\x20\xB3\xBA\xB3\xBA\x20\xBA\xB3\xBA\xD4\xBE"));
  oled.setCursor(0, 5);
  oled.print(F("\xC3\xC4\xC5\xD7\xB4\xCC\xCD\xCE\xD8\xB9"));
  oled.setCursor(0, 6);
  oled.print(F("\xC6\xCD\xD8\xCE\xB5\xC7\xC4\xD7\xC5\xB6\xD6\xB7"));
  oled.setCursor(0, 7);
  oled.print(F("\xC0\xC4\xC1\xD0\xD9\xC8\xCD\xCA\xCF\xBC\xD3\xBD"));
}

void loop() {
}

