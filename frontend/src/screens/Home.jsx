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
        // Fallback clear
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-950/20 via-gray-950 to-gray-950 text-white p-6 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in duration-500">
        {/* Header */}
        <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-900/60">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
              <i className="ri-terminal-box-line"></i> WhisperAgent Sandbox
            </h1>
            <p className="text-gray-400 text-sm mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Logged in as: <strong className="text-gray-200 font-mono">{user?.email}</strong></span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-950/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <i className="ri-add-line text-lg"></i>
              <span>New Project</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2.5 bg-gray-900 border border-gray-800 hover:border-red-500/30 hover:bg-red-500/5 text-gray-400 hover:text-red-400 rounded-xl transition-all"
              title="Logout Account"
            >
              <i className="ri-logout-box-r-line text-lg"></i>
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Card placeholder */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center p-6 bg-gray-900/10 border-2 border-dashed border-gray-800 hover:border-indigo-500/40 rounded-2xl cursor-pointer hover:bg-indigo-950/5 transition-all duration-300 group min-h-[170px]"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 group-hover:bg-indigo-600/10 group-hover:border-indigo-500/30 flex items-center justify-center mb-3.5 transition-all duration-300 group-hover:scale-110">
              <i className="ri-add-line text-2xl text-gray-400 group-hover:text-indigo-400"></i>
            </div>
            <span className="font-bold text-gray-300 group-hover:text-white transition-colors">Create New Project</span>
            <span className="text-xs text-gray-500 mt-1">Spin up a new collaborative workspace</span>
          </div>

          {/* Project Cards */}
          {projects.map((proj) => (
            <div
              key={proj._id}
              onClick={() => navigate(`/project/${proj._id}`)}
              className="flex flex-col justify-between p-6 glass-card hover:border-indigo-500/40 rounded-2xl cursor-pointer hover:bg-gray-900/60 transition-all duration-300 shadow-xl hover:shadow-indigo-950/20 group min-h-[170px]"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors capitalize tracking-tight truncate pr-4">
                    {proj.name}
                  </h2>
                  <div className="w-7 h-7 rounded-lg bg-gray-950 flex items-center justify-center border border-gray-900/80 group-hover:border-indigo-500/30 transition-all group-hover:scale-105">
                    <i className="ri-arrow-right-up-line text-gray-500 group-hover:text-indigo-400 transition-colors"></i>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-gray-400 text-xs bg-gray-950/40 w-fit px-2.5 py-1 rounded-lg border border-gray-900/40">
                  <i className="ri-group-line text-indigo-400"></i>
                  <span>Collaborators: {proj.users?.length || 1}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 border-t border-gray-900/60 pt-3.5 mt-5 flex items-center justify-between group-hover:text-gray-400 transition-colors">
                <span className="font-semibold flex items-center gap-1">
                  <i className="ri-folder-open-line text-indigo-500"></i> Open Workspace
                </span>
                <span className="text-[10px] bg-gray-900/80 border border-gray-900 px-2 py-0.5 rounded text-gray-600">ID: {proj._id.slice(-6)}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Modal Drawer */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 transition-opacity">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Create Project</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setProjectName("");
                  }}
                  className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <form onSubmit={createProject}>
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Project Name
                  </label>
                  <input
                    onChange={(e) => setProjectName(e.target.value)}
                    value={projectName}
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all font-medium"
                    placeholder="e.g. nexaflow-api"
                  />
                </div>
                <div className="flex justify-end gap-3 border-t border-gray-800/80 pt-4">
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition-colors"
                    onClick={() => {
                      setIsModalOpen(false);
                      setProjectName("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-950/40 hover:scale-[1.01] active:scale-[0.99]"
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
