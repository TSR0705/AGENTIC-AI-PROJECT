import React, { useState, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'

const Register = () => {
    const [ email, setEmail ] = useState('')
    const [ password, setPassword ] = useState('')
    const { setUser } = useContext(UserContext)
    const navigate = useNavigate()

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/');
        }
    }, [navigate]);

    function submitHandler(e) {
        e.preventDefault()

        axios.post('/users/register', {
            email,
            password
        }).then((res) => {
            console.log(res.data)
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
            navigate('/')
        }).catch((err) => {
            console.log(err.response?.data)
            alert(err.response?.data?.errors?.[0]?.msg || "Registration failed");
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-gray-950 to-gray-950 px-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10 hover:border-gray-700/50 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <header className="text-center mb-8">
                    <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                        <i className="ri-user-add-line text-2xl text-white"></i>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Create Account
                    </h2>
                    <p className="text-sm text-gray-400">Join the real-time AI coding sandbox</p>
                </header>

                <form onSubmit={submitHandler} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="email">Email Address</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                                <i className="ri-mail-line"></i>
                            </span>
                            <input
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                type="email"
                                id="email"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-gray-950 border border-gray-800/80 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                                placeholder="name@domain.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2" htmlFor="password">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                                <i className="ri-lock-line"></i>
                            </span>
                            <input
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                                type="password"
                                id="password"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-gray-950 border border-gray-800/80 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                                placeholder="Min. 3 characters"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-900/30 hover:shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] mt-2 flex items-center justify-center gap-2"
                    >
                        <span>Register Account</span>
                        <i className="ri-check-line"></i>
                    </button>
                </form>

                <footer className="text-center mt-6 pt-6 border-t border-gray-800/80">
                    <p className="text-xs text-gray-400">
                        Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">Login here</Link>
                    </p>
                </footer>
            </div>
        </div>
    )
}

export default Register