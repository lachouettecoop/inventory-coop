import datetime
from eve import Eve

app = Eve()

# using reloader will destroy the in-memory sqlite db
app.run(port=5555, debug=True, use_reloader=False)
