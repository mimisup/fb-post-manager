from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Database config
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    DATABASE_URL = DATABASE_URL + '?sslmode=require'
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fb_posts.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 3600
}

db = SQLAlchemy(app)

# Models
class CopyText(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)  # '商用' or '住用'
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'text': self.text,
            'created_at': self.created_at.isoformat()
        }

class Image(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'filename': self.filename,
            'filepath': self.filepath,
            'created_at': self.created_at.isoformat()
        }

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    text = db.Column(db.Text)
    image_ids = db.Column(db.String(500))  # Comma-separated image IDs
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'text': self.text,
            'image_ids': self.image_ids.split(',') if self.image_ids else [],
            'created_at': self.created_at.isoformat()
        }

# Routes - Copy Text
@app.route('/api/copy-texts', methods=['GET'])
def get_copy_texts():
    category = request.args.get('category')
    if category:
        texts = CopyText.query.filter_by(category=category).all()
    else:
        texts = CopyText.query.all()
    return jsonify([t.to_dict() for t in texts])

@app.route('/api/copy-texts', methods=['POST'])
def create_copy_text():
    data = request.json
    text = CopyText(category=data['category'], text=data['text'])
    db.session.add(text)
    db.session.commit()
    return jsonify(text.to_dict()), 201

@app.route('/api/copy-texts/<int:id>', methods=['DELETE'])
def delete_copy_text(id):
    text = CopyText.query.get(id)
    if text:
        db.session.delete(text)
        db.session.commit()
        return '', 204
    return jsonify({'error': 'Not found'}), 404

# Routes - Images
@app.route('/api/images', methods=['GET'])
def get_images():
    category = request.args.get('category')
    if category:
        images = Image.query.filter_by(category=category).all()
    else:
        images = Image.query.all()
    return jsonify([img.to_dict() for img in images])

@app.route('/api/images', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    category = request.form.get('category')

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Save file
    os.makedirs('uploads', exist_ok=True)
    filepath = os.path.join('uploads', file.filename)
    file.save(filepath)

    image = Image(category=category, filename=file.filename, filepath=filepath)
    db.session.add(image)
    db.session.commit()
    return jsonify(image.to_dict()), 201

@app.route('/api/images/<int:id>', methods=['DELETE'])
def delete_image(id):
    image = Image.query.get(id)
    if image:
        try:
            os.remove(image.filepath)
        except:
            pass
        db.session.delete(image)
        db.session.commit()
        return '', 204
    return jsonify({'error': 'Not found'}), 404

# Routes - Posts
@app.route('/api/posts', methods=['GET'])
def get_posts():
    category = request.args.get('category')
    if category:
        posts = Post.query.filter_by(category=category).all()
    else:
        posts = Post.query.all()
    return jsonify([p.to_dict() for p in posts])

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    image_ids = ','.join(data.get('image_ids', [])) if data.get('image_ids') else ''
    post = Post(category=data['category'], text=data.get('text'), image_ids=image_ids)
    db.session.add(post)
    db.session.commit()
    return jsonify(post.to_dict()), 201

@app.route('/api/posts/<int:id>', methods=['DELETE'])
def delete_post(id):
    post = Post.query.get(id)
    if post:
        db.session.delete(post)
        db.session.commit()
        return '', 204
    return jsonify({'error': 'Not found'}), 404

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
