import sys

from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtCore import Qt

from modules.mainwindow import MainWindow


if __name__ == '__main__':
	app = QtWidgets.QApplication(sys.argv)
	mw = MainWindow()
	sys.exit(app.exec_())
