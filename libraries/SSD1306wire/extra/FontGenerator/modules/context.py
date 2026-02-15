import os
import re
import json
from enum import Enum, auto
from PyQt5 import QtCore, QtGui


class Context(QtCore.QObject):


	class Action(Enum):
		ZoomIn            = auto()
		ZoomOut           = auto()
		ColumnAddBefore   = auto()
		ColumnAddAfter    = auto()
		ColumnRemoveFirst = auto()
		ColumnRemoveLast  = auto()

		def __repr__(self):
			cls_name = self.__class__.__name__
			return f'{cls_name}.{self.name}'

	First = True
	Last = False

	signalCharSelect = QtCore.pyqtSignal([int])
	signalCharDraw = QtCore.pyqtSignal([int])
	signalCharsRedraw = QtCore.pyqtSignal()
	signalErrorMessage = QtCore.pyqtSignal([str])


	def __init__(self):
		super(Context, self).__init__()

		self.font = {
			'width'      : 8,
			'rows'       : 1,
			'first_char' : 32,
			'chars'      : [
				[ ],
			]
		}


	def getWidth(self):
		return self.font['width']


	def setWidth(self, width):
		try:
			width = int(width)
			width = max(width, 0)
			width = min(width, 128)
			self.font['width'] = width
		except:
			pass


	def getRows(self):
		return self.font['rows']


	def getFirstChar(self):
		return self.font['first_char']


	def getCharsCount(self):
		return len(self.font['chars'])


	def getCharsCode(self, index):
		return self.font['first_char'] + index;


	def getCharsPixmap(self, index, zoom):
		rows = self.font['rows']
		cols = len(self.font['chars'][index]) // rows

		image = QtGui.QPixmap(cols * zoom, 8 * rows * zoom)

		if cols and rows:
			painter = QtGui.QPainter(image)
			for row in range(rows):
				for col in range(cols):
					for bit in range(8):
						color = QtGui.QColorConstants.Black if self.font['chars'][index][col + row * cols] & (1 << bit) else QtGui.QColorConstants.White
						painter.fillRect(col * zoom, (8 * row + bit) * zoom, zoom, zoom, color)

		return image


	def setCharPoint(self, index, x, y, state):
		if index < 0 or index >= len(self.font['chars']):
			return

		rows = self.font['rows']
		cols = len(self.font['chars'][index]) // rows

		if x < 0 or x >= cols:
			return
		if y < 0 or y >= rows * 8:
			return;

		row = y // 8
		bit = y % 8

		if state:
			self.font['chars'][index][x + (y // 8) * cols] |= 1 << bit
		else:
			self.font['chars'][index][x + (y // 8) * cols] &= 255 ^ ( 1 << bit )

		self.signalCharDraw.emit(index)


	def addCharColumn(self, index, first):
		if index < 0 or index >= len(self.font['chars']):
			return
		
		rows = self.font['rows']
		cols = len(self.font['chars'][index]) // rows

		if cols == 128:
			return

		offset = 0
		if not first:
			offset = cols
		cols += 1

		for row in range(rows):
			self.font['chars'][index].insert(row * cols + offset, 0)

		self.signalCharDraw.emit(index)


	def removeCharColumn(self, index, first):
		if index < 0 or index >= len(self.font['chars']):
			return

		rows = self.font['rows']
		cols = len(self.font['chars'][index]) // rows

		if cols == 0:
			return

		cols -= 1
		offset = 0
		if not first:
			offset = cols

		for row in range(rows):
			self.font['chars'][index].pop(row * cols + offset)

		self.signalCharDraw.emit(index)


	def addChar(self, first):
		if first:
			if self.font['first_char'] > 0:
				self.font['first_char'] -= 1
				self.font['chars'].insert(0, [0] * self.font['width'])
				self.signalCharsRedraw.emit()
		else:
			if self.font['first_char'] + len(self.font['chars']) < 256:
				self.font['chars'].append([0] * self.font['width'])
				self.signalCharsRedraw.emit()


	def removeChar(self, first):
		if len(self.font['chars']):
			if first:
				if self.font['first_char'] < 255:
					self.font['first_char'] += 1
				self.font['chars'].pop(0)
			else:
				self.font['chars'].pop(-1)
			self.signalCharsRedraw.emit()


	def newFont(self, width, rows, first_char, count, font = None):
		width = max(width, 0)
		width = min(width, 128)
		rows = max(rows, 1)
		first_char = max(first_char, 0)
		first_char = min(first_char, 255)
		count = max(count, 1)
		count = min(count, 256 - first_char)

		self.font = {
			'width'      : width,
			'rows'       : rows,
			'first_char' : first_char
		}

		if font is not None:
			font.setStyleStrategy(QtGui.QFont.StyleStrategy.NoAntialias)

			fontmetrics = QtGui.QFontMetrics(font)
			fontbaseline = (8 * rows * fontmetrics.ascent()) // fontmetrics.height()

			self.font['chars'] = []
			for i in range(count):
				char = chr(first_char + i)

				if fontmetrics.inFont(char):
					fontrect = fontmetrics.boundingRectChar(char)
					charWidth = fontrect.width() + abs(fontrect.x())

					image = QtGui.QImage(charWidth, 8 * rows, QtGui.QImage.Format_Grayscale8)
					image.fill(QtGui.QColorConstants.White)

					if charWidth and rows:
						painter = QtGui.QPainter(image)
						painter.setPen(QtGui.QColorConstants.Black)
						painter.setFont(font)
						painter.drawText(0, fontbaseline, char)
						painter.end()

					d = []
					for row in range(rows):
						for col in range(charWidth):
							v = 0
							for bit in range(8):
								if image.pixelColor(col, row * 8 + bit) == QtGui.QColorConstants.Black:
									v |= 1 << bit
							d.append(v)
					self.font['chars'].append(d)
				else:
					self.font['chars'].append([ 0 for j in range(width * rows) ])
		else:
			self.font['chars'] = [ [ 0 for j in range(width * rows) ] for i in range(count) ]

		self.signalCharsRedraw.emit()


	def saveToFile(self, filename):
		try:
			with open(filename, 'w') as fp:
				json.dump(self.font, fp, indent=4)
		except:
			self.signalErrorMessage.emit("Can't save to file " + filename)
			return False

		self.signalErrorMessage.emit("Font saved to file " + filename)
		return True


	def loadFromFile(self, filename):
		try:
			with open(filename, 'r') as fp:
				font = json.load(fp)
			if not isinstance(font['width'], int) or font['width'] not in range(129):
				raise
			if not isinstance(font['rows'], int) or font['rows'] < 0:
				raise
			if not isinstance(font['first_char'], int) or font['first_char'] not in range(256):
				raise
			if font['first_char'] + len(font['chars']) > 256:
				raise
			for i in font['chars']:
				if not isinstance(i, list) or (len(i) % font['rows']) != 0:
					raise
			self.font = font
		except:
			self.signalErrorMessage.emit("Can't load file " + filename)
			return False

		self.signalErrorMessage.emit("Font loaded from file " + filename)
		self.signalCharsRedraw.emit()
		return True


	def exportToHeader(self, filename):
		ident = "    "
		fileid = re.sub(r'\W', '_', os.path.basename(filename))
		lastindex = len(self.font['chars']) - 1;

		try:
			with open(filename, 'w') as fp:
				fp.write("#ifndef __" + fileid + "__\n")
				fp.write("#define __" + fileid + "__\n\n")
				fp.write("SSD1306_WIRE_FONT(" +  re.sub(r'_[hH]$', '', fileid) +") = {\n")
				fp.write(ident + str(self.font['width']) + ", // Minimal width in pixels, chars with less width will extended with empty space\n")
				fp.write(ident + str(self.font['rows']) + ", // Rows count, 1 row = 8 pixels\n")
				fp.write(ident + str(self.font['first_char']) + ", // First char\n")
				fp.write(ident + str(self.font['first_char'] + lastindex) + ", // Last char\n")
				fp.write(ident +"// Widths of chars in pixels included to font\n")
				fp.write(ident + ",".join([ str(len(i)) for i in self.font['chars'] ]) + ",\n")
				fp.write(ident + "// bit field of all characters, 1..width for 1st row (Width x 8 pixels), 1..width for 2nd row, ....\n")
				for index in range(lastindex + 1):
					fp.write(ident)
					if len(self.font['chars'][index]):
						fp.write(",".join(str(j) for j in self.font['chars'][index]))
						if index < lastindex:
							fp.write(",")
					char = self.font['first_char'] + index
					fp.write(" // " + str(char))
					if char in range(32, 128):
						fp.write(" '" + chr(char) + "'")
					fp.write("\n")
				fp.write("};\n")
				fp.write("\n#endif // __" + fileid + "__\n")
		except:
			self.signalErrorMessage.emit("Can't export font to file " + filename)
			return False
		self.signalErrorMessage.emit("Font exported to " + filename)
		return True
