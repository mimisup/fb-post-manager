# FB 發文管理器

一個簡單而強大的 Web 應用，幫助你快速管理和發布 Facebook 社團文章。

## 功能特點

✨ **文案庫** - 存儲和快速複製常用文案  
🖼️ **圖片庫** - 管理商用和住用的圖片  
📋 **智能發文** - 快速組合文案和圖片創建帖子  
🏷️ **分類管理** - 區分商用和住用內容  

## 系統要求

- Python 3.8+
- Node.js 14+
- npm 或 yarn
- Mac/Linux/Windows

## 安裝步驟

### 1. 安裝後端依賴

```bash
cd backend
pip install -r requirements.txt
```

### 2. 安裝前端依賴

```bash
cd frontend
npm install
```

## 運行應用

### 終端 1 - 啟動後端服務器

```bash
cd backend
python app.py
```

後端將在 `http://localhost:5000` 運行

### 終端 2 - 啟動前端開發服務器

```bash
cd frontend
npm start
```

前端將在 `http://localhost:3000` 自動打開

## 使用方式

### 📝 文案庫
1. 選擇分類（商用 / 住用）
2. 在文本框輸入文案
3. 點擊「新增文案」保存
4. 點擊「複製」按鈕快速複製到剪貼簿

### 🖼️ 圖片庫
1. 選擇分類
2. 選擇圖片文件上傳
3. 可以刪除不需要的圖片

### 📋 發文助手
1. 選擇分類
2. 輸入文案
3. 選擇要附加的圖片（可多選）
4. 點擊「建立帖子」
5. 複製帖子到 Facebook 手動發布

## 項目結構

```
fb-post-manager/
├── backend/
│   ├── app.py              # Flask 主應用
│   ├── requirements.txt    # Python 依賴
│   └── fb_posts.db        # SQLite 數據庫
├── frontend/
│   ├── public/            # 靜態文件
│   ├── src/               # React 源代碼
│   ├── package.json       # npm 配置
│   └── node_modules/      # npm 依賴
└── README.md
```

## API 端點

### 文案相關
- `GET /api/copy-texts` - 獲取所有文案
- `POST /api/copy-texts` - 新增文案
- `DELETE /api/copy-texts/<id>` - 刪除文案

### 圖片相關
- `GET /api/images` - 獲取所有圖片
- `POST /api/images` - 上傳圖片
- `DELETE /api/images/<id>` - 刪除圖片

### 帖子相關
- `GET /api/posts` - 獲取所有帖子
- `POST /api/posts` - 建立新帖子
- `DELETE /api/posts/<id>` - 刪除帖子

## 故障排除

### 後端連接錯誤
- 確保後端在 5000 端口運行
- 檢查防火牆設置

### 圖片無法上傳
- 確保有 `uploads` 文件夾權限
- 檢查文件大小限制

### 前端無法加載
- 清除瀏覽器緩存
- 重新啟動開發服務器

## 許可證

MIT License

## 支持

有任何問題或建議，歡迎提出！
