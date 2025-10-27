# 🔧 CORS Error Fix Guide

## ❌ Current Issue:
CORS error when frontend (localhost:5174) tries to access backend (hotel-porter-d25ad83b12cf.herokuapp.com)

## ✅ Solutions (Choose One):

### **Solution 1: Use Local Backend (Recommended)**
```bash
# Start your local Django backend server
cd /path/to/backend
python manage.py runserver 8000
```
Frontend will automatically use `localhost:8000` in development mode.

### **Solution 2: Create .env.local for Development**
Create `.env.local` file to override production API URL:
```properties
VITE_API_URL=http://localhost:8000/api/
```

### **Solution 3: Configure Production Backend CORS**
Add your local development server to backend CORS_ALLOWED_ORIGINS:
```python
# In Django settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5174",
    "http://localhost:5175", 
    "http://127.0.0.1:5174",
    # ... other origins
]
```

### **Solution 4: Use CORS Proxy (Quick Fix)**
Install and use a CORS proxy:
```bash
npm install -g cors-anywhere
cors-anywhere
```

### **Solution 5: Disable CORS in Browser (Development Only)**
Start Chrome with disabled security (NOT RECOMMENDED for regular use):
```bash
chrome.exe --user-data-dir=/tmp/foo --disable-web-security
```

## 🎯 **Current API Configuration:**
- **Development**: `http://localhost:8000/api/` (when hostname is localhost)
- **Production**: `https://hotel-porter-d25ad83b12cf.herokuapp.com/api`

## 🔍 **Debug Information:**
Check browser console for:
- `🔧 Development mode: Attempting to use local backend`
- `🌐 Production mode: Using backend at [URL]`

## ⚡ **Quick Test:**
Open browser console and run:
```javascript
```

## 📝 **Recommended Action:**
1. Start your local Django backend server
2. Refresh the frontend 
3. The frontend should automatically connect to localhost:8000
