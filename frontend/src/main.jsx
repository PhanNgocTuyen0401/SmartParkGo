import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import App from './App';
import Login from './pages/Login';
import Home from './pages/Home';
import StaffPortal from './pages/StaffPortal';
import AdminPortal from './pages/admin/AdminPortal';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/register" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<Login />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <StaffPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPortal />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
