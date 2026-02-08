import React, { useEffect } from 'react';

interface NavbarProps {
  isLightMode: boolean;
  setIsLightMode: (mode: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ isLightMode, setIsLightMode }) => {
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
    } else {
      setIsLightMode(false);
    }
  }, [setIsLightMode]);

  const toggleTheme = () => setIsLightMode(!isLightMode);

  return (
    <header className={`sticky top-0 z-[1000] flex justify-between items-center px-6 md:px-10 py-4 ${
      isLightMode 
        ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-800' 
        : 'bg-gray-900/95 backdrop-blur-md border-b border-gray-700'
    } transition-all duration-300 max-sm:px-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isLightMode ? 'bg-yellow-400/20 border border-yellow-400/30' : 'bg-yellow-400/20 border border-yellow-400/30'
        }`}>
          <svg className={`w-6 h-6 ${isLightMode ? 'text-yellow-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <div className={`font-['Merriweather'] text-2xl md:text-3xl font-black tracking-tight ${
          isLightMode ? 'text-white' : 'text-white'
        }`}>
          NG12 Cancer Guidelines Assessment & Chat
        </div>
      </div>
      
      <nav className="flex items-center gap-4 md:gap-6">
        <button
          onClick={toggleTheme}
          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all hover:scale-105 ${
            isLightMode
              ? 'border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white'
              : 'border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white'
          }`}
          aria-label="Toggle theme"
        >
          {isLightMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </nav>
    </header>
  );
};

export default Navbar;

