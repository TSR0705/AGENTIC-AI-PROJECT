import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/user.context";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
    const { user, setUser } = useContext(UserContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [projects, setProjects] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        axios
            .get("/projects/all")
            .then((res) => {
                setProjects(res.data.projects || []);
            })
            .catch((err) => {
                console.error("Failed to load projects:", err);
            });
    }, []);

    function createProject(e) {
        e.preventDefault();
        if (!projectName.trim()) return;

        axios
            .post("/projects/create", { name: projectName })
            .then((res) => {
                setProjects([...projects, res.data]);
                setIsModalOpen(false);
                setProjectName("");
            })
            .catch((err) => {
                console.error(err);
                alert(err.response?.data || "Failed to create project");
            });
    }

    function handleLogout() {
        axios
            .get("/users/logout")
            .then(() => {
                localStorage.removeItem("token");
                setUser(null);
                navigate("/login");
            })
            .catch((err) => {
                console.error(err);
                localStorage.removeItem("token");
                setUser(null);
                navigate("/login");
            });
    }

    return (
        <main className="min-h-screen bg-obsidian-950 bg-grid-pattern text-obsidian-100 p-6 relative font-sans">
            {/* Ambient gradient glow in header section */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-accent-violet/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

            <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in duration-300">
                {/* Premium Obsidian Header */}
                <header className="flex justify-between items-center mb-8 pb-6 border-b border-obsidian-850">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
                            <i className="ri-terminal-box-line text-accent-violet"></i> codeweave
                        </h1>
                        <p className="text-obsidian-400 text-xs mt-1.5 flex items-center gap-1.5 font-mono">
                            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span>
                                user: <span className="text-white">{user?.email}</span>
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-1.5 bg-white hover:bg-obsidian-100 text-obsidian-950 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 shadow-md font-mono active:scale-[0.98]"
                        >
                            <i className="ri-add-line"></i>
                            <span>NEW PROJECT</span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="p-2 bg-obsidian-900 border border-obsidian-800 hover:bg-obsidian-850 hover:border-obsidian-700 text-obsidian-300 hover:text-white rounded-xl transition-all duration-200"
                            title="Logout Account"
                        >
                            <i className="ri-logout-box-r-line"></i>
                        </button>
                    </div>
                </header>

                {/* Premium Dashboard Metrics Row */}
                <section className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-obsidian-900/40 border border-obsidian-850/60 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-obsidian-400 uppercase tracking-widest font-mono">
                                Workspaces
                            </span>
                            <h3 className="text-xl font-bold text-white mt-1 font-mono">{projects.length}</h3>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-accent-violet/10 flex items-center justify-center border border-accent-violet/20">
                            <i className="ri-folder-line text-accent-violet"></i>
                        </div>
                    </div>
                    <div className="bg-obsidian-900/40 border border-obsidian-850/60 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-obsidian-400 uppercase tracking-widest font-mono">
                                Collaborators
                            </span>
                            <h3 className="text-xl font-bold text-white mt-1 font-mono">
                                {projects.reduce((acc, curr) => acc + (curr.users?.length || 1), 0)}
                            </h3>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <i className="ri-group-line text-emerald-400"></i>
                        </div>
                    </div>
                    <div className="bg-obsidian-900/40 border border-obsidian-850/60 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold text-obsidian-400 uppercase tracking-widest font-mono">
                                Platform Status
                            </span>
                            <h3 className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>{" "}
                                Operational
                            </h3>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <i className="ri-pulse-line text-emerald-400 animate-pulse-glow"></i>
                        </div>
                    </div>
                </section>

                {/* Dashboard Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create Card placeholder */}
                    <div
                        onClick={() => setIsModalOpen(true)}
                        className="flex flex-col items-center justify-center p-6 bg-obsidian-900/20 border border-dashed border-obsidian-800 hover:border-accent-violet/40 hover:bg-obsidian-900/40 rounded-2xl cursor-pointer transition-all duration-300 min-h-[160px] group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-obsidian-900 border border-obsidian-800 group-hover:border-accent-violet/30 flex items-center justify-center mb-3 transition-colors shadow-inner">
                            <i className="ri-add-line text-lg text-obsidian-300 group-hover:text-white transition-colors"></i>
                        </div>
                        <span className="text-sm font-bold text-obsidian-200 group-hover:text-white transition-colors font-mono">
                            CREATE WORKSPACE
                        </span>
                        <span className="text-[10px] text-obsidian-400 mt-1 font-mono text-center">
                            Spin up a new collaborative sandbox
                        </span>
                    </div>

                    {/* Project Cards */}
                    {projects.map((proj) => (
                        <div
                            key={proj._id}
                            onClick={() => navigate(`/project/${proj._id}`)}
                            className="glass-card flex flex-col justify-between p-5 rounded-2xl cursor-pointer min-h-[160px] relative overflow-hidden group shadow-md"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-sm font-bold text-obsidian-100 group-hover:text-white transition-colors capitalize tracking-tight truncate pr-4 font-mono">
                                        {proj.name}
                                    </h2>
                                    <div className="w-6 h-6 rounded-lg bg-obsidian-900/50 flex items-center justify-center border border-obsidian-850 group-hover:border-accent-violet/40 group-hover:bg-accent-violet/10 transition-all duration-200 shadow-sm">
                                        <i className="ri-arrow-right-up-line text-xs text-obsidian-400 group-hover:text-accent-violet transition-colors"></i>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px] text-obsidian-300 bg-obsidian-900/50 w-fit px-2.5 py-1 rounded-lg border border-obsidian-800 font-mono shadow-sm">
                                    <i className="ri-group-line text-accent-violet text-xs"></i>
                                    <span>{proj.users?.length || 1} members</span>
                                </div>
                            </div>

                            <div className="text-[10px] text-obsidian-400 border-t border-obsidian-850/60 pt-3 mt-4 flex items-center justify-between group-hover:text-obsidian-200 transition-colors">
                                <span className="font-semibold flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-obsidian-300">
                                    <i className="ri-terminal-window-line text-accent-violet"></i> open-ide
                                </span>
                                <span className="text-[9px] bg-obsidian-900/80 border border-obsidian-850 px-2 py-0.5 rounded-lg text-obsidian-400 font-mono">
                                    ID: {proj._id.slice(-6).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Modal Drawer */}
                {isModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md z-50 transition-opacity">
                        <div className="bg-obsidian-900 border border-obsidian-800 p-6 rounded-2xl shadow-premium-glow w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-md font-bold text-white tracking-tight font-mono uppercase">
                                    Create Sandbox Project
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setProjectName("");
                                    }}
                                    className="p-1 text-obsidian-400 hover:text-white hover:bg-obsidian-800 rounded-lg transition-all"
                                >
                                    <i className="ri-close-line text-lg"></i>
                                </button>
                            </div>

                            <form onSubmit={createProject}>
                                <div className="mb-6">
                                    <label className="block text-[10px] font-bold text-obsidian-300 uppercase tracking-widest mb-2.5 font-mono">
                                        Project Name
                                    </label>
                                    <input
                                        onChange={(e) => setProjectName(e.target.value)}
                                        value={projectName}
                                        type="text"
                                        required
                                        className="w-full px-3 py-2.5 bg-obsidian-950 border border-obsidian-800 focus:border-accent-violet rounded-xl text-white placeholder-obsidian-500 focus:outline-none focus:ring-1 focus:ring-accent-violet/20 transition-all font-mono text-sm"
                                        placeholder="e.g. collaborative-editor"
                                    />
                                </div>
                                <div className="flex justify-end gap-2.5 border-t border-obsidian-850 pt-4">
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-obsidian-850 hover:bg-obsidian-800 text-obsidian-200 font-bold rounded-xl text-xs transition-colors font-mono uppercase tracking-wider"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setProjectName("");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-white hover:bg-obsidian-100 text-obsidian-950 font-bold rounded-xl text-xs transition-all shadow-md font-mono uppercase tracking-wider active:scale-[0.98]"
                                    >
                                        Create Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default Home;
