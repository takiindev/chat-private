# Chat Private - Ứng dụng Chat Ẩn Danh

Ứng dụng chat ẩn danh được xây dựng với React + Vite và Firebase Firestore.

## Tính năng

- ✅ Chat ẩn danh với tên tự động (Ẩn danh 1, 2, 3...)
- ✅ Có thể đặt tên tùy chỉnh
- ✅ Giao diện đẹp như Telegram, responsive
- ✅ Lưu trữ tin nhắn bằng Firebase Firestore
- ✅ Real-time chat (nếu bật VITE_ENABLE_REALTIME)
- ✅ Giới hạn 200 tin nhắn (tự động xóa tin nhắn cũ)
- ✅ Lưu thông tin người dùng trong localStorage

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd chat-private
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Setup Firebase:
   - Tạo project mới trên [Firebase Console](https://console.firebase.google.com/)
   - Tạo Firestore Database
   - Lấy config từ Project Settings > General > Your apps
   - Copy file `.env.example` thành `.env`
   - Điền thông tin Firebase vào file `.env`

4. Chạy ứng dụng:
```bash
npm run dev
```

## Cấu hình Firebase

1. Đi tới [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Thêm app web mới
4. Copy config và paste vào file `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

5. Tạo Firestore Database:
   - Đi tới Firestore Database
   - Tạo database mới
   - Chọn mode "Test mode" (hoặc setup security rules)

## Cấu hình Environment

File `.env` hỗ trợ các options sau:

```env
# Firebase (bắt buộc)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Chat settings
VITE_MAX_MESSAGES=200                # Giới hạn số tin nhắn
VITE_MAX_MESSAGE_LENGTH=1000         # Giới hạn độ dài tin nhắn
VITE_MAX_USERNAME_LENGTH=30          # Giới hạn độ dài tên

# Features
VITE_ENABLE_REALTIME=true           # Bật real-time updates
VITE_DEBUG_MODE=true                # Debug mode
```

## Tech Stack

- **Frontend**: React 18 + Vite
- **Database**: Firebase Firestore
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: React Hooks+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
