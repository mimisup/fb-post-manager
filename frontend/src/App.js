import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [category, setCategory] = useState('商用');
  const [tab, setTab] = useState('copytext'); // copytext, images, posts

  const [copyTexts, setCopyTexts] = useState([]);
  const [images, setImages] = useState([]);
  const [posts, setPosts] = useState([]);

  const [newText, setNewText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [postText, setPostText] = useState('');

  useEffect(() => {
    loadData();
  }, [category]);

  const loadData = async () => {
    try {
      const [textRes, imgRes, postRes] = await Promise.all([
        axios.get(`${API_BASE}/copy-texts?category=${category}`),
        axios.get(`${API_BASE}/images?category=${category}`),
        axios.get(`${API_BASE}/posts?category=${category}`)
      ]);
      setCopyTexts(textRes.data);
      setImages(imgRes.data);
      setPosts(postRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Copy Text Functions
  const addCopyText = async () => {
    if (!newText.trim()) return;
    try {
      await axios.post(`${API_BASE}/copy-texts`, {
        category,
        text: newText
      });
      setNewText('');
      loadData();
    } catch (error) {
      console.error('Error adding text:', error);
    }
  };

  const deleteCopyText = async (id) => {
    try {
      await axios.delete(`${API_BASE}/copy-texts/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting text:', error);
    }
  };

  const copyCopyText = (text) => {
    navigator.clipboard.writeText(text);
    alert('已複製到剪貼簿！');
  };

  // Image Functions
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      await axios.post(`${API_BASE}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      loadData();
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const deleteImage = async (id) => {
    try {
      await axios.delete(`${API_BASE}/images/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const toggleImageSelection = (id) => {
    setSelectedImages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Post Functions
  const createPost = async () => {
    if (!postText.trim() && selectedImages.length === 0) {
      alert('請輸入文案或選擇圖片');
      return;
    }

    try {
      await axios.post(`${API_BASE}/posts`, {
        category,
        text: postText,
        image_ids: selectedImages
      });
      setPostText('');
      setSelectedImages([]);
      loadData();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const deletePost = async (id) => {
    try {
      await axios.delete(`${API_BASE}/posts/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const copyPost = (post) => {
    let content = post.text || '';
    navigator.clipboard.writeText(content);
    alert('帖子已複製到剪貼簿！');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>FB 發文管理器</h1>
        <div className="category-buttons">
          <button
            className={`btn-category ${category === '商用' ? 'active' : ''}`}
            onClick={() => setCategory('商用')}
          >
            商用
          </button>
          <button
            className={`btn-category ${category === '住用' ? 'active' : ''}`}
            onClick={() => setCategory('住用')}
          >
            住用
          </button>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${tab === 'copytext' ? 'active' : ''}`}
          onClick={() => setTab('copytext')}
        >
          📝 文案庫
        </button>
        <button
          className={`tab ${tab === 'images' ? 'active' : ''}`}
          onClick={() => setTab('images')}
        >
          🖼️ 圖片庫
        </button>
        <button
          className={`tab ${tab === 'posts' ? 'active' : ''}`}
          onClick={() => setTab('posts')}
        >
          📋 帖子
        </button>
      </div>

      <div className="content">
        {/* Copy Text Tab */}
        {tab === 'copytext' && (
          <div className="section">
            <h2>文案庫 - {category}</h2>
            <div className="input-group">
              <textarea
                placeholder="輸入文案..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows="4"
              />
              <button onClick={addCopyText} className="btn-primary">
                新增文案
              </button>
            </div>

            <div className="text-list">
              {copyTexts.map(text => (
                <div key={text.id} className="text-item">
                  <p>{text.text}</p>
                  <div className="actions">
                    <button
                      className="btn-small"
                      onClick={() => copyCopyText(text.text)}
                    >
                      📋 複製
                    </button>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => deleteCopyText(text.id)}
                    >
                      🗑️ 刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Images Tab */}
        {tab === 'images' && (
          <div className="section">
            <h2>圖片庫 - {category}</h2>
            <div className="upload-group">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>

            <div className="image-grid">
              {images.map(img => (
                <div key={img.id} className="image-item">
                  <img src={`../${img.filepath}`} alt={img.filename} />
                  <p>{img.filename}</p>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => deleteImage(img.id)}
                  >
                    🗑️ 刪除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {tab === 'posts' && (
          <div className="section">
            <h2>發文助手 - {category}</h2>

            <div className="post-creator">
              <h3>建立新帖子</h3>
              <textarea
                placeholder="輸入文案..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows="5"
              />

              <h4>選擇圖片</h4>
              <div className="image-select-grid">
                {images.map(img => (
                  <div
                    key={img.id}
                    className={`image-select ${selectedImages.includes(img.id) ? 'selected' : ''}`}
                    onClick={() => toggleImageSelection(img.id)}
                  >
                    <img src={`../${img.filepath}`} alt={img.filename} />
                    <div className="checkbox">
                      {selectedImages.includes(img.id) && '✓'}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={createPost} className="btn-primary">
                建立帖子
              </button>
            </div>

            <div className="posts-list">
              <h3>已建立的帖子</h3>
              {posts.map(post => (
                <div key={post.id} className="post-item">
                  <p className="post-text">{post.text}</p>
                  {post.image_ids.length > 0 && (
                    <p className="post-images">📸 {post.image_ids.length} 張圖片</p>
                  )}
                  <div className="actions">
                    <button
                      className="btn-small"
                      onClick={() => copyPost(post)}
                    >
                      📋 複製
                    </button>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => deletePost(post.id)}
                    >
                      🗑️ 刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
