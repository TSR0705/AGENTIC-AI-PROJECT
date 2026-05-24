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
    const gutterRef = useRef(null);
    const textareaRef = useRef(null);

    // Sync scrolling between textarea and line gutter
    const handleScroll = (e) => {
        if (gutterRef.current) {
            gutterRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Enable indentation with Tab key inside textarea
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const tabChar = "    ";
            const newContent = editorContent.substring(0, start) + tabChar + editorContent.substring(end);
            setEditorContent(newContent);
            setIsUnsaved(true);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tabChar.length;
                }
            }, 0);
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
        <main className="h-screen w-screen bg-black text-zinc-100 flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="h-12 border-b border-zinc-800 px-4 flex justify-between items-center bg-zinc-950 flex-shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/')}
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg border border-zinc-805 transition-colors flex items-center justify-center"
                        title="Back to Dashboard"
                    >
                        <i className="ri-arrow-left-line text-sm"></i>
                    </button>
                    <h1 className="text-xs font-semibold tracking-tight capitalize flex items-center gap-2 text-zinc-200 font-mono">
                        <i className="ri-folder-line text-zinc-500"></i> {project?.name || "loading..."}
                    </h1>
                </div>
                
                <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-900">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span>{user?.email}</span>
                    </div>
                    {/* Toggle Chat Button */}
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center gap-1.5 px-2.5 py-1 ${
                            isChatOpen 
                                ? "bg-white text-black border-white hover:bg-zinc-200" 
                                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                        }`}
                        title={isChatOpen ? "Collapse Chat & AI" : "Expand Chat & AI"}
                    >
                        <i className="ri-message-3-line text-sm"></i>
                        <span>{isChatOpen ? "Hide Chat" : "Show Chat"}</span>
                    </button>
                </div>
            </header>

            {/* Editor Workspace Panels */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Activity Bar (Left-most vertical strip) */}
                <aside className="w-12 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between items-center py-4 flex-shrink-0 select-none">
                    <div className="flex flex-col items-center gap-4">
                        {/* Explorer icon */}
                        <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
                            title="Explorer"
                        >
                            <i className="ri-file-code-line text-base"></i>
                        </div>
                        {/* Chat icon indicator inside Activity Bar */}
                        <div 
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
                                isChatOpen 
                                    ? "text-white bg-zinc-900 border-zinc-800" 
                                    : "text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/40 border-transparent"
                            }`}
                            title="Toggle Chat & AI"
                        >
                            <i className="ri-message-3-line text-base"></i>
                        </div>
                        {/* Invite modal trigger inside Activity Bar */}
                        <div 
                            onClick={handleOpenInviteModal}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/40 border border-transparent cursor-pointer transition-colors"
                            title="Add Collaborator"
                        >
                            <i className="ri-user-add-line text-base"></i>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                        {/* User initials representation */}
                        <div 
                            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 font-mono uppercase cursor-default"
                            title={user?.email}
                        >
                            {user?.email ? user.email.slice(0, 2) : "??"}
                        </div>
                    </div>
                </aside>

                {/* 2. Unified Sidebar - Files & Collaborators */}
                <aside className="w-60 border-r border-zinc-800 bg-zinc-950 flex flex-col flex-shrink-0">
                    {/* Local File Search Input */}
                    <div className="p-3 border-b border-zinc-900/60">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-zinc-550 pointer-events-none">
                                <i className="ri-search-line text-xs"></i>
                            </span>
                            <input
                                value={fileSearchQuery}
                                onChange={(e) => setFileSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 focus:ring-0 rounded text-[11px] text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                                placeholder="Search files..."
                            />
                            {fileSearchQuery && (
                                <button 
                                    onClick={() => setFileSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-500 hover:text-zinc-350"
                                >
                                    <i className="ri-close-line text-xs"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Files Section */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
                        <div className="p-3 pb-1.5 flex justify-between items-center bg-zinc-950">
                            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono">Files</span>
                            <button 
                                onClick={handleCreateFile}
                                className="w-5 h-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200 rounded transition-colors flex items-center justify-center"
                                title="Create File"
                            >
                                <i className="ri-file-add-line text-xs"></i>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scroll-container">
                            {Object.keys(fileTree).filter(filename => 
                                filename.toLowerCase().includes(fileSearchQuery.toLowerCase())
                            ).length === 0 ? (
                                <div className="text-center text-[10px] text-zinc-600 py-6 font-mono">
                                    {Object.keys(fileTree).length === 0 ? "No files." : "No matches found."}
                                </div>
                            ) : (
                                Object.keys(fileTree)
                                    .filter(filename => filename.toLowerCase().includes(fileSearchQuery.toLowerCase()))
                                    .map((filename) => (
                                        <div
                                            key={filename}
                                            onClick={() => handleOpenFile(filename)}
                                            className={`w-full group/file flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono rounded transition-all cursor-pointer border ${
                                                selectedFile === filename 
                                                    ? "bg-zinc-900 text-white border-zinc-850" 
                                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border-transparent"
                                            }`}
                                        >
                                            <span className="truncate flex items-center gap-2">
                                                {getFileIcon(filename)}
                                                {filename}
                                            </span>
                                            <button
                                                onClick={(e) => handleDeleteFile(e, filename)}
                                                className="opacity-0 group-hover/file:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 rounded transition-opacity"
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
                    <div className="border-t border-zinc-900/80 bg-zinc-950 flex flex-col flex-shrink-0">
                        <div 
                            onClick={() => setIsCollabSectionCollapsed(!isCollabSectionCollapsed)}
                            className="p-3 flex justify-between items-center cursor-pointer select-none hover:bg-zinc-900/10 transition-colors"
                        >
                            <div className="flex items-center gap-1.5">
                                <i className={`text-zinc-500 text-xs transition-transform duration-200 ${isCollabSectionCollapsed ? "ri-arrow-right-s-line" : "ri-arrow-down-s-line"}`}></i>
                                <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase font-mono">
                                    Collaborators
                                </span>
                                <span className="text-[9px] bg-zinc-900 border border-zinc-850 px-1.5 py-0.2 rounded text-zinc-500 font-mono">
                                    {collaborators.length}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInviteModal();
                                }}
                                className="w-5 h-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200 rounded transition-colors flex items-center justify-center"
                                title="Add Collaborator"
                            >
                                <i className="ri-user-add-line text-xs"></i>
                            </button>
                        </div>
                        
                        {!isCollabSectionCollapsed && (
                            <div className="max-h-48 overflow-y-auto p-2 pt-0 space-y-1 scroll-container border-t border-zinc-900/30">
                                {collaborators.map((c) => (
                                    <div key={c._id} className="flex items-center gap-2 p-1.5 bg-zinc-900/10 rounded border border-transparent hover:border-zinc-900 hover:bg-zinc-900/30 transition-all duration-150">
                                        <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-855 flex items-center justify-center font-bold text-[9px] text-zinc-400 uppercase font-mono shadow-sm">
                                            {c.email.slice(0, 2)}
                                        </div>
                                        <span className="text-[10.5px] text-zinc-450 font-mono truncate flex-1" title={c.email}>{c.email}</span>
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" title="Online"></span>
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
                                <div className="flex-1 flex flex-col overflow-hidden bg-black">
                                    {/* Editor Textarea with Synced Line Gutter */}
                                    <div className="flex-1 flex overflow-hidden relative">
                                        <div 
                                            ref={gutterRef}
                                            className="w-10 bg-zinc-950/20 border-r border-zinc-900 text-zinc-700 font-mono text-[11px] text-right pr-2.5 select-none overflow-hidden scroll-container"
                                            style={{
                                                paddingTop: '12px',
                                                paddingBottom: '12px',
                                                lineHeight: '18px'
                                            }}
                                        >
                                            {editorContent.split('\n').map((_, i) => (
                                                <div key={i} className="h-[18px] leading-[18px]">{i + 1}</div>
                                            ))}
                                        </div>
                                        <textarea
                                            ref={textareaRef}
                                            value={editorContent}
                                            onChange={(e) => {
                                                setEditorContent(e.target.value);
                                                setIsUnsaved(true);
                                            }}
                                            onScroll={handleScroll}
                                            onKeyDown={handleKeyDown}
                                            className="flex-1 h-full bg-transparent font-mono text-[11px] text-zinc-300 focus:outline-none resize-none overflow-y-auto overflow-x-auto whitespace-pre p-3 scroll-container"
                                            style={{
                                                tabSize: 4,
                                                outline: 'none',
                                                lineHeight: '18px',
                                                paddingTop: '12px',
                                                paddingBottom: '12px'
                                            }}
                                            placeholder="Write your code here..."
                                        />
                                    </div>
                                    {/* Editor Status Bar */}
                                    <div className="h-6 border-t border-zinc-900 bg-zinc-950 px-4 flex justify-between items-center text-[10px] text-zinc-550 font-mono flex-shrink-0 select-none">
                                        <div className="flex items-center gap-3">
                                            <span>Words: {editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0}</span>
                                            <span>Chars: {editorContent.length}</span>
                                            <span className="text-zinc-800">|</span>
                                            <span>Lines: {editorContent.split('\n').length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="capitalize">{selectedFile.split('.').pop() || "Plaintext"}</span>
                                            <span className="text-zinc-800">|</span>
                                            {isUnsaved ? (
                                                <span className="text-yellow-500 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Unsaved Changes
                                                </span>
                                            ) : (
                                                <span className="text-zinc-550 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span> Synced
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
