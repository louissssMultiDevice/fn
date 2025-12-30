from flask import Flask, request, jsonify
import lirc

app = Flask(__name__)

# Simpan mapping kode TV
tv_database = {}

@app.route('/register', methods=['POST'])
def register_tv():
    data = request.json
    tv_code = data.get('code')
    tv_database[tv_code] = data
    return jsonify({'status': 'registered'})

@app.route('/send', methods=['POST'])
def send_command():
    data = request.json
    tv_code = data.get('tv_code')
    command = data.get('command')
    
    # Kirim sinyal IR sesuai merk TV
    if tv_code in tv_database:
        brand = tv_database[tv_code]['brand']
        lirc.send_once(brand, command)
    
    return jsonify({'status': 'sent'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
