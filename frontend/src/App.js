import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = '/api';

function App() {
  const [posts, setPosts] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('全部');
  const [postCategory, setPostCategory] = useState('商用');
  const [postAddress, setPostAddress] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/posts`);
      setPosts(res.data.reverse());
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(files);

    const previews = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        previews.push({ name: file.name, data: event.target.result });
        if (previews.length === files.length) {
          setImagePreview(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImagePreview(imagePreview.filter((_, i) => i !== index));
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const addPost = async () => {
    if (!postContent.trim() && selectedImages.length === 0) {
      alert('請輸入文案或選擇圖片');
      return;
    }

    try {
      let imageIds = [];

      // Upload images first
      for (const file of selectedImages) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', postCategory);

        const imgRes = await axios.post(`${API_BASE}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageIds.push(imgRes.data.id);
      }

      // Then create post with image IDs
      await axios.post(`${API_BASE}/posts`, {
        category: postCategory,
        address: postAddress,
        text: postContent,
        image_ids: imageIds
      });

      loadPosts();
      resetForm();
    } catch (error) {
      console.error('Error adding post:', error);
      alert('保存失敗');
    }
  };

  const resetForm = () => {
    setPostCategory('商用');
    setPostAddress('');
    setPostContent('');
    setSelectedImages([]);
    setImagePreview([]);
    document.getElementById('imageUpload').value = '';
  };

  const filterPosts = (category, btn) => {
    setCurrentFilter(category);
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('文案已複製到剪貼簿！');
    }).catch(() => {
      alert('複製失敗');
    });
  };

  const downloadImages = (images) => {
    if (!images || images.length === 0) {
      alert('此貼文無圖片');
      return;
    }

    const imageIds = images.split(',').filter(Boolean);
    if (imageIds.length === 0) return;

    imageIds.forEach((id, index) => {
      setTimeout(() => {
        window.open(`${API_BASE.replace('/api', '')}/api/images/${id}`);
      }, index * 500);
    });
  };

  const deletePost = async (id) => {
    if (!window.confirm('確認刪除此貼文？')) return;

    try {
      await axios.delete(`${API_BASE}/posts/${id}`);
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const filteredPosts = currentFilter === '全部'
    ? posts
    : posts.filter(p => p.category === currentFilter);

  return (
    <div style={{ background: 'linear-gradient(135deg, #faf9f6 0%, #f8f9fa 100%)', minHeight: '100vh', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif', color: '#2c3e50' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '600', letterSpacing: '-0.5px', marginBottom: '12px', color: '#2c3e50' }}>FB 發文管理器</h1>
          <p style={{ fontSize: '0.95rem', color: '#888', fontWeight: '400' }}>輕鬆管理您的社群內容，一鍵複製與下載</p>
        </div>

        {/* Form Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', marginBottom: '40px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.02)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '28px', color: '#2c3e50' }}>建立新貼文</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.95rem', marginBottom: '10px', color: '#2c3e50', letterSpacing: '0.2px' }}>分類</label>
              <select value={postCategory} onChange={(e) => setPostCategory(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8', transition: 'all 0.3s ease', cursor: 'pointer', height: '44px', display: 'flex', alignItems: 'center' }}>
                <option value="商用">商用</option>
                <option value="住用">住用</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.95rem', marginBottom: '10px', color: '#2c3e50', letterSpacing: '0.2px' }}>地址</label>
              <input type="text" value={postAddress} onChange={(e) => setPostAddress(e.target.value)} placeholder="輸入房產地址..." style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8', height: '44px' }} />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.95rem', marginBottom: '10px', color: '#2c3e50', letterSpacing: '0.2px' }}>上傳圖片</label>
            <input type="file" id="imageUpload" multiple accept="image/*" onChange={handleImageChange} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8', cursor: 'pointer', height: '44px', display: 'flex', alignItems: 'center' }} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.95rem', marginBottom: '10px', color: '#2c3e50', letterSpacing: '0.2px' }}>貼文文案</label>
            <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="輸入您想發布的文案..." style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8', minHeight: '100px', resize: 'vertical', transition: 'all 0.3s ease' }} />
          </div>

          {imagePreview.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.95rem', marginBottom: '12px', color: '#2c3e50' }}>已選擇的圖片</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
                {imagePreview.map((img, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#f5f3f0', border: '1.5px solid #e8e7e4' }}>
                    <img src={img.data} alt={img.name} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                    <button onClick={() => removeImage(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(44, 62, 80, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={resetForm} style={{ padding: '12px 28px', border: '1.5px solid #e8e7e4', background: '#e8e7e4', borderRadius: '24px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600', color: '#2c3e50', transition: 'all 0.3s ease' }}>清空</button>
            <button onClick={addPost} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #b8a88f 0%, #a89680 100%)', color: 'white', border: 'none', borderRadius: '24px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600', transition: 'all 0.3s ease', flex: 1 }}>儲存貼文</button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['全部', '商用', '住用'].map((cat, i) => (
            <button key={cat} onClick={(e) => filterPosts(cat, e.target)} className="filter-btn" style={{ padding: '10px 22px', border: '1.5px solid #e8e7e4', background: i === 0 ? '#b8a88f' : 'white', color: i === 0 ? 'white' : '#666', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.3s ease' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredPosts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              <p>還沒有貼文，試著建立第一個吧！</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <div key={post.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
                <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '16px', width: 'fit-content', background: post.category === '商用' ? '#e8dcc8' : '#d9e4d4', color: post.category === '商用' ? '#9d7d54' : '#5a7c5b', letterSpacing: '0.3px' }}>
                  {post.category}
                </span>
                {post.address && (
                  <div style={{ color: post.category === '商用' ? '#9d7d54' : '#5a7c5b', fontSize: '0.9rem', marginBottom: '12px', padding: '8px 12px', background: post.category === '商用' ? '#e8dcc8' : '#d9e4d4', borderRadius: '8px', borderLeft: `3px solid ${post.category === '商用' ? '#b8a88f' : '#7fa87f'}` }}>
                    📍 {post.address}
                  </div>
                )}
                <div style={{ color: '#2c3e50', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '16px', maxHeight: '120px', overflowY: 'auto', padding: '12px', background: '#fafaf8', borderRadius: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {post.text}
                </div>
                {post.image_ids && post.image_ids.length > 0 && (
                  <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px' }}>
                    {post.image_ids.map(imgId => (
                      <img key={imgId} src={`${API_BASE}/images/${imgId}`} alt="" style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} onClick={() => window.open(`${API_BASE}/images/${imgId}`)} />
                    ))}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                  <button onClick={() => copyText(post.text)} style={{ padding: '10px 14px', background: '#b8a88f', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease' }}>📋 複製文案</button>
                  <button onClick={() => deletePost(post.id)} style={{ padding: '10px 14px', background: '#f0ebe4', color: '#c1665a', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', gridColumn: '1 / -1' }}>🗑️ 刪除</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
