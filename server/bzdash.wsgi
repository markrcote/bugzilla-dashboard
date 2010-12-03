#!/bin/env python2.6
import inspect
import os.path
import sys

def execution_path(filename):
  return os.path.join(os.path.dirname(inspect.getfile(sys._getframe(1))), filename)

sys.path.append(execution_path(''))
from bzdash import app

application = app.wsgifunc()
