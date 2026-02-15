from PyQt5 import QtWidgets, QtGui
from PyQt5.QtCore import Qt


class CharsListItem(QtWidgets.QLabel):


	def __init__(self, context, index):
		super(CharsListItem, self).__init__()

		self.context = context
		self.index = index

		self.charDraw(self.index)

		self.context.signalCharDraw.connect(self.charDraw)


	def charDraw(self, index):
		if (self.index != index):
			return
		pixmap = self.context.getCharsPixmap(self.index, 4)
		self.setPixmap(pixmap)
		

	def mousePressEvent(self, event):
		if event.button() == Qt.LeftButton:
			self.context.signalCharSelect.emit(self.index)


class CharsList(QtWidgets.QDockWidget):


	def __init__(self, context):
		super(CharsList, self).__init__("List of chars")

		self.context = context
		self.setAllowedAreas(Qt.LeftDockWidgetArea | Qt.RightDockWidgetArea)
		self.setFeatures(QtWidgets.QDockWidget.NoDockWidgetFeatures)

		self.layout = QtWidgets.QFormLayout()
		self.redraw()

		self.group = QtWidgets.QGroupBox()
		self.group.setLayout(self.layout)

		self.scrollarea = QtWidgets.QScrollArea()
		self.scrollarea.setBackgroundRole(QtGui.QPalette.Dark)
		self.scrollarea.setSizeAdjustPolicy(QtWidgets.QScrollArea.AdjustToContents)
		self.scrollarea.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
		self.scrollarea.setWidget(self.group)
		self.scrollarea.setWidgetResizable(True)

		self.setWidget(self.scrollarea)
		self.update()

		self.context.signalCharsRedraw.connect(self.redraw)


	def redraw(self):
		while self.layout.rowCount():
			self.layout.removeRow(0)

		self.width = QtWidgets.QSpinBox()
		self.width.setRange(0, 128)
		self.width.setValue(self.context.getWidth())
		self.layout.addRow("Minimal width:", self.width)

		self.rows = QtWidgets.QLineEdit()
		self.rows.setText(str(self.context.getRows()))
		self.rows.setReadOnly(True)
		self.layout.addRow("Rows (8 pixels):", self.rows)

		self.first = QtWidgets.QLineEdit()
		self.first.setText(str(self.context.getFirstChar()))
		self.first.setReadOnly(True)
		self.layout.addRow("Code of first char:", self.first)

		self.count = QtWidgets.QLineEdit()
		self.count.setText(str(self.context.getCharsCount()))
		self.count.setReadOnly(True)
		self.layout.addRow("Count of chars:", self.count)

		for i in range(self.context.getCharsCount()):
			self.layout.addRow(str(self.context.getCharsCode(i)), CharsListItem(self.context, i))
		self.context.signalCharSelect.emit(0)
