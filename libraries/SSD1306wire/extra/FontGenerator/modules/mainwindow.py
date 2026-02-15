import os
import re
from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtCore import Qt

from modules.context import Context
from modules.editarea import EditArea
from modules.charslist import CharsList
from modules.dialognewfont import DialogNewFont


class MainWindow(QtWidgets.QMainWindow):


	def __init__(self):
		super(MainWindow, self).__init__()

		self.context = Context()
		self.filename = None
		self.dialogNewFont = None

		self.resize(800,480)
		self.setWindowTitle("FontGenerator")

		self.createMenu(self.menuBar(),
			[
				[ "&File", [
						[ "&New", self.newFont ],
						[ "&Open", self.loadFont ],
						[ "&Save", self.saveFont ],
						[ "Save &As...", self.saveFontAs ],
						None,
						[ "E&xport", self.exportFont ],
						None,
						[ "&Exit", self.close ],
					]
				],
				[ "&Edit", [
						[ "&Add column", [
								[ "&Before", self.columnAddBefore ],
								[ "&After",  self.columnAddAfter ],
							]
						],
						[ "&Remove column", [
								[ "&First", self.columnRemoveFirst ],
								[ "&Last",  self.columnRemoveLast ],
							]
						],
						None,
						[ "Zoom &In", self.zoomIn ],
						[ "Zoom &Out", self.zoomOut ],
					]
				],
				[ "&Chars", [
						[ "&Add char", [
								[ "&Before", self.charAddBefore ],
								[ "&After",  self.charAddAfter ],
							]
						],
						[ "&Remove char", [
								[ "&First", self.charRemoveFirst ],
								[ "&Last",  self.charRemoveLast ],
							]
						],
					]
				],
			]
		)

		self.createToolBar("File",
			[
				[ "New", "new.png", self.newFont ],
				[ "Open", "open.png", self.loadFont ],
				[ "Save", "save.png", self.saveFont ],
				[ "Export", "export.png", self.exportFont ],
			],
		)
		self.createToolBar("Edit",
			[
				[ "Add column before", "column-add-before.png", self.columnAddBefore ],
				[ "Add column after", "column-add-after.png", self.columnAddAfter ],
				None,
				[ "Remove first column", "column-remove-first.png", self.columnRemoveFirst ],
				[ "Remove last column", "column-remove-last.png", self.columnRemoveLast ],
				None,
				[ "Zoom in", "zoom-in.png", self.zoomIn ],
				[ "Zoom out", "zoom-out.png", self.zoomOut ],
			],
		)
		self.createToolBar("Chars",
			[
				[ "Add before", "char-add-before.png", self.charAddBefore ],
				[ "Add after", "char-add-after.png", self.charAddAfter ],
				None,
				[ "Remove first", "char-remove-first.png", self.charRemoveFirst ],
				[ "Remove last", "char-remove-last.png", self.charRemoveLast ],
			],
		)

		self.statusBar = self.statusBar()

		self.editorWidget = EditArea(self.context)
		self.setCentralWidget(self.editorWidget)

		self.charsListWidget = CharsList(self.context)
		self.addDockWidget(Qt.RightDockWidgetArea, self.charsListWidget)

		self.context.signalErrorMessage.connect(self.statusMessage)

		self.show()


	def statusMessage(self, message):
		self.statusBar.showMessage(message, 60000)


	def createMenu(self, parent, menu):
		for item in menu:
			if item is None:
				parent.addSeparator()
			elif isinstance(item[1], list):
				submenu = parent.addMenu(item[0])
				self.createMenu(submenu, item[1])
			else:
				action = QtWidgets.QAction(item[0], self)
				action.triggered.connect(item[1])
				parent.addAction(action)


	def createToolBar(self, name, buttons):
		toolbar = QtWidgets.QToolBar(name)
		for item in buttons:
			if item is None:
				toolbar.addSeparator()
			else:
				action = QtWidgets.QAction(QtGui.QIcon(os.path.join("images", item[1])), item[0], self)
				action.triggered.connect(item[2])
				toolbar.addAction(action)
		self.addToolBar(toolbar)


	def newFont(self):
		if self.dialogNewFont is None:
			self.dialogNewFont = DialogNewFont(self.context, self)
			self.dialogNewFont.setModal(True)
		if self.dialogNewFont.exec():
			self.filename = None


	def loadFont(self):
		( filename, filefilter ) = QtWidgets.QFileDialog.getOpenFileName(self, "Open an existing font settings", "", u"Font settings (*.json);;All files (*)")
		filename = filename.strip()
		if filename:
			if self.context.loadFromFile(filename):
				self.filename = filename

	
	def saveFont(self):
		if self.filename is None:
			self.saveFontAs()
		else:
			self.context.saveToFile(self.filename)


	def saveFontAs(self):
		( filename, filefilter ) = QtWidgets.QFileDialog.getSaveFileName(self, "Save the font settings", "", "Settings (*.json);;All files (*)")
		filename = filename.strip()
		if filename:
			if re.search('\\.json$', filename, re.IGNORECASE) is None:
				filename += '.json'
			if self.context.saveToFile(filename):
				self.filename = filename


	def exportFont(self):
		( filename, filefilter ) = QtWidgets.QFileDialog.getSaveFileName(self, "Export the font to C-header", "", "Header (*.h);;All files (*)")
		filename = filename.strip()
		if filename:
			if re.search('\\.h', filename, re.IGNORECASE) is None:
				filename += '.h'
			self.context.exportToHeader(filename)


	def columnAddBefore(self):
		self.editorWidget.doAction(Context.Action.ColumnAddBefore)


	def columnAddAfter(self):
		self.editorWidget.doAction(Context.Action.ColumnAddAfter)


	def columnRemoveFirst(self):
		self.editorWidget.doAction(Context.Action.ColumnRemoveFirst)


	def columnRemoveLast(self):
		self.editorWidget.doAction(Context.Action.ColumnRemoveLast)


	def zoomIn(self):
		self.editorWidget.doAction(Context.Action.ZoomIn)


	def zoomOut(self):
		self.editorWidget.doAction(Context.Action.ZoomOut)


	def charAddBefore(self):
		self.context.addChar(Context.First)
		self.context.signalCharSelect.emit(0)


	def charAddAfter(self):
		self.context.addChar(Context.Last)
		self.context.signalCharSelect.emit(self.context.getCharsCount() - 1)


	def charRemoveFirst(self):
		self.context.removeChar(Context.First)


	def charRemoveLast(self):
		self.context.removeChar(Context.Last)


	def close(self):
		super(MainWindow, self).close()
