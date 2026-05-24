import React, { useState, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import { UserContext } from '../context/user.context'

const Login = () => {
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

        axios.post('/users/login', {
            email,
            password
        }).then((res) => {
            console.log(res.data)
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
            navigate('/')
        }).catch((err) => {
            console.log(err.response?.data)
            alert(err.response?.data?.errors?.[0]?.msg || "Invalid Credentials");
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-obsidian-950 bg-grid-pattern px-4 relative overflow-hidden font-sans">
            {/* Top-center ambient indigo glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent-violet/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <div className="w-full max-w-sm glass-panel p-8 rounded-2xl border-white/5 shadow-premium-glow relative z-10 hover:border-accent-violet/20 transition-all duration-300">
                <header className="text-center mb-8">
                    <div className="w-12 h-12 bg-obsidian-900 border border-obsidian-800 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <i className="ri-terminal-box-line text-xl text-zinc-300"></i>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white mb-1.5 font-mono">
                        whisper-sandbox
                    </h2>
                    <p className="text-xs text-obsidian-400 font-mono">Collaborative coding workspace</p>
                </header>

                <form onSubmit={submitHandler} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-obsidian-300 uppercase tracking-wider mb-2 font-mono" htmlFor="email">Email Address</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-obsidian-400">
                                <i className="ri-mail-line text-sm"></i>
                            </span>
                            <input
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                type="email"
                                id="email"
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-obsidian-900 border border-obsidian-800 focus:border-accent-violet rounded-xl text-sm text-white placeholder-obsidian-500 focus:outline-none focus:ring-1 focus:ring-accent-violet/20 transition-all font-mono"
                                placeholder="name@domain.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-obsidian-300 uppercase tracking-wider mb-2 font-mono" htmlFor="password">Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-obsidian-400">
                                <i className="ri-lock-line text-sm"></i>
                            </span>
                            <input
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                                type="password"
                                id="password"
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-obsidian-900 border border-obsidian-800 focus:border-accent-violet rounded-xl text-sm text-white placeholder-obsidian-500 focus:outline-none focus:ring-1 focus:ring-accent-violet/20 transition-all font-mono"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-white hover:bg-obsidian-100 text-obsidian-950 font-bold rounded-xl transition-all duration-200 mt-4 flex items-center justify-center gap-2 text-xs shadow-md font-mono uppercase tracking-wider active:scale-[0.98]"
                    >
                        <span>login</span>
                        <i className="ri-arrow-right-line"></i>
                    </button>
                </form>

                <footer className="text-center mt-6 pt-6 border-t border-obsidian-900">
                    <p className="text-xs text-obsidian-400 font-mono">
                        Don't have an account? <Link to="/register" className="text-white hover:text-accent-violet font-semibold transition-colors">Register now</Link>
                    </p>
                </footer>
            </div>
        </div>
    )
}

export default Login