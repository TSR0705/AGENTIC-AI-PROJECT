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
    axios.get('/projects/all')
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

    axios.post('/projects/create', { name: projectName })
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
    axios.get('/users/logout')
      .then(() => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      })
      .catch((err) => {
        console.error(err);
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      });
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100 p-6 relative font-sans">
      <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in duration-300">
        
        {/* Sleek Flat Header */}
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 font-mono">
              <i className="ri-terminal-box-line text-zinc-400"></i> whisper-sandbox
            </h1>
            <p className="text-zinc-500 text-xs mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Logged in as: <span className="text-zinc-350 font-mono">{user?.email}</span></span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <i className="ri-add-line"></i>
              <span>New Project</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
              title="Logout Account"
            >
              <i className="ri-logout-box-r-line"></i>
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Card placeholder */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center p-6 bg-zinc-950 border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/10 rounded-xl cursor-pointer transition-all min-h-[150px] group"
          >
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 flex items-center justify-center mb-3 transition-colors">
              <i className="ri-add-line text-lg text-zinc-400 group-hover:text-zinc-200"></i>
            </div>
            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Create New Project</span>
            <span className="text-[11px] text-zinc-500 mt-1">Spin up a new collaborative workspace</span>
          </div>

          {/* Project Cards */}
          {projects.map((proj) => (
            <div
              key={proj._id}
              onClick={() => navigate(`/project/${proj._id}`)}
              className="flex flex-col justify-between p-5 bg-zinc-950 border border-zinc-800 hover:border-zinc-705 rounded-xl cursor-pointer transition-all duration-200 min-h-[150px] relative overflow-hidden group shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-2.5">
                  <h2 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors capitalize tracking-tight truncate pr-4">
                    {proj.name}
                  </h2>
                  <div className="w-6 h-6 rounded bg-zinc-900/50 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                    <i className="ri-arrow-right-up-line text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors"></i>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-900/40 w-fit px-2.5 py-0.5 rounded border border-zinc-800">
                  <i className="ri-group-line text-zinc-500"></i>
                  <span>{proj.users?.length || 1} members</span>
                </div>
              </div>
              
              <div className="text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-3 mt-4 flex items-center justify-between group-hover:text-zinc-400 transition-colors">
                <span className="font-semibold flex items-center gap-1 font-mono text-[10px]">
                  <i className="ri-folder-open-line text-zinc-400"></i> open-workspace
                </span>
                <span className="text-[9px] bg-zinc-900/80 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-550 font-mono">ID: {proj._id.slice(-6)}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Modal Drawer */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 transition-opacity">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white tracking-tight">Create Project</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setProjectName("");
                  }}
                  className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              
              <form onSubmit={createProject}>
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Project Name
                  </label>
                  <input
                    onChange={(e) => setProjectName(e.target.value)}
                    value={projectName}
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:ring-0 rounded-lg text-white placeholder-zinc-650 focus:outline-none transition-all font-medium text-sm"
                    placeholder="e.g. whisper-backend"
                  />
                </div>
                <div className="flex justify-end gap-2.5 border-t border-zinc-800 pt-4">
                  <button
                    type="button"
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-lg text-xs transition-colors"
                    onClick={() => {
                      setIsModalOpen(false);
                      setProjectName("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black font-semibold rounded-lg text-xs transition-all shadow-sm"
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
