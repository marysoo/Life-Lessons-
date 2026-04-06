import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdsManager } from './pages/AdsManager';
import { Messages } from './pages/Messages';
import { CreatePost } from './pages/CreatePost';
import { PostDetail } from './pages/PostDetail';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Button } from './components/ui/button';
import { LogOut, User, Settings as SettingsIcon, Shield, Megaphone, Bell, PlusCircle } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { useState } from 'react';

function Navigation() {
  const { user, profileRole, logOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-sky-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-orange-400 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                L
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-orange-500">LifeLessons</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <>
                <Link to="/create-post">
                  <Button variant="ghost" size="sm" className="text-orange-600 hover:bg-orange-50 hover:text-orange-700">
                    <PlusCircle className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Share Lesson</span>
                  </Button>
                </Link>
                {(profileRole === 'admin' || user.email === 'tersooaker@gmail.com') && (
                  <Link to="/admin" className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/ads" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                    <Megaphone className="w-4 h-4 mr-2" />
                    Ads
                  </Button>
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                    <Bell className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Inbox</span>
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                    <SettingsIcon className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </Link>
                <Link to={`/profile/${user.uid}`}>
                  <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                    <User className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logOut} className="border-sky-200 text-sky-700 hover:bg-sky-50">
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsAuthModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50/50 font-sans">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create-post" element={<CreatePost />} />
              <Route path="/post/:postId" element={<PostDetail />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/ads" element={<AdsManager />} />
              <Route path="/messages" element={<Messages />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
