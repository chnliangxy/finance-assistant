import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import Funds from './pages/Funds';
import Gold from './pages/Gold';
import Silver from './pages/Silver';
import { createTranslator } from './i18n';

const API_BASE = '/api';
axios.defaults.baseURL = API_BASE;
axios.defaults.timeout = 12000;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [apiStatus, setApiStatus] = useState('check');
  const [language, setLanguage] = useState('en');
  const t = createTranslator(language);
  const displayUserName = (name) => name === '\u9ed8\u8ba4\u7528\u6237' ? 'default' : name;

  useEffect(() => {
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
      axios.get(`/users/${savedUserId}`).then(res => {
        setCurrentUser(res.data);
      }).catch(() => {
        fetchDefaultUser();
      });
    } else {
      fetchDefaultUser();
    }
    
    fetchUsers();
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      await axios.get('/health');
      setApiStatus('apiOnline');
    } catch (error) {
      setApiStatus('apiDegraded');
    }
  };

  const toggleLanguage = () => {
    setLanguage((current) => {
      const next = current === 'en' ? 'zh' : 'en';
      return next;
    });
  };

  const fetchDefaultUser = async () => {
    try {
      const res = await axios.get('/users/current');
      setCurrentUser(res.data);
      localStorage.setItem('currentUserId', res.data.id);
    } catch (error) {
      console.error('Failed to get default user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to get user list:', error);
    }
  };

  const switchUser = async (userId) => {
    try {
      const res = await axios.put(`/users/switch/${userId}`);
      setCurrentUser(res.data);
      localStorage.setItem('currentUserId', res.data.id);
      setShowUserModal(false);
    } catch (error) {
      console.error('Failed to switch user:', error);
    }
  };

  const createUser = async () => {
    if (!newUserName.trim()) return;
    
    try {
      await axios.post('/users', { name: newUserName });
      setNewUserName('');
      fetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  return (
    <Router>
      <div className={`app lang-${language}`}>
        <header className="pixel-header">
          <div className="header-left">
            <h1 className="app-title">{t('appTitle')}</h1>
          </div>
          
          <nav className="pixel-nav">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-text">{t('dashboard')}</span>
            </NavLink>
            <NavLink to="/stocks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-text">{t('stocks')}</span>
            </NavLink>
            <NavLink to="/funds" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-text">{t('funds')}</span>
            </NavLink>
            <NavLink to="/gold" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-text">{t('gold')}</span>
            </NavLink>
            <NavLink to="/silver" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-text">{t('silver')}</span>
            </NavLink>
          </nav>
          
          <div className="header-right">
            <button
              className="pixel-btn language-btn"
              onClick={toggleLanguage}
              type="button"
            >
              {t('languageButton')}
            </button>
            <button 
              className="pixel-btn pixel-btn-primary user-btn"
              onClick={() => setShowUserModal(!showUserModal)}
            >
              <span className="user-prefix">{t('user')}</span>
              <span>{displayUserName(currentUser?.name) || t('user')}</span>
            </button>
          </div>
        </header>

        {showUserModal && (
          <div className="user-modal-overlay" onClick={() => setShowUserModal(false)}>
            <div className="user-modal" onClick={e => e.stopPropagation()}>
              <h3>{t('switchUser')}</h3>
              
              <div className="user-list">
                {users.map(user => (
                  <div 
                    key={user.id} 
                    className={`user-item ${currentUser?.id === user.id ? 'active' : ''}`}
                    onClick={() => switchUser(user.id)}
                  >
                    <span className="user-avatar">{t('user')}</span>
                    <span className="user-name">{displayUserName(user.name)}</span>
                    {currentUser?.id === user.id && <span className="current-badge">{t('current')}</span>}
                  </div>
                ))}
              </div>
              
              <div className="create-user">
                <input
                  type="text"
                  className="pixel-input"
                  placeholder={t('newUserPlaceholder')}
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createUser()}
                />
                <button className="pixel-btn pixel-btn-success" onClick={createUser}>
                  {t('create')}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="main-content">
          {currentUser ? (
            <Routes>
              <Route path="/" element={<Dashboard userId={currentUser.id} t={t} language={language} />} />
              <Route path="/stocks" element={<Stocks userId={currentUser.id} t={t} language={language} />} />
              <Route path="/funds" element={<Funds userId={currentUser.id} t={t} language={language} />} />
              <Route path="/gold" element={<Gold userId={currentUser.id} t={t} language={language} />} />
              <Route path="/silver" element={<Silver userId={currentUser.id} t={t} language={language} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <div className="loading">
              <div className="loading-text">{t('loading')}</div>
            </div>
          )}
        </main>

        <footer className="pixel-footer">
          <div className="footer-left">
            <span className="status-dot animate-pulse"></span>
            <span>{t(apiStatus)}</span>
          </div>
          <div className="footer-right">
            <span>{t('dataUpdate')}: {new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
