SSD1306_WIRE_INIT_SEQ(SSD1306_128x64_init_seq) = {
	0xAE,       // Display OFF
	0xA8, 0x3F, // Set MUX Ratio
	0xD3, 0x00, // Set Display Offset
	0x40,       // Set Display Start Line
	0xA1,       // Set Segment re-map
	0xC8,       // Set COM Output Scan Direction (DEC)
	0xDA, 0x12, // Set COM Pins hardware configuration
	0x81, 0x7F, // Set Contrast Control
	0xA4,       // Disable Entrie Display On
	0xA6,       // Set Normal Display
	0xD5, 0x80, // Set Osc Frequency
	0xD9, 0xF1, // Set Pre-charge Period
	0xDB, 0x40, // Set VCOMH Deselect Level
	0x8D, 0x14, // Enable charge pump regulator
	0x20, 0x02, // Set Memory Addressing Mode
	0xAF        // Display ON
};

SSD1306_WIRE_DISPLAY(SSD1306_128x64) = {
	128, 64,
	SSD1306_128x64_init_seq, 
	sizeof(SSD1306_128x64_init_seq),
};
