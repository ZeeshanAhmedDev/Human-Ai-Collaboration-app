import React, { useLayoutEffect, useState } from 'react';
import ChatInterface from './components/ChatInterface.js';
import './styles/App.css';

const THEME_STORAGE_KEY = 'human-ai-workbench-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
  } catch (error) {
    // Theme still works without persistence if storage is blocked.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // Ignore storage failures; the active theme still applies for this session.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="App">
      <ChatInterface theme={theme} onToggleTheme={toggleTheme} />
    </div>
  );
}

export default App;
