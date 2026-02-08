import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import PatientList from './components/PatientList';
import PatientAssessment from './components/PatientAssessment';
import ChatInterface from './components/ChatInterface';
import StandaloneChat from './components/StandaloneChat';

const MainApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'patients' | 'chat'>('patients');
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  useEffect(() => {
    if (location.pathname === '/chat' || location.pathname.startsWith('/chat/')) {
      setActiveTab('chat');
    } else {
      setActiveTab('patients');
    }
  }, [location.pathname]);

  const handleTabClick = (tab: 'patients' | 'chat') => {
    setActiveTab(tab);
    if (tab === 'patients') {
      navigate('/');
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="App">
      <Navbar isLightMode={isLightMode} setIsLightMode={setIsLightMode} />
      
      {activeTab === 'patients' && (
        <div className="bg-gray-900">
          <Hero />
        </div>
      )}
      
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => handleTabClick('patients')}
          >
            👥 Patient Management
          </button>
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleTabClick('chat')}
          >
            💬 Chat with Guidelines
          </button>
        </div>
      </div>

      <main>
        {activeTab === 'patients' && <PatientList />}
        {activeTab === 'chat' && <StandaloneChat />}
      </main>
    </div>
  );
};

const AppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  return (
    <>
      <Navbar isLightMode={isLightMode} setIsLightMode={setIsLightMode} />
      {children}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/chat" element={<MainApp />} />
        <Route
          path="/assess/:patientId"
          element={
            <AppWrapper>
              <header className="app-header">
                <h1>Clinical Decision Support Agent</h1>
                <h2>Patient Assessment</h2>
              </header>
              <main>
                <PatientAssessment />
              </main>
            </AppWrapper>
          }
        />
        <Route
          path="/chat/:patientId"
          element={
            <AppWrapper>
              <header className="app-header">
                <h1>Clinical Decision Support Agent</h1>
                <h2>Chat with Guidelines Assistant</h2>
              </header>
              <main>
                <ChatInterface />
              </main>
            </AppWrapper>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;

