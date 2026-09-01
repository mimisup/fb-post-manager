import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import './App.css';

const SUPABASE_URL = 'https://vqaetehnmsutaszzzdvz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxYWV0ZWhubXN1dGFzenp6ZHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNzE1NTgsImV4cCI6MjEwMzY0NzU1OH0.psuxi1DjezRX-tTjh4ZOrIsL07LelwM8qMrhJ9DJDyk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('全部');
  const [postCategory, setPostCategory] = useState('商用');
  const [postAddress, setPostAddress] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchAddress, setSearchAddress] = useState('');
  const [searchText, setSearchText] = useState('');
  const [editingImages, setEditingImages] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedPostImages, setSelectedPostImages] = useState({});
  const [csvData, setCsvData] = useState([]);
  const [importProgress, setImportProgress] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  };

  const signInWithEmail = async () => {
    if (!loginEmail || !loginPassword) {
      alert('請輸入帳號和密碼');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });
      if (error) throw error;
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error('登入失敗:', error);
      alert('帳號或密碼錯誤');
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
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
      let failedCount = 0;

      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        try {
          const timestamp = Date.now() + i;
          const randomStr = Math.random().toString(36).substring(7);
          const ext = file.name.split('.').pop() || 'jpg';
          const fileName = `${timestamp}-${randomStr}.${ext}`;

          console.log(`上傳 ${i + 1}/${selectedImages.length}:`, fileName);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('images')
            .upload(fileName, file, { upsert: false });

          if (!uploadError && uploadData) {
            const { data: imgData } = await supabase.from('images').insert({
              category: postCategory,
              filename: file.name,
              filepath: uploadData.path
            }).select();

            if (imgData && imgData.length > 0) {
              imageIds.push(uploadData.path);
            }
          } else {
            console.error(`圖片 ${i + 1} 上傳失敗:`, uploadError);
            failedCount++;
          }
        } catch (err) {
          console.error(`圖片 ${i + 1} 上傳異常:`, err);
          failedCount++;
        }
      }

      // 始終顯示上傳結果
      if (failedCount > 0) {
        alert(`⚠️ 上傳結果：成功 ${imageIds.length} 張，失敗 ${failedCount} 張`);
      } else if (selectedImages.length > 0) {
        alert(`✅ 已上傳 ${imageIds.length} 張圖片`);
      }

      const { error: postError } = await supabase.from('posts').insert({
        category: postCategory,
        address: postAddress,
        text: postContent,
        image_ids: imageIds.join(',')
      });

      if (postError) throw postError;
      alert('✅ 貼文已儲存');
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

  const copyText = (text) => {
    navigator.clipboard.writeText(text).catch(() => {
      alert('複製失敗');
    });
  };

  const shareSelectedImages = async (postId, imageIds) => {
    const selectedIds = selectedPostImages[postId] || [];
    if (selectedIds.length === 0) {
      alert('請先勾選要分享的圖片');
      return;
    }

    try {
      const files = await Promise.all(
        selectedIds.map(async (imageId) => {
          const response = await fetch(`${SUPABASE_URL}/storage/v1/object/public/images/${imageId}`);
          const blob = await response.blob();
          return new File([blob], imageId.split('/').pop() || 'image.jpg', { type: 'image/jpeg' });
        })
      );

      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files: files,
          title: '分享圖片',
          text: '分享到相簿'
        });
        setSelectedPostImages({ ...selectedPostImages, [postId]: [] });
      } else {
        alert('您的設備不支持分享功能，請升級 iOS 或使用其他瀏覽器');
      }
    } catch (error) {
      console.error('分享失敗:', error);
    }
  };

  const toggleImageSelection = (postId, imageId) => {
    const selected = selectedPostImages[postId] || [];
    const newSelected = selected.includes(imageId)
      ? selected.filter(id => id !== imageId)
      : [...selected, imageId];
    setSelectedPostImages({ ...selectedPostImages, [postId]: newSelected });
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
      },
      error: (error) => {
        alert(`CSV 解析失敗: ${error.message}`);
      }
    });
  };

  const importFromCsv = async () => {
    if (csvData.length === 0) {
      alert('請先上傳 CSV 檔案');
      return;
    }

    const confirmed = window.confirm(`確認匯入 ${csvData.length} 筆貼文？`);
    if (!confirmed) return;

    setImportProgress(0);
    let successCount = 0;

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const 分類 = row.分類 || row.category;
      const 地址 = row.地址 || row.address;
      const 文案 = row.文案 || row.text;

      if (!分類 || !文案) {
        console.warn(`第 ${i + 1} 行：缺少分類或文案`);
        continue;
      }

      try {
        let imageIds = [];

        const { error: postError } = await supabase.from('posts').insert({
          category: 分類,
          address: 地址 || '',
          text: 文案,
          image_ids: imageIds.join(',')
        });

        if (!postError) {
          successCount++;
        }
      } catch (error) {
        console.error(`第 ${i + 1} 行匯入失敗:`, error);
      }

      setImportProgress(((i + 1) / csvData.length) * 100);
    }

    alert(`匯入完成！成功: ${successCount}/${csvData.length}`);
    setCsvData([]);
    setImportProgress(0);
    loadPosts();
  };

  const downloadAllImages = async (imageIds) => {
    if (!imageIds || imageIds.length === 0) {
      alert('此貼文無圖片');
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${imageId}`;

      if (isIOS) {
        setTimeout(() => {
          window.open(imageUrl, '_blank');
        }, i * 30);
      } else {
        setTimeout(async () => {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = imageId.split('/').pop() || `image-${i}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('下載失敗:', error);
          }
        }, i * 100);
      }
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm('確認刪除此貼文？')) return;

    try {
      await supabase.from('posts').delete().eq('id', id);
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditData({
      category: post.category,
      address: post.address || '',
      text: post.text || '',
      image_ids: post.image_ids || ''
    });
    setEditingImages({ [post.id]: [] });
  };

  const handleEditImageUpload = async (postId, files) => {
    const newImages = editingImages[postId] || [];

    for (const file of files) {
      try {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file);

        if (!uploadError && uploadData) {
          newImages.push(uploadData.path);
        }
      } catch (error) {
        console.error('圖片上傳失敗:', error);
      }
    }

    setEditingImages({ ...editingImages, [postId]: newImages });
  };

  const saveEdit = async () => {
    try {
      const newImages = editingImages[editingId] || [];
      const existingImages = editData.image_ids ? editData.image_ids.split(',').filter(Boolean) : [];
      const allImages = [...existingImages, ...newImages].join(',');

      await supabase.from('posts').update({
        ...editData,
        image_ids: allImages
      }).eq('id', editingId);

      loadPosts();
      setEditingId(null);
      setEditData({});
      setEditingImages({});
    } catch (error) {
      console.error('Error updating post:', error);
      alert('編輯失敗');
    }
  };

  const markAsPosted = async (postId) => {
    try {
      const now = new Date().toISOString();
      await supabase.from('posts').update({ posted_at: now }).eq('id', postId);
      loadPosts();
    } catch (error) {
      console.error('Error marking as posted:', error);
      alert('記錄失敗');
    }
  };

  const getTodayPostedCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return posts.filter(p => p.posted_at && p.posted_at.split('T')[0] === today).length;
  };

  const getYesterdayPostedCount = () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    return posts.filter(p => p.posted_at && p.posted_at.split('T')[0] === yesterday).length;
  };

  const filteredPosts = posts
    .filter(p => {
      if (currentFilter === '全部') return true;
      if (currentFilter === '未發文') return !p.posted_at;
      if (currentFilter === '已發文') return !!p.posted_at;
      if (currentFilter === '未有照片') return !p.image_ids || p.image_ids.trim().length === 0;
      return p.category === currentFilter;
    })
    .filter(p => !searchAddress || (p.address && p.address.includes(searchAddress)))
    .filter(p => !searchText || (p.text && p.text.includes(searchText)));

  if (!user) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #faf9f6 0%, #f8f9fa 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif', padding: '20px' }}>
        <div style={{ maxWidth: '400px', width: '100%', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '8px', textAlign: 'center', color: '#2c3e50' }}>FB 發文管理器</h1>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '32px', textAlign: 'center' }}>請登入以管理您的房產貼文</p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: '#2c3e50' }}>帳號</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="輸入信箱"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: '#2c3e50' }}>密碼</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="輸入密碼"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={signInWithEmail}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #b8a88f 0%, #a89680 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease' }}
          >
            🔐 登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #faf9f6 0%, #f8f9fa 100%)', minHeight: '100vh', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif', color: '#2c3e50' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '24px' : '50px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '600', letterSpacing: '-0.5px', marginBottom: '8px', color: '#2c3e50' }}>FB 發文管理器</h1>
            <p style={{ fontSize: isMobile ? '0.8rem' : '0.95rem', color: '#888', fontWeight: '400' }}>輕鬆管理您的社群內容，一鍵複製與下載</p>
          </div>
          <button onClick={signOut} style={{ padding: '10px 20px', background: '#f0ebe4', color: '#c1665a', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'nowrap', marginLeft: '16px' }}>🚪 登出</button>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '20px' : '40px', marginBottom: '40px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: '600', color: '#2c3e50', margin: 0 }}>建立新貼文</h2>
            <button onClick={() => setIsCreateFormOpen(!isCreateFormOpen)} style={{ padding: '8px 16px', background: isCreateFormOpen ? '#b8a88f' : '#e8e7e4', color: isCreateFormOpen ? 'white' : '#666', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              {isCreateFormOpen ? '▼ 收合' : '▶ 展開'}
            </button>
          </div>

          {isCreateFormOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            <button onClick={() => document.getElementById('csvFile').click()} style={{ padding: '12px', background: '#d4c5b9', color: '#6b5544', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>📋 匯入 CSV</button>
            {csvData.length > 0 && (
              <button onClick={importFromCsv} style={{ padding: '12px', background: '#7fa87f', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>✅ 開始匯入 ({csvData.length})</button>
            )}
          </div>
          <input type="file" id="csvFile" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />

          {csvData.length > 0 && (
            <div style={{ marginBottom: '28px', padding: '12px', background: '#f5f5f5', borderRadius: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '12px' }}>預覽 ({csvData.length} 筆)</h3>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>分類</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>地址</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>文案</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{row.分類}</td>
                      <td style={{ padding: '8px' }}>{row.地址}</td>
                      <td style={{ padding: '8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.文案}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.length > 5 && <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '8px' }}>...還有 {csvData.length - 5} 筆</p>}
            </div>
          )}

          {importProgress > 0 && importProgress < 100 && (
            <div style={{ marginBottom: '28px', padding: '12px', background: '#e8dcc8', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>匯入進度: {Math.round(importProgress)}%</div>
              <div style={{ width: '100%', height: '8px', background: '#ddd', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${importProgress}%`, height: '100%', background: '#7fa87f', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          )}

          <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: '600', marginBottom: isMobile ? '16px' : '28px', color: '#2c3e50' }}>或建立新貼文</h2>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
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
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.95rem', marginBottom: '10px', color: '#2c3e50', letterSpacing: '0.2px' }}>查詢地址</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input type="text" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} placeholder="輸入地址搜尋..." style={{ flex: 1, padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8' }} />
            <button onClick={() => setSearchAddress('')} style={{ padding: '12px 20px', background: '#e8e7e4', color: '#666', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>清除</button>
          </div>

          <label style={{ display: 'block', fontWeight: '600', fontSize: '0.95rem', marginBottom: '10px', color: '#2c3e50', letterSpacing: '0.2px' }}>查詢文案</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="輸入文案搜尋..." style={{ flex: 1, padding: '12px 14px', border: '1.5px solid #e8e7e4', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', color: '#2c3e50', background: '#fafaf8' }} />
            <button onClick={() => setSearchText('')} style={{ padding: '12px 20px', background: '#e8e7e4', color: '#666', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>清除</button>
          </div>
        </div>

        {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
          <div style={{ marginBottom: '32px', padding: '14px', background: '#e8dcc8', borderRadius: '12px', border: '1px solid #d4c5b9' }}>
            <div style={{ fontSize: '0.9rem', color: '#6b5544', lineHeight: '1.6' }}>
              <strong>💡 iPhone 用戶提示：</strong><br/>
              👆 點擊圖片勾選 → 點「📱 分享到相簿」→ 選「保存圖片」，圖片就會存入相簿！
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '16px', background: '#faf9f6', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>📅 今日發文</p>
            <p style={{ fontSize: '1.8rem', fontWeight: '700', color: '#b8a88f' }}>{getTodayPostedCount()} 篇</p>
          </div>
          <div style={{ padding: '16px', background: '#faf9f6', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>📆 昨日發文</p>
            <p style={{ fontSize: '1.8rem', fontWeight: '700', color: '#b8a88f' }}>{getYesterdayPostedCount()} 篇</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['全部', '商用', '住用', '未發文', '已發文', '未有照片'].map((cat) => (
            <button key={cat} onClick={() => setCurrentFilter(cat)} style={{ padding: '10px 22px', border: '1.5px solid #e8e7e4', background: currentFilter === cat ? '#b8a88f' : 'white', color: currentFilter === cat ? 'white' : '#666', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.3s ease' }}>
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredPosts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              <p>還沒有貼文，試著建立第一個吧！</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <div key={post.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
                {editingId === post.id ? (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: '#2c3e50' }}>分類</label>
                      <select value={editData.category} onChange={(e) => setEditData({...editData, category: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e8e7e4', borderRadius: '8px', fontSize: '0.9rem' }}>
                        <option value="商用">商用</option>
                        <option value="住用">住用</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: '#2c3e50' }}>地址</label>
                      <input type="text" value={editData.address} onChange={(e) => setEditData({...editData, address: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e8e7e4', borderRadius: '8px', fontSize: '0.9rem' }} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: '#2c3e50' }}>文案</label>
                      <textarea value={editData.text} onChange={(e) => setEditData({...editData, text: e.target.value})} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e8e7e4', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }} />
                    </div>

                    {editData.image_ids && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: '#2c3e50' }}>現有圖片</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                          {editData.image_ids.split(',').filter(Boolean).map((id, idx) => (
                            <div key={idx} style={{ position: 'relative', width: '100%', height: '60px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden' }}>
                              <img src={`${SUPABASE_URL}/storage/v1/object/public/images/${id}`} alt="existing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                              <button onClick={() => {
                                const remaining = editData.image_ids.split(',').filter(Boolean).filter((_, i) => i !== idx).join(',');
                                setEditData({...editData, image_ids: remaining});
                              }} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px', color: '#2c3e50' }}>新增圖片</label>
                      <input type="file" multiple accept="image/*" onChange={(e) => handleEditImageUpload(editingId, Array.from(e.target.files))} style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e8e7e4', borderRadius: '8px', fontSize: '0.9rem' }} />

                      {(editingImages[editingId] || []).length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                            {(editingImages[editingId] || []).map((id, idx) => (
                              <div key={idx} style={{ position: 'relative', width: '100%', height: '60px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden' }}>
                                <img src={`${SUPABASE_URL}/storage/v1/object/public/images/${id}`} alt="new" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                <button onClick={() => {
                                  const newImages = (editingImages[editingId] || []).filter((_, i) => i !== idx);
                                  setEditingImages({ ...editingImages, [editingId]: newImages });
                                }} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#7fa87f' }}>✅ 已上傳 {(editingImages[editingId] || []).length} 張新圖片</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                      <button onClick={saveEdit} style={{ padding: '10px 14px', background: '#b8a88f', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>💾 保存</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '10px 14px', background: '#e8e7e4', color: '#666', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>✕ 取消</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '700', width: 'fit-content', background: post.category === '商用' ? '#e8dcc8' : '#d9e4d4', color: post.category === '商用' ? '#9d7d54' : '#5a7c5b', letterSpacing: '0.3px' }}>
                        {post.category}
                      </span>
                      <button onClick={() => markAsPosted(post.id)} style={{ padding: '6px 12px', background: post.posted_at ? '#7fa87f' : '#f0ebe4', color: post.posted_at ? 'white' : '#888', border: 'none', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>
                        {post.posted_at ? `✓ ${new Date(post.posted_at).toLocaleDateString('zh-TW')} ${new Date(post.posted_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}` : '標記為已發'}
                      </button>
                    </div>
                    {post.address && (
                      <div style={{ color: post.category === '商用' ? '#9d7d54' : '#5a7c5b', fontSize: '0.9rem', marginBottom: '12px', padding: '8px 12px', background: post.category === '商用' ? '#e8dcc8' : '#d9e4d4', borderRadius: '8px', borderLeft: `3px solid ${post.category === '商用' ? '#b8a88f' : '#7fa87f'}` }}>
                        📍 {post.address}
                      </div>
                    )}
                    {post.image_ids && post.image_ids.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px' }}>
                          {post.image_ids.split(',').filter(Boolean).map(id => {
                            const isSelected = (selectedPostImages[post.id] || []).includes(id);
                            return (
                              <div key={id} onClick={() => toggleImageSelection(post.id, id)} style={{ width: '100%', height: '70px', backgroundColor: '#f0f0f0', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', position: 'relative', border: isSelected ? '3px solid #b8a88f' : 'none', boxSizing: 'border-box' }}>
                                <img src={`${SUPABASE_URL}/storage/v1/object/public/images/${id}`} alt="post" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isSelected ? 0.7 : 1 }} onError={(e) => e.target.style.display = 'none'} />
                                {isSelected && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px' }}>✓</div>}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button onClick={() => downloadAllImages(post.image_ids.split(',').filter(Boolean))} style={{ width: '100%', padding: '8px', background: '#b8a88f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>⬇️ 下載全部</button>
                          {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                            <button onClick={() => shareSelectedImages(post.id, post.image_ids.split(',').filter(Boolean))} style={{ width: '100%', padding: '8px', background: '#b8a88f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>📱 分享到相簿</button>
                          )}
                        </div>
                      </div>
                    )}
                    <div style={{ color: '#2c3e50', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '16px', maxHeight: '120px', overflowY: 'auto', padding: '12px', background: '#fafaf8', borderRadius: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {post.text}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                      <button onClick={() => copyText(post.text)} style={{ padding: '10px 14px', background: '#b8a88f', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease' }}>📋 文案</button>
                      {post.address && (
                        <button onClick={() => copyText(post.address)} style={{ padding: '10px 14px', background: '#b8a88f', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease' }}>📍 地址</button>
                      )}
                      <button onClick={() => startEdit(post)} style={{ padding: '10px 14px', background: '#d4c5b9', color: '#6b5544', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease' }}>✏️ 編輯</button>
                      <button onClick={() => deletePost(post.id)} style={{ padding: '10px 14px', background: '#f0ebe4', color: '#c1665a', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', gridColumn: '1 / -1' }}>🗑️ 刪除</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
