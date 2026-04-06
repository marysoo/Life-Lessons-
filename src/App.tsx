import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdsManager } from './pages/AdsManager';
import { Messages } from './pages/Messages';
import { Chat } from './pages/Chat';
import { CreatePost } from './pages/CreatePost';
import { PostDetail } from './pages/PostDetail';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Button } from './components/ui/button';
import { LogOut, User, Settings as SettingsIcon, Shield, Megaphone, Bell, PlusCircle, AlertCircle, MessageCircle, Menu, X } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { useState } from 'react';

function Navigation() {
  const { user, profileRole, isProfileComplete, logOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {user && !isProfileComplete && location.pathname !== '/settings' && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <p className="text-sm font-medium">
                Your profile is incomplete. Please fill in your details to get the most out of LifeLessons.
              </p>
            </div>
            <Link to="/settings">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap">
                Complete Profile
              </Button>
            </Link>
          </div>
        </div>
      )}
      <nav className="bg-white border-b border-sky-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-orange-400 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                  L
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-orange-500">LifeLessons</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              {user ? (
                <>
                  <Link to="/create-post">
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:bg-orange-50 hover:text-orange-700">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      <span>Share Lesson</span>
                    </Button>
                  </Link>
                  {(profileRole === 'admin' || user.email === 'tersooaker@gmail.com') && (
                    <Link to="/admin">
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                        <Shield className="w-4 h-4 mr-2" />
                        <span>Admin</span>
                      </Button>
                    </Link>
                  )}
                  <Link to="/ads">
                    <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                      <Megaphone className="w-4 h-4 mr-2" />
                      <span>Ads</span>
                    </Button>
                  </Link>
                  <Link to="/messages">
                    <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                      <Bell className="w-4 h-4 mr-2" />
                      <span>Inbox</span>
                    </Button>
                  </Link>
                  <Link to="/chat">
                    <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      <span>Chat</span>
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      <span>Settings</span>
                    </Button>
                  </Link>
                  <Link to={`/profile/${user.uid}`}>
                    <Button variant="ghost" size="sm" className="text-sky-700 hover:bg-sky-50">
                      <User className="w-4 h-4 mr-2" />
                      <span>Profile</span>
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={logOut} className="border-sky-200 text-sky-700 hover:bg-sky-50">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Sign Out</span>
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsAuthModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
                  Sign In / Sign Up
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-sky-700 hover:bg-sky-50"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-sky-100 bg-white">
            <div className="px-4 pt-2 pb-4 space-y-1 shadow-inner">
              {user ? (
                <>
                  <Link to="/create-post" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start text-orange-600 hover:bg-orange-50 hover:text-orange-700">
                      <PlusCircle className="w-5 h-5 mr-3" />
                      Share Lesson
                    </Button>
                  </Link>
                  {(profileRole === 'admin' || user.email === 'tersooaker@gmail.com') && (
                    <Link to="/admin" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700">
                        <Shield className="w-5 h-5 mr-3" />
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <Link to="/ads" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start text-sky-700 hover:bg-sky-50">
                      <Megaphone className="w-5 h-5 mr-3" />
                      Ads Manager
                    </Button>
                  </Link>
                  <Link to="/messages" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start text-sky-700 hover:bg-sky-50">
                      <Bell className="w-5 h-5 mr-3" />
                      Inbox
                    </Button>
                  </Link>
                  <Link to="/chat" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start text-sky-700 hover:bg-sky-50">
                      <MessageCircle className="w-5 h-5 mr-3" />
                      Chat
                    </Button>
                  </Link>
                  <Link to="/settings" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start text-sky-700 hover:bg-sky-50">
                      <SettingsIcon className="w-5 h-5 mr-3" />
                      Settings
                    </Button>
                  </Link>
                  <Link to={`/profile/${user.uid}`} onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start text-sky-700 hover:bg-sky-50">
                      <User className="w-5 h-5 mr-3" />
                      My Profile
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    onClick={() => { logOut(); closeMobileMenu(); }} 
                    className="w-full justify-start text-sky-700 hover:bg-sky-50"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => { setIsAuthModalOpen(true); closeMobileMenu(); }} 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm mt-2"
                >
                  Sign In / Sign Up
                </Button>
              )}
            </div>
          </div>
        )}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </nav>
    </>
  );
}

function AppContent() {
  return (
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
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:userId" element={<Chat />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
