import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user.context';
import axios from '../config/axios';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';

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
    const [isUnsaved, setIsUnsaved] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    
    // Modals & Panels
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Tabs, Search & Collapse Sidebar States
    const [openTabs, setOpenTabs] = useState([]);
    const [fileSearchQuery, setFileSearchQuery] = useState("");
    const [isCollabSectionCollapsed, setIsCollabSectionCollapsed] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);

    // Refs
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Monaco language mapping helper
    const getLanguageFromFilename = (filename) => {
        if (!filename) return 'plaintext';
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'css':
                return 'css';
            case 'html':
                return 'html';
            case 'json':
                return 'json';
            case 'md':
                return 'markdown';
            case 'py':
                return 'python';
            default:
                return 'plaintext';
        }
    };



    // Fetch Project Details and Users
    useEffect(() => {
        // Fetch project
        axios.get(`/projects/get-project/${projectId}`)
            .then(res => {
                setProject(res.data.project);
                setCollaborators(res.data.project.users || []);
                setFileTree(res.data.project.fileTree || {});
                setMessages(res.data.project.messages || []);
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
                        setFileTree(prevTree => {
                            const newTree = { ...prevTree, ...aiContent.fileTree };
                            // Persist tree to backend
                            axios.put('/projects/update-file-tree', {
                                projectId,
                                fileTree: newTree
                            }).catch(err => console.error("Error auto-saving AI files:", err));
                            return newTree;
                        });
                    }
                } catch (e) {
                    // Non-JSON AI content
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

        socketRef.current.emit('project-message', messageData);
        setMessages(prev => [...prev, messageData]);
        setInputMessage("");
    };

    // Open file & add tab
    const handleOpenFile = (filename) => {
        setSelectedFile(filename);
        setEditorContent(fileTree[filename]?.file?.contents || "");
        setIsUnsaved(false);
        if (!openTabs.includes(filename)) {
            setOpenTabs(prev => [...prev, filename]);
        }
    };

    // Close Tab
    const handleCloseTab = (filename) => {
        const remainingTabs = openTabs.filter(t => t !== filename);
        setOpenTabs(remainingTabs);
        if (selectedFile === filename) {
            if (remainingTabs.length > 0) {
                handleOpenFile(remainingTabs[remainingTabs.length - 1]);
            } else {
                setSelectedFile(null);
                setEditorContent("");
                setIsUnsaved(false);
            }
        }
    };

    // Save active file
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
        setIsUnsaved(false);

        axios.put('/projects/update-file-tree', {
            projectId,
            fileTree: updatedFileTree
        })
        .then(() => {
            // Soft toast/alert
        })
        .catch(err => {
            console.error(err);
            alert("Failed to save changes to server");
        });
    };

    // Create file & add tab
    const handleCreateFile = () => {
        const name = prompt("Enter new filename (e.g. index.js):");
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
        setIsUnsaved(false);
        if (!openTabs.includes(name)) {
            setOpenTabs(prev => [...prev, name]);
        }

        axios.put('/projects/update-file-tree', {
            projectId,
            fileTree: updatedTree
        }).catch(err => console.error(err));
    };

    // Delete file & remove tab
    const handleDeleteFile = (e, filename) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

        const updatedTree = { ...fileTree };
        delete updatedTree[filename];
        
        setFileTree(updatedTree);
        setOpenTabs(prev => prev.filter(t => t !== filename));
        
        if (selectedFile === filename) {
            const remainingTabs = openTabs.filter(t => t !== filename);
            if (remainingTabs.length > 0) {
                handleOpenFile(remainingTabs[remainingTabs.length - 1]);
            } else {
                setSelectedFile(null);
                setEditorContent("");
                setIsUnsaved(false);
            }
        }

        axios.put('/projects/update-file-tree', {
            projectId,
            fileTree: updatedTree
        }).catch(err => console.error(err));
    };

    // Invite collaborator
    const handleOpenInviteModal = () => {
        setIsInviteModalOpen(true);
        axios.get('/users/all')
            .then(res => {
                setAllUsers(res.data.users || []);
            })
            .catch(err => console.error(err));
    };

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

    // File icon helper
    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'js':
            case 'jsx':
                return <i className="ri-javascript-fill text-yellow-500 text-base"></i>;
            case 'css':
                return <i className="ri-css3-fill text-blue-400 text-base"></i>;
            case 'html':
                return <i className="ri-html5-fill text-orange-500 text-base"></i>;
            case 'json':
                return <i className="ri-braces-line text-yellow-600 text-base"></i>;
            case 'md':
                return <i className="ri-markdown-fill text-blue-400 text-base"></i>;
            default:
                return <i className="ri-file-code-line text-gray-400 text-base"></i>;
        }
    };

    // Copy to clipboard helper
    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Code copied to clipboard!");
    };

    // Custom markdown-like code block parser (Neutral zinc styled)
    const parseMessageText = (text) => {
        if (!text) return null;
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                const language = match ? match[1] : '';
                const code = match ? match[2] : part.slice(3, -3);
                return (
                    <div key={index} className="my-2.5 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 font-mono text-[10.5px] text-left">
                        <div className="bg-zinc-900/80 px-3 py-1 flex justify-between items-center border-b border-zinc-850 text-zinc-400 text-[9px] uppercase font-bold tracking-wider">
                            <span>{language || 'code'}</span>
                            <button
                                type="button"
                                onClick={() => handleCopyToClipboard(code.trim())}
                                className="hover:text-white flex items-center gap-1 transition-colors bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-850"
                            >
                                <i className="ri-file-copy-line"></i> Copy
                            </button>
                        </div>
                        <pre className="p-2.5 overflow-x-auto text-zinc-300 leading-relaxed whitespace-pre scroll-container">
                            <code>{code.trim()}</code>
                        </pre>
                    </div>
                );
            }
            return <span key={index} className="whitespace-pre-wrap leading-relaxed">{part}</span>;
        });
    };

    // Render Chat Messages
    const renderMessage = (msg, index) => {
        const isAI = msg.sender?._id === 'ai';
        const isMe = msg.sender?._id === user?._id;

        if (isAI) {
            let aiText = "";
            let aiFiles = {};
            let buildCommand = null;
            let startCommand = null;

            try {
                const parsed = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
                aiText = parsed.text || "Generated updates";
                if (parsed.fileTree) aiFiles = parsed.fileTree;
                buildCommand = parsed.buildCommand;
                startCommand = parsed.startCommand;
            } catch (e) {
                aiText = typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message);
            }

            return (
                <div key={index} className="flex flex-col mb-3 bg-zinc-900/20 border border-zinc-850/80 p-3 rounded-lg max-w-[90%] self-start text-left">
                    <span className="text-[10px] font-bold text-zinc-400 mb-1 flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse"></span>
                        <i className="ri-robot-2-line"></i> whisper-assistant
                    </span>
                    <div className="text-[11px] text-zinc-300 leading-relaxed font-mono">{parseMessageText(aiText)}</div>
                    
                    {Object.keys(aiFiles).length > 0 && (
                        <div className="mt-2.5 border-t border-zinc-900/60 pt-2">
                            <span className="text-[10px] font-semibold text-zinc-400 block mb-1.5 font-mono">Created/Updated Files:</span>
                            <div className="space-y-1">
                                {Object.keys(aiFiles).map((filename, i) => (
                                    <div key={i} className="flex justify-between items-center bg-zinc-950/80 p-1.5 rounded border border-zinc-900">
                                        <span className="text-[10px] font-mono text-zinc-350 flex items-center gap-1">
                                            {getFileIcon(filename)}
                                            {filename}
                                        </span>
                                        <button
                                            onClick={() => handleCopyToClipboard(aiFiles[filename]?.file?.contents || "")}
                                            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 rounded transition-colors"
                                            title="Copy File Contents"
                                        >
                                            <i className="ri-file-copy-line text-xs"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(buildCommand || startCommand) && (
                        <div className="mt-2.5 border-t border-zinc-900/60 pt-2 bg-black/40 p-2.5 rounded border border-zinc-900 font-mono text-[10px] text-zinc-400 space-y-0.5">
                            {buildCommand && (
                                <div className="flex items-center gap-1">
                                    <span className="text-zinc-650 font-bold">$ </span>
                                    <span>{buildCommand.mainItem} {buildCommand.commands?.join(" ")}</span>
                                </div>
                            )}
                            {startCommand && (
                                <div className="flex items-center gap-1">
                                    <span className="text-zinc-650 font-bold">$ </span>
                                    <span>{startCommand.mainItem} {startCommand.commands?.join(" ")}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={index} className={`flex flex-col mb-2.5 p-2.5 rounded-lg max-w-[85%] border font-mono ${
                isMe 
                    ? "bg-zinc-900/60 border-zinc-800 text-zinc-200 self-end text-left" 
                    : "bg-zinc-950 border-zinc-900 text-zinc-300 self-start text-left"
            }`}>
                <span className={`text-[9px] font-bold mb-1 font-mono tracking-wide ${isMe ? "text-zinc-450" : "text-zinc-500"}`}>
                    {msg.sender?.email}
                </span>
                <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{parseMessageText(msg.message)}</div>
            </div>
        );
    };

    return (
        <main className="h-screen w-screen bg-obsidian-950 text-obsidian-100 flex flex-col overflow-hidden font-sans relative">
            {/* Top-center ambient indigo glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-accent-violet/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

            {/* Header */}
            <header className="h-14 border-b border-obsidian-850 px-4 flex justify-between items-center bg-obsidian-900 flex-shrink-0 relative z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/')}
                        className="p-2 bg-obsidian-950 hover:bg-obsidian-800 text-obsidian-300 hover:text-white rounded-xl border border-obsidian-800 transition-all duration-200 flex items-center justify-center shadow-sm"
                        title="Back to Dashboard"
                    >
                        <i className="ri-arrow-left-line text-sm"></i>
                    </button>
                    <h1 className="text-xs font-bold tracking-tight capitalize flex items-center gap-2 text-white font-mono">
                        <i className="ri-folder-line text-accent-violet"></i> {project?.name || "loading..."}
                    </h1>
                </div>
                
                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2 text-obsidian-300 bg-obsidian-950 px-3 py-1.5 rounded-xl border border-obsidian-850 shadow-inner">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span>{user?.email}</span>
                    </div>
                    {/* Toggle Chat Button */}
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`p-1.5 rounded-xl border transition-all duration-200 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs ${
                            isChatOpen 
                                ? "bg-white text-obsidian-950 border-white hover:bg-obsidian-100 shadow-md font-bold" 
                                : "bg-obsidian-900 text-obsidian-300 border-obsidian-800 hover:text-white"
                        }`}
                        title={isChatOpen ? "Collapse Chat & AI" : "Expand Chat & AI"}
                    >
                        <i className="ri-message-3-line text-sm"></i>
                        <span>{isChatOpen ? "Hide Chat" : "Show Chat"}</span>
                    </button>
                </div>
            </header>

            {/* Editor Workspace Panels */}
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* 1. Activity Bar (Left-most vertical strip) */}
                <aside className="w-14 border-r border-obsidian-850 bg-obsidian-900 flex flex-col justify-between items-center py-4 flex-shrink-0 select-none shadow-sm">
                    <div className="flex flex-col items-center gap-4 w-full">
                        {/* Explorer icon */}
                        <div className="relative group w-full flex justify-center">
                            <div className="absolute left-0 top-1 w-1 h-6 bg-accent-violet rounded-r-md"></div>
                            <div 
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-obsidian-950 border border-obsidian-850 shadow-inner cursor-pointer"
                                title="Explorer"
                            >
                                <i className="ri-file-code-line text-base text-accent-violet"></i>
                            </div>
                        </div>

                        {/* Chat icon indicator inside Activity Bar */}
                        <div 
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-250 border ${
                                isChatOpen 
                                    ? "text-white bg-obsidian-950 border-obsidian-800 shadow-inner" 
                                    : "text-obsidian-500 hover:text-obsidian-200 hover:bg-obsidian-850 border-transparent"
                            }`}
                            title="Toggle Chat & AI"
                        >
                            <i className="ri-message-3-line text-base"></i>
                        </div>

                        {/* Invite modal trigger inside Activity Bar */}
                        <div 
                            onClick={handleOpenInviteModal}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-obsidian-500 hover:text-obsidian-200 hover:bg-obsidian-850 border border-transparent cursor-pointer transition-all duration-250"
                            title="Add Collaborator"
                        >
                            <i className="ri-user-add-line text-base"></i>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                        {/* User initials representation */}
                        <div 
                            className="w-8 h-8 rounded-full bg-obsidian-950 border border-obsidian-850 flex items-center justify-center text-[10px] font-bold text-obsidian-400 font-mono uppercase cursor-default shadow-inner"
                            title={user?.email}
                        >
                            {user?.email ? user.email.slice(0, 2) : "??"}
                        </div>
                    </div>
                </aside>

                {/* 2. Unified Sidebar - Files & Collaborators */}
                <aside className="w-60 border-r border-obsidian-850 bg-obsidian-900 flex flex-col flex-shrink-0 shadow-sm">
                    {/* Local File Search Input */}
                    <div className="p-3 border-b border-obsidian-850/60 bg-obsidian-900/50">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-obsidian-500 pointer-events-none">
                                <i className="ri-search-line text-xs"></i>
                            </span>
                            <input
                                value={fileSearchQuery}
                                onChange={(e) => setFileSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 bg-obsidian-950 border border-obsidian-800 hover:border-obsidian-750 focus:border-accent-violet rounded-lg text-[11px] text-white placeholder-obsidian-500 focus:outline-none transition-all font-mono"
                                placeholder="Search files..."
                            />
                            {fileSearchQuery && (
                                <button 
                                    onClick={() => setFileSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-obsidian-400 hover:text-white"
                                >
                                    <i className="ri-close-line text-xs"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Files Section */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-[150px] bg-obsidian-900/10">
                        <div className="p-3 pb-1.5 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-obsidian-400 tracking-widest uppercase font-mono">Files</span>
                            <button 
                                onClick={handleCreateFile}
                                className="w-5 h-5 bg-obsidian-950 hover:bg-obsidian-800 border border-obsidian-800 text-obsidian-300 hover:text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
                                title="Create File"
                            >
                                <i className="ri-file-add-line text-xs"></i>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scroll-container">
                            {Object.keys(fileTree).filter(filename => 
                                filename.toLowerCase().includes(fileSearchQuery.toLowerCase())
                            ).length === 0 ? (
                                <div className="text-center text-[10px] text-obsidian-500 py-8 font-mono">
                                    {Object.keys(fileTree).length === 0 ? "No files inside project." : "No files matched."}
                                </div>
                            ) : (
                                Object.keys(fileTree)
                                    .filter(filename => filename.toLowerCase().includes(fileSearchQuery.toLowerCase()))
                                    .map((filename) => (
                                        <div
                                            key={filename}
                                            onClick={() => handleOpenFile(filename)}
                                            className={`w-full group/file flex items-center justify-between px-2.5 py-2 text-[11px] font-mono rounded-lg transition-all cursor-pointer border ${
                                                selectedFile === filename 
                                                    ? "bg-obsidian-950 text-white border-obsidian-800 shadow-sm" 
                                                    : "text-obsidian-350 hover:text-white hover:bg-obsidian-850/50 border-transparent"
                                            }`}
                                        >
                                            <span className="truncate flex items-center gap-2">
                                                {getFileIcon(filename)}
                                                {filename}
                                            </span>
                                            <button
                                                onClick={(e) => handleDeleteFile(e, filename)}
                                                className="opacity-0 group-hover/file:opacity-100 p-0.5 text-obsidian-500 hover:text-red-400 rounded transition-opacity"
                                                title="Delete File"
                                            >
                                                <i className="ri-delete-bin-line text-xs"></i>
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Collaborators Collapsible Section */}
                    <div className="border-t border-obsidian-850 bg-obsidian-900 flex flex-col flex-shrink-0 shadow-inner">
                        <div 
                            onClick={() => setIsCollabSectionCollapsed(!isCollabSectionCollapsed)}
                            className="p-3 flex justify-between items-center cursor-pointer select-none hover:bg-obsidian-850/30 transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <i className={`text-obsidian-500 text-xs transition-transform duration-200 ${isCollabSectionCollapsed ? "ri-arrow-right-s-line" : "ri-arrow-down-s-line"}`}></i>
                                <span className="text-[10px] font-bold text-obsidian-450 tracking-widest uppercase font-mono">
                                    Collaborators
                                </span>
                                <span className="text-[9px] bg-obsidian-950 border border-obsidian-800 px-1.5 py-0.2 rounded-lg text-obsidian-400 font-mono shadow-inner">
                                    {collaborators.length}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInviteModal();
                                }}
                                className="w-5 h-5 bg-obsidian-950 hover:bg-obsidian-800 border border-obsidian-800 text-obsidian-300 hover:text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
                                title="Add Collaborator"
                            >
                                <i className="ri-user-add-line text-xs"></i>
                            </button>
                        </div>
                        
                        {!isCollabSectionCollapsed && (
                            <div className="max-h-48 overflow-y-auto p-2 pt-0 space-y-1 scroll-container border-t border-obsidian-850/30">
                                {collaborators.map((c) => (
                                    <div key={c._id} className="flex items-center gap-2 p-1.5 bg-obsidian-900/20 rounded-lg border border-transparent hover:border-obsidian-800 hover:bg-obsidian-850/35 transition-all duration-150">
                                        <div className="w-5 h-5 rounded-lg bg-obsidian-950 border border-obsidian-800 flex items-center justify-center font-bold text-[9px] text-obsidian-400 uppercase font-mono shadow-sm">
                                            {c.email.slice(0, 2)}
                                        </div>
                                        <span className="text-[10.5px] text-obsidian-350 font-mono truncate flex-1" title={c.email}>{c.email}</span>
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0 animate-pulse" title="Online"></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* 3. Editor Viewport */}
                <section className="flex-1 bg-black flex flex-col min-w-0 border-r border-zinc-800">
                    {openTabs.length > 0 ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* VS Code Style Multi-Tab Header Strip */}
                            <div className="h-9 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center pr-3 flex-shrink-0 select-none overflow-hidden">
                                <div className="flex-1 flex overflow-x-auto scroll-container h-full">
                                    {openTabs.map((filename) => {
                                        const isActive = selectedFile === filename;
                                        return (
                                            <div
                                                key={filename}
                                                onClick={() => handleOpenFile(filename)}
                                                className={`group/tab h-full flex items-center gap-2 px-3.5 border-r border-zinc-900 cursor-pointer transition-all text-[11px] font-mono relative ${
                                                    isActive 
                                                        ? "bg-black text-white border-t-2 border-t-white font-semibold" 
                                                        : "bg-zinc-950/40 text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/20"
                                                }`}
                                            >
                                                {getFileIcon(filename)}
                                                <span className="truncate max-w-[120px]">{filename}</span>
                                                
                                                {/* Unsaved status dot or Close cross button */}
                                                {isUnsaved && isActive ? (
                                                    <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 group-hover/tab:hidden"></span>
                                                ) : null}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCloseTab(filename);
                                                    }}
                                                    className={`p-0.5 rounded text-zinc-550 hover:text-white hover:bg-zinc-900 transition-all ${
                                                        isActive ? "flex" : "hidden group-hover/tab:flex"
                                                    }`}
                                                    title="Close Tab"
                                                >
                                                    <i className="ri-close-line text-xs"></i>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Save Action Button aligned with tab strip */}
                                <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                                    {selectedFile && (
                                        <button
                                            onClick={handleSaveFile}
                                            className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded transition-all font-mono font-bold shadow-sm ${
                                                isUnsaved 
                                                    ? "bg-white hover:bg-zinc-200 text-black" 
                                                    : "bg-zinc-900 text-zinc-550 cursor-not-allowed border border-zinc-850"
                                            }`}
                                            disabled={!isUnsaved}
                                        >
                                            <i className="ri-save-line text-xs"></i> 
                                            <span>Save</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Active Editor Panel */}
                            {selectedFile ? (
                                <Editor
                                    height="100%"
                                    language={getLanguageFromFilename(selectedFile)}
                                    value={editorContent}
                                    onChange={(value) => {
                                        setEditorContent(value ?? "");
                                        setIsUnsaved(true);
                                    }}
                                    theme="vs-dark"
                                    options={{
                                        automaticLayout: true,
                                        scrollBeyondLastLine: false,
                                        fontSize: 13,
                                        minimap: { enabled: false }
                                    }}
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black">
                                    <div className="w-12 h-12 rounded-lg bg-zinc-900/50 flex items-center justify-center mb-3 border border-zinc-800 shadow-sm">
                                        <i className="ri-file-code-line text-2xl text-zinc-500"></i>
                                    </div>
                                    <h3 className="text-xs font-bold text-zinc-300 tracking-tight font-mono">No active tab selected</h3>
                                    <p className="text-[10px] text-zinc-500 max-w-xs mt-1 font-mono leading-relaxed">
                                        Select an open file from your tab strip or folder tree.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black">
                            <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4 shadow-xl">
                                <i className="ri-code-s-slash-line text-2xl text-zinc-400"></i>
                            </div>
                            <h3 className="text-sm font-bold text-zinc-200 tracking-tight font-mono">whisper-sandbox</h3>
                            <p className="text-[11px] text-zinc-500 max-w-sm mt-1.5 font-mono leading-relaxed">
                                Select or create a file from the explorer pane to start coding collaboratively.
                            </p>
                            <div className="mt-6 flex flex-col gap-2 max-w-xs w-full text-left bg-zinc-950/50 p-4 rounded-lg border border-zinc-900 font-mono text-[10.5px] text-zinc-450">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Quick Actions</span>
                                <button 
                                    onClick={handleCreateFile}
                                    className="flex items-center gap-2 hover:text-white transition-colors"
                                >
                                    <span className="w-4 flex justify-center"><i className="ri-file-add-line"></i></span>
                                    <span>Create new file</span>
                                </button>
                                <button 
                                    onClick={handleOpenInviteModal}
                                    className="flex items-center gap-2 hover:text-white transition-colors"
                                >
                                    <span className="w-4 flex justify-center"><i className="ri-user-add-line"></i></span>
                                    <span>Add team member</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsChatOpen(true);
                                        setTimeout(() => {
                                            if (textareaRef.current) textareaRef.current.focus();
                                        }, 100);
                                    }}
                                    className="flex items-center gap-2 hover:text-white transition-colors"
                                >
                                    <span className="w-4 flex justify-center"><i className="ri-message-3-line"></i></span>
                                    <span>Open workspace chat</span>
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* 4. Chat Drawer / AI Panel */}
                {isChatOpen && (
                    <section className="w-80 bg-zinc-950 flex flex-col flex-shrink-0 border-l border-zinc-800">
                        <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                            <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase font-mono">Chatroom & AI</span>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[10px] text-zinc-550 bg-zinc-900/60 px-2 py-0.5 rounded font-mono border border-zinc-900">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <span>Live</span>
                                </div>
                                <button 
                                    onClick={() => setIsChatOpen(false)}
                                    className="text-zinc-550 hover:text-zinc-300 p-0.5 rounded"
                                    title="Close Panel"
                                >
                                    <i className="ri-close-line text-sm"></i>
                                </button>
                            </div>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto p-3 flex flex-col message-box scroll-container">
                            {messages.length === 0 && (
                                <div className="my-auto text-center text-[11px] text-zinc-550 px-4 font-mono leading-relaxed">
                                    <p className="mb-2">No messages yet.</p>
                                    <div className="bg-zinc-900/20 p-3 rounded-lg border border-zinc-900 text-left">
                                        <strong className="text-zinc-450 block mb-1 font-bold text-[10px]"><i className="ri-lightbulb-line text-zinc-500"></i> AI Prompts</strong>
                                        Type <code className="text-zinc-300 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-850">@ai Create web app</code> to prompt the model.
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, i) => renderMessage(msg, i))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick AI Prompts chips bar */}
                        <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto scroll-container border-t border-zinc-900/60 bg-zinc-950 select-none">
                            <button
                                type="button"
                                onClick={() => setInputMessage("@ai explain the code")}
                                className="text-[9px] font-mono text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                            >
                                @ai explain
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMessage("@ai fix bugs in this file")}
                                className="text-[9px] font-mono text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                            >
                                @ai debug
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMessage("@ai optimize performance")}
                                className="text-[9px] font-mono text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                            >
                                @ai optimize
                            </button>
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-2 border-t border-zinc-800 bg-zinc-950">
                            <div className="relative">
                                <input
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    className="w-full pl-3 pr-9 py-2 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 focus:ring-0 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                                    placeholder="Message developers or @ai..."
                                />
                                <button
                                    type="submit"
                                    className="absolute right-1 top-1 w-6 h-6 bg-white hover:bg-zinc-200 text-black rounded flex items-center justify-center transition-colors shadow-sm"
                                >
                                    <i className="ri-send-plane-2-line text-xs"></i>
                                </button>
                            </div>
                        </form>
                    </section>
                )}
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 transition-opacity">
                    <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-sm font-bold text-white tracking-tight font-mono">Add Collaborator</h2>
                            <button 
                                onClick={() => {
                                    setIsInviteModalOpen(false);
                                    setSearchQuery("");
                                }}
                                className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors"
                            >
                                <i className="ri-close-line text-lg"></i>
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:ring-0 rounded-lg text-xs text-white placeholder-zinc-650 focus:outline-none transition-all font-mono"
                                placeholder="Search email..."
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1.5 mb-2 scroll-container">
                            {allUsers
                                .filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((u) => {
                                    const isAlreadyMember = collaborators.some(collab => collab._id === u._id);
                                    return (
                                        <div key={u._id} className="flex justify-between items-center p-2 bg-zinc-900/50 rounded-lg border border-zinc-900 font-mono">
                                            <span className="text-[11px] text-zinc-450 truncate mr-2" title={u.email}>{u.email}</span>
                                            {isAlreadyMember ? (
                                                <span className="text-[9px] text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">Member</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddCollaborator(u._id)}
                                                    className="bg-white hover:bg-zinc-200 text-black text-[9px] font-bold px-2 py-1 rounded transition-colors"
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
