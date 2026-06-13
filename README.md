# 🎨 SketchSync

**Live Demo**: [https://sketch-sync-nine.vercel.app/](https://sketch-sync-nine.vercel.app/)

SketchSync is a real-time, collaborative whiteboard application. It allows multiple users to draw, brainstorm, and collaborate on a shared digital canvas seamlessly.

## ✨ Features
- **Real-Time Collaboration**: Changes made by one user instantly appear for everyone else via WebSockets (Socket.IO).
- **Persistent Canvases**: All drawings and boards are securely stored in a MongoDB database so you never lose your work.
- **Scalable Architecture**: Optional Redis adapter integration for scaling WebSocket connections across multiple server instances.
- **Auto-Seeded Accounts**: Built-in logic to spin up default admin accounts effortlessly.

## 🛠️ Tech Stack
- **Frontend**: React.js (Hosted on Vercel)
- **Backend**: Node.js, Express.js (Hosted on Render)
- **Database**: MongoDB (Local/Memory fallback + Atlas for Production)
- **Real-Time Communication**: Socket.IO
- **Cache / PubSub**: Redis

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Optional: The server can fall back to a local memory server for testing)

### 1. Server Setup
```bash
cd sketchsync-server
npm install
npm start
```
*Note: The server runs on port `5000` by default. If `MONGO_URI` is not provided in your `.env`, it will automatically use an ephemeral in-memory database so you can test it instantly.*

### 2. Client Setup
Open a new terminal window:
```bash
cd sketchsync-client # or whatever your client directory is named
npm install
npm run dev
```

## 🌐 Environment Variables

### Server (`sketchsync-server/.env`)
Create a `.env` file in the server directory based on `.env.example`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/sketchsync
# Optional: REDIS_URL=redis://...
```

## 📝 License
This project is licensed under the MIT License.
