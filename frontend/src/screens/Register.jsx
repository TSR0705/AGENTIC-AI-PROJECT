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
        <div className="min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden font-sans">
            <div className="w-full max-w-sm glass-panel p-8 rounded-xl shadow-2xl relative z-10 hover:border-zinc-700 transition-all duration-300 animate-in fade-in duration-300">
                <header className="text-center mb-8">
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <i className="ri-user-add-line text-xl text-zinc-400"></i>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white mb-1.5 font-mono">
                        create-account
                    </h2>
                    <p className="text-xs text-zinc-500 font-mono">Join the real-time coding sandbox</p>
                </header>

                <form onSubmit={submitHandler} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono" htmlFor="email">Email Address</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
                                <i className="ri-mail-line text-sm"></i>
                            </span>
                            <input
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                type="email"
                                id="email"
                                required
                                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-mono"
                                placeholder="name@domain.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono" htmlFor="password">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-650">
                                <i className="ri-lock-line text-sm"></i>
                            </span>
                            <input
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                                type="password"
                                id="password"
                                required
                                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-mono"
                                placeholder="Min. 3 characters"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-lg transition-colors mt-2 flex items-center justify-center gap-1.5 text-xs shadow-sm font-mono"
                    >
                        <span>register</span>
                        <i className="ri-check-line"></i>
                    </button>
                </form>

                <footer className="text-center mt-6 pt-6 border-t border-zinc-900">
                    <p className="text-xs text-zinc-550 font-mono">
                        Already have an account? <Link to="/login" className="text-white hover:underline font-semibold">Login here</Link>
                    </p>
                </footer>
            </div>
        </div>
    )
}

export default Register