#include <avr/pgmspace.h>
#include <Wire.h>

#include "SSD1306wire.h"

void SSD1306wire::begin(const SSD1306wire_display* display, uint8_t i2c_addr = 0x3C) {
	_i2c_addr = i2c_addr;

	Wire.begin();

	_max_columns = pgm_read_byte(&display->width);
	_max_rows = pgm_read_byte(&display->height) >> 3;

	const uint8_t* init_sequence = (const uint8_t*)pgm_read_word(&display->init_sequence);
	uint8_t init_sequence_size = pgm_read_byte(&display->init_sequence_size);

	Wire.beginTransmission(_i2c_addr);
	Wire.write(SSD1306_COMMAND);
	for(uint8_t i = 0; i < init_sequence_size; i++) {
		WireSend(SSD1306_COMMAND, pgm_read_byte(init_sequence + i));
	}
	Wire.endTransmission();

	setCursor(0, 0);
}

void SSD1306wire::set400kHz() {
	Wire.setClock(400000);
}

size_t SSD1306wire::write(uint8_t character) {
	if((_column >= _max_columns) || (_row >= _max_rows))
		return 1;
	if(_font == 0)
		return 1;

	uint8_t font_min_width = pgm_read_byte(_font);
	uint8_t font_rows = pgm_read_byte(_font + 1);
	uint8_t font_first_char = pgm_read_byte(_font + 2);
	uint8_t font_last_char = pgm_read_byte(_font + 3);

	uint8_t char_width = 0;
	uint8_t *char_offset = _font + 5 + font_last_char - font_first_char;
	if((character >= font_first_char) && (character <= font_last_char)) {
		char_width = pgm_read_byte(_font + 4 + character - font_first_char) / font_rows;
		for(uint8_t i = character - font_first_char; i > 0; --i) {
			char_offset += pgm_read_byte(_font + 3 + i);
		}
	}

	uint8_t max_rows = _row + font_rows;
	if (max_rows > _max_rows)
		max_rows = _max_rows;

	for(uint8_t row = _row; row < max_rows; ++row) {
		SetColumn(_column);
		SetRow(row);

		uint8_t c;
		uint8_t i = 0;
		Wire.beginTransmission(_i2c_addr);
		Wire.write(SSD1306_DATA);
		while(i < char_width) {
			if (i + _column >= _max_columns)
				break;
			c = pgm_read_byte(char_offset + i);
			if(_inv_font) c = ~ c;
			Wire.write(c);
			++i;
		}
		c = 0;
		if(_inv_font) c = ~ c;
		while(i < font_min_width) {
			if (i + _column >= _max_columns)
				break;
			Wire.write(c);
			++i;
		}
		Wire.endTransmission();

		char_offset += char_width;
	}

	if(char_width < font_min_width)
		char_width = font_min_width;
	_column += char_width;
	if(_column > _max_columns)
		_column = _max_columns;

	return 1;
}

size_t SSD1306wire::write(const uint8_t *buffer, size_t size) {
	size_t outchars = 0;

	for(int c = 0; c < size; c++) {
		outchars += write(*(buffer + c));
	}

	return outchars;
}

void SSD1306wire::syncCursor() {
	if(_column < _max_columns)
		SetColumn(_column);
	if(_row < _max_rows)
		SetRow(_row);
}

void SSD1306wire::setPower(bool on) {
	Wire.beginTransmission(_i2c_addr);
	Wire.write(SSD1306_COMMAND);
	Wire.write(on ? 0xAF : 0xAE);
	Wire.endTransmission();
}

void SSD1306wire::setContrast(uint8_t contrast) {
	Wire.beginTransmission(_i2c_addr);
	Wire.write(SSD1306_COMMAND);
	Wire.write(0x81);
	Wire.write(contrast);
	Wire.endTransmission();
}

void SSD1306wire::inverseDisplay(bool inverse) {
	Wire.beginTransmission(_i2c_addr);
	Wire.write(SSD1306_COMMAND);
	Wire.write(inverse ? 0xA7 : 0xA6);
	Wire.endTransmission();
}

void SSD1306wire::SetColumn(uint8_t column) {
	Wire.beginTransmission(_i2c_addr);
	Wire.write(SSD1306_COMMAND);
	Wire.write(0x00 | (column & 0x0F));
	Wire.write(0x10 | (column >> 4));
	Wire.endTransmission();
}

void SSD1306wire::SetRow(uint8_t row) {
	Wire.beginTransmission(_i2c_addr);
	Wire.write(SSD1306_COMMAND);
	Wire.write(0xB0 | row);
	Wire.endTransmission();
}

void SSD1306wire::clear() {
	SetColumn(0);

	for(uint8_t row = 0; row < _max_rows; ++row) {
		SetRow(row);

		Wire.beginTransmission(_i2c_addr);
		Wire.write(SSD1306_DATA);
		for(uint8_t col = 0; col < _max_columns; ++col) {
			WireSend(SSD1306_DATA, 0);
		}
		Wire.endTransmission();
	}

	setCursorForce(0, 0);
}

void SSD1306wire::clearToEOL() {
	if((_column >= _max_columns) || (_row >= _max_rows))
		return;
	if(_font == 0)
		return 1;

	uint8_t max_rows = _row + pgm_read_byte(_font + 1);
	if (max_rows > _max_rows)
		max_rows = _max_rows;

	uint8_t c = 0;
	if(_inv_font) c = ~ c;

	for(uint8_t row = _row; row < max_rows; ++row) {
		SetColumn(_column);
		SetRow(row);

		Wire.beginTransmission(_i2c_addr);
		Wire.write(SSD1306_DATA);
		for(uint8_t col = _column; col < _max_columns; ++col) {
			WireSend(SSD1306_DATA, c);
		}
		Wire.endTransmission();
	}
	_column = _max_columns;
}

void SSD1306wire::WireSend(uint8_t type, uint8_t value) {
	if(Wire.write(value) == 0) {
		Wire.endTransmission();
		Wire.beginTransmission(_i2c_addr);
		Wire.write(type);
		Wire.write(value);
	}
}
