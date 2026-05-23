import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user.context';
import axios from '../config/axios';
import { io } from 'socket.io-client';

const Project = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(UserContext);

    // States
    const [project, setProject] = useState(null);
    const [collaborators, setCollaborators] = useState([]);
    const [fileTree, setFileTree] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [editorContent, setEditorContent] = useState("");
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    
    // Modals & Panels
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Refs
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Fetch Project Details and Users
    useEffect(() => {
        // Fetch project
        axios.get(`/projects/get-project/${projectId}`)
            .then(res => {
                setProject(res.data.project);
                setCollaborators(res.data.project.users || []);
                setFileTree(res.data.project.fileTree || {});
            })
            .catch(err => {
                console.error(err);
                alert("Failed to load project details");
                navigate('/');
            });

        // Initialize Sockets
        const token = localStorage.getItem('token');
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        socketRef.current = io(socketUrl, {
            auth: { token },
            query: { projectId }
        });

        socketRef.current.on('connect', () => {
            console.log("Connected to project room:", projectId);
        });

        socketRef.current.on('project-message', (data) => {
            setMessages(prev => [...prev, data]);
            
            // Check if message is from AI and contains a fileTree
            if (data.sender?._id === 'ai') {
                try {
                    const aiContent = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
                    if (aiContent.fileTree) {
                        // Automatically merge AI generated files into our local tree
                        setFileTree(prevTree => {
                            const newTree = { ...prevTree, ...aiContent.fileTree };
                            // Persist the updated tree to the backend
                            axios.put('/projects/update-file-tree', {
                                projectId,
                                fileTree: newTree
                            }).catch(err => console.error("Error auto-saving AI files:", err));
                            return newTree;
                        });
                    }
                } catch (e) {
                    // Message wasn't JSON, just simple text
                }
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [projectId, navigate]);

    // Scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle sending message
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const messageData = {
            message: inputMessage,
            sender: user
        };

        // Emit through socket
        socketRef.current.emit('project-message', messageData);
        
        // Add locally
        setMessages(prev => [...prev, messageData]);
        setInputMessage("");
    };

    // Open dynamic file
    const handleOpenFile = (filename) => {
        setSelectedFile(filename);
        setEditorContent(fileTree[filename]?.file?.contents || "");
    };

    // Save active file changes
    const handleSaveFile = () => {
        if (!selectedFile) return;

        const updatedFileTree = {
            ...fileTree,
            [selectedFile]: {
                ...fileTree[selectedFile],
                file: {
                    contents: editorContent
                }
            }
        };

        setFileTree(updatedFileTree);

        // Put to database
        axios.put('/projects/update-file-tree', {
            projectId,
            fileTree: updatedFileTree
        })
        .then(() => {
            alert(`Saved ${selectedFile} successfully!`);
        })
        .catch(err => {
            console.error(err);
            alert("Failed to save changes to server");
        });
    };

    // Create a new empty file
    const handleCreateFile = () => {
        const name = prompt("Enter new filename:");
        if (!name) return;
        if (fileTree[name]) {
            alert("File already exists!");
            return;
        }

        const updatedTree = {
            ...fileTree,
            [name]: {
                file: {
                    contents: ""
                }
            }
        };
        setFileTree(updatedTree);
        setSelectedFile(name);
        setEditorContent("");

        axios.put('/projects/update-file-tree', {
            projectId,
            fileTree: updatedTree
        }).catch(err => console.error(err));
    };

    // Open invite member modal and fetch all users
    const handleOpenInviteModal = () => {
        setIsInviteModalOpen(true);
        axios.get('/users/all')
            .then(res => {
                setAllUsers(res.data.users || []);
            })
            .catch(err => console.error(err));
    };

    // Add collaborator to project
    const handleAddCollaborator = (targetUserId) => {
        axios.put('/projects/add-user', {
            projectId,
            users: [targetUserId]
        })
        .then(res => {
            setCollaborators(res.data.project.users || []);
            alert("Member added to project!");
        })
        .catch(err => {
            console.error(err);
            alert(err.response?.data?.error || "Failed to add member");
        });
    };

    // Helper: Parse AI message block
    const renderMessage = (msg, index) => {
        const isAI = msg.sender?._id === 'ai';
        const isMe = msg.sender?._id === user?._id;

        if (isAI) {
            let aiText = "";
            let aiFiles = [];
            let buildCommand = null;
            let startCommand = null;

            try {
                const parsed = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
                aiText = parsed.text || "Generated updates";
                if (parsed.fileTree) aiFiles = Object.keys(parsed.fileTree);
                buildCommand = parsed.buildCommand;
                startCommand = parsed.startCommand;
            } catch (e) {
                aiText = typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message);
            }

            return (
                <div key={index} className="flex flex-col mb-4 bg-indigo-950/40 border border-indigo-900/50 p-4 rounded-xl max-w-[90%] self-start text-left shadow-lg">
                    <span className="text-xs font-bold text-indigo-400 mb-1 flex items-center gap-1">
                        <i className="ri-robot-line"></i> WhisperAgent
                    </span>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{aiText}</p>
                    
                    {aiFiles.length > 0 && (
                        <div className="mt-3 border-t border-indigo-900/50 pt-2.5">
                            <span className="text-xs font-semibold text-indigo-300 block mb-1.5">Created/Updated Files:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {aiFiles.map((f, i) => (
                                    <span key={i} className="text-xs bg-indigo-900/40 text-indigo-200 px-2 py-0.5 rounded border border-indigo-800/40 font-mono">
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {(buildCommand || startCommand) && (
                        <div className="mt-3 border-t border-indigo-900/50 pt-2.5 bg-black/40 p-2.5 rounded font-mono text-xs text-green-400">
                            {buildCommand && (
                                <div className="mb-1">
                                    <span className="text-gray-500">$ </span>
                                    <span>{buildCommand.mainItem} {buildCommand.commands?.join(" ")}</span>
                                </div>
                            )}
                            {startCommand && (
                                <div>
                                    <span className="text-gray-500">$ </span>
                                    <span>{startCommand.mainItem} {startCommand.commands?.join(" ")}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={index} className={`flex flex-col mb-3 p-3 rounded-xl max-w-[85%] shadow-md ${
                isMe 
                    ? "bg-blue-600/80 border border-blue-500/30 text-white self-end text-right" 
                    : "bg-gray-800/60 border border-gray-700/40 text-gray-200 self-start text-left"
            }`}>
                <span className={`text-[10px] font-bold mb-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                    {msg.sender?.email}
                </span>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
            </div>
        );
    };

    return (
        <main className="h-screen w-screen bg-gray-950 text-white flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="h-14 border-b border-gray-900 px-6 flex justify-between items-center bg-gray-900/40 backdrop-blur-md flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/')}
                        className="p-1.5 bg-gray-800/80 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
                        title="Back to Dashboard"
                    >
                        <i className="ri-arrow-left-line text-lg"></i>
                    </button>
                    <h1 className="text-lg font-bold tracking-tight capitalize flex items-center gap-2 text-indigo-400">
                        <i className="ri-terminal-box-line"></i> {project?.name || "Loading..."}
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-400 bg-gray-800/40 px-3 py-1.5 rounded-lg border border-gray-800/40">
                        <i className="ri-shield-user-line text-blue-400"></i>
                        <span>{user?.email}</span>
                    </div>
                </div>
            </header>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Sidebar - Collaborators */}
                <aside className="w-56 border-r border-gray-900 bg-gray-950 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-900 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Collaborators</span>
                        <button 
                            onClick={handleOpenInviteModal}
                            className="p-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded transition-colors"
                            title="Add Collaborator"
                        >
                            <i className="ri-user-add-line"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {collaborators.map((c) => (
                            <div key={c._id} className="flex items-center gap-2 p-2 bg-gray-900/30 rounded-lg border border-gray-900/30 hover:border-gray-800/50">
                                <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center font-bold text-xs text-blue-400 uppercase">
                                    {c.email.slice(0, 2)}
                                </div>
                                <span className="text-xs text-gray-300 truncate" title={c.email}>{c.email}</span>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* 2. File Explorer */}
                <aside className="w-56 border-r border-gray-900 bg-gray-950/80 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-900 flex justify-between items-center bg-gray-950">
                        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Files</span>
                        <button 
                            onClick={handleCreateFile}
                            className="p-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded transition-colors"
                            title="Create File"
                        >
                            <i className="ri-file-add-line"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {Object.keys(fileTree).length === 0 ? (
                            <div className="text-center text-xs text-gray-600 py-8">
                                No files yet. Ask @ai to create one!
                            </div>
                        ) : (
                            Object.keys(fileTree).map((filename) => (
                                <button
                                    key={filename}
                                    onClick={() => handleOpenFile(filename)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-lg transition-all text-left ${
                                        selectedFile === filename 
                                            ? "bg-indigo-600/10 text-indigo-300 border border-indigo-500/20" 
                                            : "text-gray-400 hover:text-white hover:bg-gray-900/40 border border-transparent"
                                    }`}
                                >
                                    <i className={`ri-file-code-line ${selectedFile === filename ? "text-indigo-400" : "text-gray-500"}`}></i>
                                    <span className="truncate">{filename}</span>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* 3. Code Editor */}
                <section className="flex-1 bg-gray-900/20 flex flex-col min-w-0">
                    {selectedFile ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Editor Header */}
                            <div className="h-11 border-b border-gray-900 px-4 flex justify-between items-center bg-gray-950/80 flex-shrink-0">
                                <span className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
                                    <i className="ri-file-edit-line text-indigo-400"></i> {selectedFile}
                                </span>
                                <button
                                    onClick={handleSaveFile}
                                    className="flex items-center gap-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded transition-colors font-semibold"
                                >
                                    <i className="ri-save-line"></i> Save
                                </button>
                            </div>
                            {/* Editor Textarea */}
                            <div className="flex-1 overflow-hidden relative">
                                <textarea
                                    value={editorContent}
                                    onChange={(e) => setEditorContent(e.target.value)}
                                    className="w-full h-full p-4 bg-gray-950 font-mono text-sm leading-relaxed text-gray-300 focus:outline-none resize-none"
                                    placeholder="Write your code here..."
                                    style={{ tabSize: 4 }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-950/40">
                            <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4 border border-gray-800">
                                <i className="ri-code-s-slash-line text-3xl text-gray-600"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-300">No File Selected</h3>
                            <p className="text-sm text-gray-500 max-w-xs mt-1">
                                Click on a file from the explorer list, or ask @ai to generate some code structures.
                            </p>
                        </div>
                    )}
                </section>

                {/* 4. Chat Drawer */}
                <section className="w-80 border-l border-gray-900 bg-gray-950 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-900 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Chatroom & AI</span>
                        <div className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
                            <span>Online</span>
                        </div>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col message-box">
                        {messages.length === 0 && (
                            <div className="my-auto text-center text-xs text-gray-600 px-4">
                                <p className="mb-2">No messages in this chatroom yet.</p>
                                <p className="bg-gray-900/40 p-2 rounded-lg border border-gray-800 text-left">
                                    <strong className="text-indigo-400 block mb-1">💡 Pro-Tip:</strong>
                                    Type <code className="text-gray-300 bg-gray-800 px-1 py-0.5 rounded font-mono">@ai Create an express server</code> to have the AI write project code automatically!
                                </p>
                            </div>
                        )}
                        {messages.map((msg, i) => renderMessage(msg, i))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-900 bg-gray-950">
                        <div className="relative">
                            <input
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                className="w-full pl-3 pr-10 py-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                                placeholder="Type a message or trigger @ai..."
                            />
                            <button
                                type="submit"
                                className="absolute right-1.5 top-1.5 w-7 h-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md flex items-center justify-center transition-colors"
                            >
                                <i className="ri-send-plane-2-line text-sm"></i>
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 transition-opacity">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Invite Collaborators</h2>
                            <button 
                                onClick={() => {
                                    setIsInviteModalOpen(false);
                                    setSearchQuery("");
                                }}
                                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                <i className="ri-close-line text-xl"></i>
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                                placeholder="Search by email..."
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                            {allUsers
                                .filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((u) => {
                                    const isAlreadyMember = collaborators.some(collab => collab._id === u._id);
                                    return (
                                        <div key={u._id} className="flex justify-between items-center p-2.5 bg-gray-900/40 rounded-lg border border-gray-700/40">
                                            <span className="text-xs text-gray-300 font-mono">{u.email}</span>
                                            {isAlreadyMember ? (
                                                <span className="text-[10px] text-gray-500 font-semibold bg-gray-800 px-2 py-1 rounded">Member</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddCollaborator(u._id)}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1 rounded transition-colors shadow-sm shadow-blue-900/30"
                                                >
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Project;
