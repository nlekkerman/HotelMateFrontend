# 🏨 HotelMate Frontend

> **Modern Hotel Management System Frontend** - A comprehensive React-based hotel management platform with entertainment features, staff management, inventory tracking, and real-time communication.

![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF?style=for-the-badge&logo=vite)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.7-7952B3?style=for-the-badge&logo=bootstrap)
![Pusher](https://img.shields.io/badge/Pusher-8.4.0-300D4F?style=for-the-badge&logo=pusher)

---

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📁 Project Structure](#-project-structure)
- [🎮 Entertainment System](#-entertainment-system)
- [🔧 Configuration](#-configuration)
- [🌐 API Integration](#-api-integration)
- [📱 Responsive Design](#-responsive-design)
- [🔒 Security](#-security)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)

---

## 🌟 Features

### 🏨 **Core Hotel Management**
- **Staff Management** - Complete staff roster, scheduling, and clock-in/out system
- **Room Management** - Room status tracking, housekeeping, and maintenance
- **Guest Services** - Guest check-in/out, requests, and communication
- **Inventory Tracking** - Stock management with low-stock alerts and analytics
- **Restaurant Management** - Menu management, orders, and kitchen workflows
- **Maintenance System** - Work orders, scheduling, and equipment tracking

### 🎮 **Entertainment Platform**
- **Memory Match Game** - Tournament-ready brain training game with:
  - Multiple difficulty levels (Easy 4x4, Intermediate 6x6, Hard 8x8)
  - Tournament registration and leaderboards
  - Real-time scoring and statistics
  - Offline support with automatic sync
- **Whack-a-Mole Game** - Fast-paced arcade game
- **Games Dashboard** - Centralized entertainment management

### 💬 **Communication**
- **Real-time Chat** - Department-based messaging with Pusher integration
- **Notifications** - Browser-based instant alerts for important updates
- **File Sharing** - Document and image sharing capabilities

### 📊 **Analytics & Reporting**
- **Staff Analytics** - Attendance, performance, and roster insights
- **Stock Analytics** - Inventory trends and consumption reports
- **Game Statistics** - Player performance and tournament data
- **PDF Export** - Comprehensive reporting system

### 🔧 **Advanced Features**
- **Offline Support** - Works without internet, syncs when online
- **Multi-theme Support** - Customizable UI themes per hotel
- **Face Recognition** - AI-powered staff clock-in system
- **QR Code Integration** - Tournament registration and quick access
- **Responsive Design** - Perfect on desktop, tablet, and mobile

---

## 🏗️ Architecture

### **Frontend Stack**
- **React 19.1.0** - Modern React with hooks and context
- **Vite 6.3.5** - Lightning-fast build tool and dev server
- **Bootstrap 5.3.7** - Responsive UI framework
- **React Router 7.6.0** - Client-side routing
- **Axios** - HTTP client for API communication

### **State Management**
- **React Context** - Global state for auth, themes, and UI
- **React Query** - Server state management and caching
- **Local Storage** - Offline data persistence

### **Real-time Features**
- **Pusher** - WebSocket connections for live chat and real-time updates
- **Browser Notifications** - Native notification API for instant alerts

### **Development Tools**
- **ESLint** - Code linting and quality checks
- **Vite HMR** - Hot module replacement for fast development
- **Path Aliases** - Clean import paths with `@/` prefix

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ and npm/yarn
- Backend API running (HotelMate Backend)
- Modern web browser

### **Installation**

```bash
# Clone the repository
git clone https://github.com/nlekkerman/HotelMateFrontend.git
cd HotelMateFrontend/hotelmate-frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Configure environment variables
# See Configuration section below

# Start development server
npm run dev
```

### **Development Server**
```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## 📁 Project Structure

```
hotelmate-frontend/
├── public/                      # Static assets
│   ├── models/                  # Face recognition models
│   └── ...
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── analytics/           # Analytics components
│   │   ├── attendance/          # Staff attendance
│   │   ├── auth/               # Authentication
│   │   ├── bookings/           # Hotel bookings
│   │   ├── chat/               # Real-time messaging
│   │   ├── guests/             # Guest management
│   │   ├── layout/             # Layout components
│   │   ├── maintenance/        # Maintenance system
│   │   ├── restaurants/        # Restaurant management
│   │   ├── rooms/              # Room management
│   │   ├── staff/              # Staff management
│   │   └── stock_tracker/      # Inventory tracking
│   ├── context/                # React Context providers
│   │   ├── AuthContext.jsx     # Authentication state
│   │   ├── ChatContext.jsx     # Chat state
│   │   ├── ThemeContext.jsx    # Theme management
│   │   └── UIContext.jsx       # UI state
│   ├── games/                  # Entertainment platform
│   │   ├── memory-match/       # Memory Match Game
│   │   │   ├── components/     # Game components
│   │   │   ├── pages/          # Game pages
│   │   │   └── assets/         # Game assets
│   │   ├── whack-a-mole/       # Whack-a-Mole Game
│   │   └── GamesDashboard.jsx  # Games hub
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Main application pages
│   ├── services/               # API services
│   │   ├── api.js              # Main API client
│   │   ├── memoryGameAPI.js    # Game API service
│   │   └── ...
│   ├── styles/                 # Global styles
│   ├── utils/                  # Utility functions
│   ├── App.jsx                 # Main App component
│   └── main.jsx                # Application entry point
├── .env.example                # Environment template
├── vite.config.js              # Vite configuration
└── package.json                # Dependencies and scripts
```

---

## 🎮 Entertainment System

### **Memory Match Game**
Tournament-ready brain training game with comprehensive features:

```jsx
// Game Features
- Multiple Difficulty Levels (4x4, 6x6, 8x8)
- Tournament Registration & Management
- Real-time Leaderboards (Global & Tournament)
- Comprehensive Statistics Dashboard
- Offline Support with Auto-sync
- Personal Best Tracking
- Achievement System
```

### **Game Integration**
```javascript
// API Integration
import { memoryGameAPI } from '@/services/memoryGameAPI';

// Save game score
const gameSession = await memoryGameAPI.saveGameSession({
  difficulty: 'easy',
  time_seconds: 120,
  moves_count: 24,
  completed: true
});

// Get user statistics
const stats = await memoryGameAPI.getUserStats();

// Tournament registration
await memoryGameAPI.registerForTournament(tournamentId, {
  participant_name: 'John Doe',
  participant_age: 25
});
```

### **Scoring System**
```javascript
Score = (Difficulty Multiplier × 1000) - (Time × 2) - (Extra Moves × 5)

Multipliers:
- Easy (4x4): 1.0×    → Max 1000 points
- Intermediate (6x6): 1.5× → Max 1500 points  
- Hard (8x8): 2.0×    → Max 2000 points
```

---

## 🔧 Configuration

### **Environment Variables**
Create `.env.local` file in the project root:

```env
# API Configuration
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_WEBSOCKET_URL=wss://your-websocket-domain.com

# Pusher Configuration (Chat)
VITE_PUSHER_APP_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=your_cluster

# Development
VITE_DEBUG_MODE=true
VITE_ENABLE_LOGGING=true
```

### **Pusher Setup**
1. Create account at https://pusher.com
2. Create new app
3. Get app credentials
4. Configure channels for chat functionality

---

## 🌐 API Integration

### **Main API Client**
```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### **API Services**
- **Authentication** - Login, logout, user management
- **Staff Management** - CRUD operations, scheduling
- **Inventory** - Stock tracking, analytics, alerts
- **Games** - Score saving, tournaments, leaderboards
- **Chat** - Message history, file uploads
- **Analytics** - Reports, statistics, exports

### **Error Handling**
```javascript
// Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle authentication errors
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 📱 Responsive Design

### **Breakpoint Strategy**
```css
/* Mobile First Approach */
/* Mobile: < 576px */
/* Tablet: 576px - 992px */
/* Desktop: > 992px */

/* Bootstrap Classes Used */
.col-12.col-md-6.col-lg-4    /* Responsive grid */
.d-none.d-md-block           /* Hide on mobile */
.order-1.order-md-2          /* Reorder elements */
```

### **Mobile Optimizations**
- Touch-friendly interfaces
- Optimized game controls
- Collapsible navigation
- Swipe gestures support
- Reduced data usage in offline mode

### **Performance**
- Lazy loading for components
- Image optimization
- Code splitting by routes
- Service worker for caching
- Bundle size optimization

---

## 🔒 Security

### **Authentication**
- JWT token-based authentication
- Automatic token refresh
- Secure token storage
- Session timeout handling

### **Authorization**
```javascript
// Role-based access control
const usePermissions = () => {
  const { user } = useAuth();
  
  return {
    canManageStaff: user?.role === 'admin',
    canViewAnalytics: ['admin', 'manager'].includes(user?.role),
    canClockIn: user?.role === 'staff'
  };
};
```

### **Data Protection**
- Input validation and sanitization
- XSS protection
- CSRF protection via backend
- Secure API communication (HTTPS)
- No sensitive data in localStorage

---

## 🧪 Testing

### **Testing Strategy**
```bash
# Unit Tests (Coming Soon)
npm run test

# E2E Tests (Coming Soon)  
npm run test:e2e

# Component Testing
npm run test:components
```

### **Testing Guidelines**
- Test critical user flows
- Mock API responses
- Test responsive behavior
- Validate accessibility
- Performance testing

---

## 🚀 Deployment

### **Production Build**
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Analyze bundle size
npm run build -- --analyze
```

### **Deployment Options**

#### **Netlify (Recommended)**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

#### **Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

#### **Traditional Hosting**
1. Run `npm run build`
2. Upload `dist/` folder to web server
3. Configure web server for SPA routing
4. Set up SSL certificate

### **Environment Configuration**
- Production API URLs
- Pusher production configuration
- Error tracking (Sentry)
- Analytics (Google Analytics)

---

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Code Standards**
- Use ESLint configuration
- Follow React best practices
- Write descriptive commit messages
- Add comments for complex logic
- Maintain responsive design

### **Pull Request Guidelines**
- Update documentation
- Add tests for new features
- Ensure all tests pass
- Maintain backwards compatibility
- Follow semantic versioning

---

## 📞 Support & Documentation

### **Resources**
- **API Documentation** - Backend API reference
- **Component Library** - UI component documentation
- **Deployment Guide** - Step-by-step deployment
- **Troubleshooting** - Common issues and solutions

### **Support Channels**
- GitHub Issues - Bug reports and feature requests
- Discussions - General questions and ideas
- Wiki - Detailed documentation and guides

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🏆 Acknowledgments

- **React Team** - For the amazing framework
- **Vite Team** - For the blazing fast build tool
- **Bootstrap Team** - For the responsive UI framework
- **Pusher Team** - For real-time communication features
- **Open Source Community** - For countless helpful libraries

---

<div align="center">

**Built with ❤️ for the hospitality industry**

[🌟 Star this project](https://github.com/nlekkerman/HotelMateFrontend) | [🐛 Report Bug](https://github.com/nlekkerman/HotelMateFrontend/issues) | [💡 Request Feature](https://github.com/nlekkerman/HotelMateFrontend/issues)

</div>
