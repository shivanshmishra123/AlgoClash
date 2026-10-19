import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  username: string;
  role: 'ADMIN' | 'USER';
  exp: number;
}

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: 'ADMIN' | 'USER' | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    const isExpired = parsed.exp ? parsed.exp * 1000 < Date.now() : false;
    if (isExpired) return null;

    return {
      username: parsed.sub || '',
      role: parsed.role === 'ADMIN' ? 'ADMIN' : 'USER',
      exp: parsed.exp || 0,
    };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ac_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedToken = localStorage.getItem('ac_token');
    return savedToken ? parseJwt(savedToken) : null;
  });

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      if (decoded) {
        setUser(decoded);
        localStorage.setItem('ac_token', token);
      } else {
        setUser(null);
        localStorage.removeItem('ac_token');
        setToken(null);
      }
    } else {
      setUser(null);
      localStorage.removeItem('ac_token');
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ac_token');
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        token,
        username: user?.username ?? null,
        role: user?.role ?? null,
        isAuthenticated,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
