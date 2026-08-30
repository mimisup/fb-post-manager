#!/bin/bash

# FB 發文管理器 - 快速啟動腳本

echo "🚀 FB 發文管理器 - 啟動中..."
echo ""

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 請先安裝 Python 3"
    exit 1
fi

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 請先安裝 Node.js"
    exit 1
fi

# 檢查並安裝後端依賴
echo "📦 檢查後端依賴..."
cd backend
if [ ! -d "venv" ]; then
    echo "建立虛擬環境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "✅ 後端依賴已安裝"

# 啟動後端
echo ""
echo "🔧 啟動後端服務器 (Port 5000)..."
python app.py &
BACKEND_PID=$!

# 等待後端啟動
sleep 2

# 檢查並安裝前端依賴
cd ../frontend
echo ""
echo "📦 檢查前端依賴..."
if [ ! -d "node_modules" ]; then
    echo "安裝 npm 套件..."
    npm install -q
fi
echo "✅ 前端依賴已安裝"

# 啟動前端
echo ""
echo "🎨 啟動前端應用 (Port 3000)..."
npm start &
FRONTEND_PID=$!

# 等待應用啟動
sleep 3

echo ""
echo "✨ 應用已啟動！"
echo ""
echo "📍 前端: http://localhost:3000"
echo "📍 後端: http://localhost:5000"
echo ""
echo "按 Ctrl+C 停止應用"

# 等待進程
wait $BACKEND_PID $FRONTEND_PID
