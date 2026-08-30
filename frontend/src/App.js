import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [posts, setPosts] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('全區');
  const [postCategory, setPostCategory] = useState('商用');
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/posts`);
      const postsWithImages = await Promise.all(res.data.map(async (post) => {
        const imagePromises = post.image_ids.map(id =>
          axios.get(`${API_BASE}/images`).then(res => {
            const img = res.data.find(i => i.id === id);
            return img ? { name: img.filename, url: `../${img.filepath}` } : null;
          }).catch(() => null)
        );
        const images = await Promise.all(imagePromises);
        return { ...post, images: images.filter(Boolean) };
      }));
      setPosts(postsWithImages);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const addPost = async () => {
    if (!postContent.trim() && postImages.length === 0) {
      alert('請輸入文案或選擇圖片！');
      return;
    }

    try {
      const imageDataArray = [];
      for (const file of postImages) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (e) => {
            imageDataArray.push({ name: file.name, url: e.target.result });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }

      const newPost = {
        id: Date.now(),
        category: postCategory,
        content: postContent,
        images: imageDataArray
      };

      await axios.post(`${API_BASE}/posts`, {
        category: postCategory,
        text: postContent,
        image_ids: []
      });

      setPosts([newPost, ...posts]);
      setPostContent('');
      setPostImages([]);
    } catch (error) {
      console.error('Error adding post:', error);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('文案已複製到剪貼簿！');
    }).catch(() => {
      alert('複製失敗，請手動複製');
    });
  };

  const downloadImages = (images, postId) => {
    if (!images || images.length === 0) {
      alert('此貼文無圖片');
      return;
    }

    images.forEach((img, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = img.url;
        a.download = img.name || `post-${postId}-image-${index + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 300);
    });
  };

  const deletePost = async (postId) => {
    try {
      await axios.delete(`${API_BASE}/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const filterPosts = (category) => {
    setCurrentFilter(category);
  };

  const filteredPosts = currentFilter === '全區'
    ? posts
    : posts.filter(p => p.category === currentFilter);

  return (
    <div style={{ backgroundColor: '#f4f6f8', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#1877f2', textAlign: 'center' }}>FB 發文管理器</h1>

      {/* 新增貼文表單 */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>選擇分類</label>
          <select
            value={postCategory}
            onChange={(e) => setPostCategory(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
          >
            <option value="商用">商用</option>
            <option value="住用">住用</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>貼文文案</label>
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="輸入要預設的文案..."
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', height: '100px', resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>上傳圖片（可多選）</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setPostImages(Array.from(e.target.files))}
            style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
          />
        </div>

        <button
          onClick={addPost}
          style={{ backgroundColor: '#1877f2', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%' }}
        >
          儲存貼文庫
        </button>
      </div>

      {/* 分類篩選 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {['全區', '商用', '住用'].map(cat => (
          <button
            key={cat}
            onClick={() => filterPosts(cat)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: currentFilter === cat ? '#1877f2' : '#e4e6eb',
              color: currentFilter === cat ? 'white' : 'black',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 貼文列表 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredPosts.map(post => (
          <div
            key={post.id}
            style={{ background: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <span style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '10px',
                background: post.category === '商用' ? '#e7f3ff' : '#eef7ee',
                color: post.category === '商用' ? '#1877f2' : '#2e7d32'
              }}>
                {post.category}
              </span>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '15px', maxHeight: '120px', overflowY: 'auto', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
                {post.content}
              </div>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '15px' }}>
                {post.images && post.images.map((img, idx) => (
                  <img key={idx} src={img.url} alt={img.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => copyText(post.content)}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', background: '#42b72a', color: 'white' }}
              >
                複製文案
              </button>
              <button
                onClick={() => downloadImages(post.images, post.id)}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', background: '#1877f2', color: 'white' }}
              >
                下載圖片 ({post.images ? post.images.length : 0})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
