import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/user.context";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { user } = useContext(UserContext);
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
        console.error(err);
      });
  }, []);

  function createProject(e) {
    e.preventDefault();
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

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              WhisperAgent Sandbox
            </h1>
            <p className="text-gray-400 text-sm mt-1">Logged in as: <span className="text-blue-400 font-semibold">{user?.email}</span></p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors shadow-md shadow-blue-900/30"
          >
            <i className="ri-add-line text-lg"></i>
            New Project
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center p-6 bg-gray-800/20 border-2 border-dashed border-gray-800 hover:border-blue-500/50 rounded-xl cursor-pointer hover:bg-gray-800/40 transition-all group min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-blue-600/10 flex items-center justify-center mb-3 transition-colors">
              <i className="ri-add-line text-2xl text-gray-400 group-hover:text-blue-400"></i>
            </div>
            <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">Create New Project</span>
            <span className="text-xs text-gray-500 mt-1">Collaborate in real-time with AI</span>
          </div>

          {projects.map((proj) => (
            <div
              key={proj._id}
              onClick={() => navigate(`/project/${proj._id}`)}
              className="flex flex-col justify-between p-6 bg-gray-800/40 border border-gray-800 hover:border-blue-500/50 rounded-xl cursor-pointer hover:bg-gray-800/80 transition-all shadow-lg hover:shadow-blue-900/10 group min-h-[160px]"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors capitalize">
                    {proj.name}
                  </h2>
                  <i className="ri-arrow-right-up-line text-gray-500 group-hover:text-blue-400 transition-colors"></i>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <i className="ri-user-line"></i>
                  <span>Collaborators: {proj.users?.length || 1}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 border-t border-gray-800 pt-3 mt-4 flex items-center justify-between">
                <span>View Workspace</span>
                <i className="ri-folder-open-line"></i>
              </div>
            </div>
          ))}
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 transition-opacity">
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-bold text-white mb-4">Create New Project</h2>
              <form onSubmit={createProject}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Project Name
                  </label>
                  <input
                    onChange={(e) => setProjectName(e.target.value)}
                    value={projectName}
                    type="text"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                    onClick={() => {
                      setIsModalOpen(false);
                      setProjectName("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-md shadow-blue-900/30"
                  >
                    Create
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
