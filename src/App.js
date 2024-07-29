// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import './App.css';
import ChessGame from './components/Chessboard';
import Login from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>Chess Game</h1>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/game" element={<PrivateRoute><ChessGame /></PrivateRoute>} />
              <Route path="/" element={<Login />} />
            </Routes>
          </header>
        </div>
      </Router>
    </AuthProvider>
  );
};

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default App;
