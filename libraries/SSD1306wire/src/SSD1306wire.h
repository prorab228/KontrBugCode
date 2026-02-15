#ifndef SSD1306wire_h
#define SSD1306wire_h

#include <Arduino.h>

#define SSD1306_WIRE_FONT(_name)     static const uint8_t __attribute__ ((progmem)) _name[]
#define SSD1306_WIRE_INIT_SEQ(_name) static const uint8_t __attribute__ ((progmem)) _name[]
#define SSD1306_WIRE_DISPLAY(_name)  static const SSD1306wire_display __attribute__ ((progmem)) _name

#define SSD1306_COMMAND 0x00
#define SSD1306_DATA    0x40

struct SSD1306wire_display {
	const uint8_t width;
	const uint8_t height;

	const uint8_t* init_sequence;
	const uint8_t  init_sequence_size;
};


class SSD1306wire : public Print {
public:
	SSD1306wire() : _i2c_addr(0x3C), _font(0), _inv_font(false), _column(0), _row(0), _max_columns(0), _max_rows(0) {}

	virtual size_t write(uint8_t character);
	virtual size_t write(const uint8_t *buffer, size_t size);
	size_t write(const char *str) {
		if (str == NULL) return 0;
		return write((const uint8_t *)str, strlen(str));
	}

	void set400kHz();
	void begin(const SSD1306wire_display* display, uint8_t i2c_addr = 0x3C);
	void setFont(const uint8_t* font) { _font = font; }
	void inverseFont(bool inverse) { _inv_font = inverse; }

	void setPower(bool on);
	void setContrast(uint8_t contrast);
	void inverseDisplay(bool inverse);

	void setCursor(uint8_t column, uint8_t row) { _column = column; _row = row; };
	void syncCursor();
	void setCursorForce(uint8_t column, uint8_t row) { setCursor(column, row); syncCursor(); }

	void clear();
	void clearToEOL();

protected:
	void SetColumn(uint8_t column);
	void SetRow(uint8_t row);
	void WireSend(uint8_t type, uint8_t value);

private:
        uint8_t _i2c_addr;
	uint8_t _max_columns;
	uint8_t _max_rows;

	bool _inv_font;
	const uint8_t* _font;
	uint8_t _column;
	uint8_t _row;
};

#endif // SSD1306wire_h
