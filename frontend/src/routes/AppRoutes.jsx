import React, { useContext, useEffect, useState } from 'react'
import { Route, BrowserRouter, Routes, Navigate } from 'react-router-dom'
import Login from '../screens/Login'
import Register from '../screens/Register'
import Home from '../screens/Home'
import Project from '../screens/Project'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'

const ProtectedRoute = ({ children }) => {
    const { user, setUser } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        if (user) {
            setLoading(false);
            return;
        }

        axios.get('/users/profile')
            .then((res) => {
                setUser(res.data.user);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Session verification failed:", err);
                localStorage.removeItem('token');
                setUser(null);
                setLoading(false);
            });
    }, [token, user, setUser]);

    if (loading) {
        return (
            <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-gray-400 text-sm tracking-wider font-medium animate-pulse">Verifying Session...</p>
            </div>
        );
    }

    return token ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/project/:projectId" element={
                    <ProtectedRoute>
                        <Project />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes