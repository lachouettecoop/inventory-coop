from eve import Eve
from flask import jsonify

app = Eve()


@app.route('/status')
def hello():
    return jsonify({
        'name': 'inventory-coop',
        'status': 'ok'
    })


if __name__ == '__main__':
    app.run()
