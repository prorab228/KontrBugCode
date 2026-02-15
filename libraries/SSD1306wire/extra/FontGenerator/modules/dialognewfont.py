from PyQt5 import QtWidgets, QtGui
from PyQt5.QtCore import Qt


class DialogNewFont(QtWidgets.QDialog):


	def __init__(self, context, Parent = None):
		super(DialogNewFont,self).__init__(Parent)

		self.context = context

		self.setWindowTitle("Create a new image")

		###########
		self.layout = QtWidgets.QFormLayout()

		self.width = QtWidgets.QSpinBox()
		self.width.setRange(0, 128)
		self.width.setValue(8)
		self.layout.addRow("Minimal width:", self.width)

		self.rows = QtWidgets.QSpinBox()
		self.rows.setRange(1, 4)
		self.rows.setValue(1)
		self.layout.addRow("Rows (8 pixels):", self.rows)

		self.first = QtWidgets.QSpinBox()
		self.first.setRange(0, 255)
		self.first.setValue(32)
		self.layout.addRow("Code of first char:", self.first)

		self.count = QtWidgets.QSpinBox()
		self.count.setRange(1, 256)
		self.count.setValue(96)
		self.layout.addRow("Count of chars:", self.count)

		###########
		self.fontlayout = QtWidgets.QFormLayout()

		self.font = QtWidgets.QFontComboBox()
		#self.font.setFontFilters()
		self.fontlayout.addRow("Font:", self.font)

		self.fontsize = QtWidgets.QSpinBox()
		self.fontsize.setRange(6, 32)
		self.fontsize.setValue(8)
		self.fontlayout.addRow("Font size:", self.fontsize)

		self.fontsample = QtWidgets.QLineEdit()
		self.fontsample.setText("ABCD.0123")
		self.fontlayout.addRow("Test string:", self.fontsample)
		self.fontchanged()

		self.fontgroup = QtWidgets.QGroupBox("Fonts")
		self.fontgroup.setCheckable(True)
		self.fontgroup.setChecked(False)
		self.fontgroup.setLayout(self.fontlayout)

		###########
		self.buttonBox = QtWidgets.QDialogButtonBox(QtWidgets.QDialogButtonBox.Ok | QtWidgets.QDialogButtonBox.Cancel)

		###########
		self.mainLayout = QtWidgets.QGridLayout()
		self.mainLayout.addLayout(self.layout, 0, 0)
		self.mainLayout.addWidget(self.fontgroup, 0, 1);
		self.mainLayout.addWidget(self.buttonBox, 1, 0, 1, 2, Qt.AlignHCenter)

		self.setLayout(self.mainLayout)

		self.rows.valueChanged.connect(self.rowschanged)
		self.font.currentFontChanged.connect(self.fontchanged)
		self.fontsize.valueChanged.connect(self.fontchanged)
		self.buttonBox.accepted.connect(self.accept)
		self.buttonBox.rejected.connect(self.reject)


	def rowschanged(self):
		self.fontsize.setValue(self.rows.value() * 8)


	def fontchanged(self):
		font = self.font.currentFont()
		font.setPixelSize(self.fontsize.value())
		#font.setStyleStrategy(QtGui.QFont.StyleStrategy.NoAntialias | QtGui.QFont.StyleStrategy.NoSubpixelAntialias)
		self.fontsample.setFont(font)


	def accept(self):
		super(DialogNewFont, self).accept()

		font = None
		if self.fontgroup.isChecked():
			font = self.font.currentFont()
			font.setPixelSize(self.fontsize.value())

		self.context.newFont(self.width.value(), self.rows.value(), self.first.value(), self.count.value(), font)
