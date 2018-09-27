from eve import Eve
from flask import jsonify, render_template

app = Eve(__name__,
          static_folder='./client/dist/static',
          template_folder='./client/dist')


@app.route('/status')
def hello():
    return jsonify({
        'name': 'inventory-coop',
        'status': 'ok'
    })


@app.route('/')
def index():
    return render_template("index.html")


if __name__ == '__main__':
    app.run(debug=True, port=8000)
