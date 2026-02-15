from PyQt5 import QtWidgets, QtGui
from PyQt5.QtCore import Qt

from modules.context import Context


class EditAreaCanvas(QtWidgets.QLabel):


	def __init__(self, context):
		super(EditAreaCanvas, self).__init__()

		self.context = context
		self.index = -1
		self.zoom = 20

		self.setBackgroundRole(QtGui.QPalette.Base)
		self.setMouseTracking(True)

		self.charSelect(0)
		self.context.signalCharSelect.connect(self.charSelect)
		self.context.signalCharDraw.connect(self.charDraw)


	def charSelect(self, index):
		if index >= 0:
			self.index = index
			self.charRedraw()


	def charDraw(self, index):
		if (self.index == index):
			self.charRedraw()


	def charRedraw(self):
		pixmap = self.context.getCharsPixmap(self.index, self.zoom)

		pen = QtGui.QPen()
		pen.setColor(QtGui.QColorConstants.Red)
		pen.setStyle(Qt.DotLine)

		if pixmap.width() and pixmap.height():
			painter = QtGui.QPainter(pixmap)
			painter.setPen(pen)
			for i in range(self.zoom, pixmap.width() - 1, self.zoom):
				painter.drawLine(i, 0, i, pixmap.height() - 1)
			for i in range(self.zoom, pixmap.height() - 1, self.zoom):
				painter.drawLine(0, i, pixmap.width() - 1, i)
			painter.end()

		self.setFixedSize(pixmap.size())
		self.setPixmap(pixmap)


	def doAction(self, action):
		if action == Context.Action.ZoomIn:
			self.zoom += 1
			self.context.signalErrorMessage.emit("Zoom x" + str(self.zoom))
			self.charRedraw()
		elif action == Context.Action.ZoomOut:
			self.zoom -= 1
			self.zoom = max(self.zoom, 5)
			self.context.signalErrorMessage.emit("Zoom x" + str(self.zoom))
			self.charRedraw()
		elif action == Context.Action.ColumnAddBefore:
			self.context.addCharColumn(self.index, Context.First)
		elif action == Context.Action.ColumnAddAfter:
			self.context.addCharColumn(self.index, Context.Last)
		elif action == Context.Action.ColumnRemoveFirst:
			self.context.removeCharColumn(self.index, Context.First)
		elif action == Context.Action.ColumnRemoveLast:
			self.context.removeCharColumn(self.index, Context.Last)


	def mousePressEvent(self, event):
		pos = event.pos()
		x = int(pos.x() / self.zoom)
		y = int(pos.y() / self.zoom)

		if event.button() == Qt.LeftButton:
			self.context.setCharPoint(self.index, x, y, True)
		elif event.button() == Qt.RightButton:
			self.context.setCharPoint(self.index, x, y, False)


class EditArea(QtWidgets.QScrollArea):


	def __init__(self, context):
		super(EditArea, self).__init__()

		self.context = context

		self.setBackgroundRole(QtGui.QPalette.Dark)
		self.setAlignment(Qt.AlignHCenter | Qt.AlignVCenter)

		self.canvas = EditAreaCanvas(self.context)
		self.setWidget(self.canvas)


	def doAction(self, action):
		self.canvas.doAction(action)
