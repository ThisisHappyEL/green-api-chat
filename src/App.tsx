import { useState } from 'react';
import { Auth } from './components/Auth';
import { Chat } from './components/Chat';

export interface AuthData {
  idInstance: string;
  apiTokenInstance: string;
}

function App() {
  const [authData, setAuthData] = useState<AuthData | null>(() => {
    const savedId = localStorage.getItem('green_id_instance');
    const savedToken = localStorage.getItem('green_api_token');
    if (savedId && savedToken) {
      return { idInstance: savedId, apiTokenInstance: savedToken };
    }
    return null;
  });

  const handleLogin = (id: string, token: string) => {
    localStorage.setItem('green_id_instance', id);
    localStorage.setItem('green_api_token', token);
    setAuthData({ idInstance: id, apiTokenInstance: token });
  };

  const handleLogout = () => {
    localStorage.removeItem('green_id_instance');
    localStorage.removeItem('green_api_token');
    setAuthData(null);
  };

  if (!authData) {
    return <Auth onLogin={handleLogin} />;
  }

  return <Chat authData={authData} onLogout={handleLogout} />;
}

export default App;