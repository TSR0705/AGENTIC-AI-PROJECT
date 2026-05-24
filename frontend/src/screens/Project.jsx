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

    // Open file
    const handleOpenFile = (filename) => {
        setSelectedFile(filename);
        setEditorContent(fileTree[filename]?.file?.contents || "");
        setIsUnsaved(false);
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

    // Create file
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

        axios.put('/projects/update-file-tree', {
            projectId,
            fileTree: updatedTree
        }).catch(err => console.error(err));
    };

    // Delete file
    const handleDeleteFile = (e, filename) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

        const updatedTree = { ...fileTree };
        delete updatedTree[filename];
        
        setFileTree(updatedTree);
        if (selectedFile === filename) {
            setSelectedFile(null);
            setEditorContent("");
            setIsUnsaved(false);
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

    // Custom markdown-like code block parser
    const parseMessageText = (text) => {
        if (!text) return null;
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                const language = match ? match[1] : '';
                const code = match ? match[2] : part.slice(3, -3);
                return (
                    <div key={index} className="my-3 rounded-xl overflow-hidden border border-gray-800 bg-gray-950 font-mono text-[11px] text-left shadow-inner">
                        <div className="bg-gray-900/90 px-3 py-1.5 flex justify-between items-center border-b border-gray-850 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                            <span>{language || 'code'}</span>
                            <button
                                type="button"
                                onClick={() => handleCopyToClipboard(code.trim())}
                                className="hover:text-indigo-400 flex items-center gap-1 transition-colors bg-gray-950 px-2 py-0.5 rounded border border-gray-800"
                            >
                                <i className="ri-file-copy-line"></i> Copy
                            </button>
                        </div>
                        <pre className="p-3 overflow-x-auto text-gray-300 leading-relaxed whitespace-pre scroll-container">
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
                <div key={index} className="flex flex-col mb-4 bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl max-w-[90%] self-start text-left shadow-lg">
                    <span className="text-xs font-bold text-indigo-400 mb-1.5 flex items-center gap-1.5 font-mono">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        <i className="ri-robot-2-line"></i> WhisperAgent
                    </span>
                    <div className="text-sm text-gray-200 leading-relaxed">{parseMessageText(aiText)}</div>
                    
                    {Object.keys(aiFiles).length > 0 && (
                        <div className="mt-3.5 border-t border-indigo-900/40 pt-3">
                            <span className="text-xs font-semibold text-indigo-300 block mb-2">Created/Updated Files:</span>
                            <div className="space-y-1.5">
                                {Object.keys(aiFiles).map((filename, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-950/60 p-2 rounded-lg border border-gray-900/80">
                                        <span className="text-xs font-mono text-gray-300 flex items-center gap-1.5">
                                            {getFileIcon(filename)}
                                            {filename}
                                        </span>
                                        <button
                                            onClick={() => handleCopyToClipboard(aiFiles[filename]?.file?.contents || "")}
                                            className="p-1 text-gray-500 hover:text-indigo-400 hover:bg-indigo-900/10 rounded transition-colors"
                                            title="Copy File Contents"
                                        >
                                            <i className="ri-file-copy-line text-sm"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(buildCommand || startCommand) && (
                        <div className="mt-3.5 border-t border-indigo-900/40 pt-3 bg-black/40 p-3 rounded-lg border border-gray-900 font-mono text-xs text-green-400 space-y-1">
                            {buildCommand && (
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-600 font-bold">$ </span>
                                    <span>{buildCommand.mainItem} {buildCommand.commands?.join(" ")}</span>
                                </div>
                            )}
                            {startCommand && (
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-600 font-bold">$ </span>
                                    <span>{startCommand.mainItem} {startCommand.commands?.join(" ")}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div key={index} className={`flex flex-col mb-3 p-3 rounded-xl max-w-[85%] shadow-md border ${
                isMe 
                    ? "bg-indigo-600/25 border-indigo-500/20 text-white self-end text-left" 
                    : "bg-gray-900/50 border-gray-800/60 text-gray-200 self-start text-left"
            }`}>
                <span className={`text-[10px] font-bold mb-1 font-mono tracking-wide ${isMe ? "text-indigo-400" : "text-gray-400"}`}>
                    {msg.sender?.email}
                </span>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{parseMessageText(msg.message)}</div>
            </div>
        );
    };

    return (
        <main className="h-screen w-screen bg-gray-950 text-white flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="h-14 border-b border-gray-900 px-6 flex justify-between items-center bg-gray-900/30 backdrop-blur-md flex-shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/')}
                        className="p-2 bg-gray-900 hover:bg-gray-800/80 text-gray-400 hover:text-white rounded-xl border border-gray-900 transition-colors flex items-center justify-center"
                        title="Back to Dashboard"
                    >
                        <i className="ri-arrow-left-line"></i>
                    </button>
                    <h1 className="text-base font-bold tracking-tight capitalize flex items-center gap-2 text-indigo-400 font-mono">
                        <i className="ri-terminal-box-line"></i> {project?.name || "Loading..."}
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-400 bg-gray-900/40 px-3.5 py-1.5 rounded-xl border border-gray-900/60 font-mono text-xs">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span>{user?.email}</span>
                    </div>
                </div>
            </header>

            {/* Editor Workspace Panels */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Sidebar - Collaborators */}
                <aside className="w-56 border-r border-gray-900 bg-gray-950 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-900 flex justify-between items-center bg-gray-950/40">
                        <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Collaborators</span>
                        <button 
                            onClick={handleOpenInviteModal}
                            className="w-6 h-6 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors flex items-center justify-center"
                            title="Add Collaborator"
                        >
                            <i className="ri-user-add-line text-sm"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {collaborators.map((c, i) => (
                            <div key={c._id} className="flex items-center gap-2.5 p-2 bg-gray-900/20 rounded-xl border border-gray-900/40 hover:border-gray-800/40 transition-colors">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-gray-800 to-gray-900 border border-gray-800 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase font-mono shadow-sm">
                                    {c.email.slice(0, 2)}
                                </div>
                                <span className="text-xs text-gray-300 font-mono truncate" title={c.email}>{c.email}</span>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* 2. File Explorer */}
                <aside className="w-56 border-r border-gray-900 bg-gray-950 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-900 flex justify-between items-center bg-gray-950/40">
                        <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Files</span>
                        <button 
                            onClick={handleCreateFile}
                            className="w-6 h-6 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-colors flex items-center justify-center"
                            title="Create File"
                        >
                            <i className="ri-file-add-line text-sm"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {Object.keys(fileTree).length === 0 ? (
                            <div className="text-center text-xs text-gray-600 py-10 font-mono">
                                No files yet. Ask @ai to build files.
                            </div>
                        ) : (
                            Object.keys(fileTree).map((filename) => (
                                <div
                                    key={filename}
                                    onClick={() => handleOpenFile(filename)}
                                    className={`w-full group/file flex items-center justify-between px-3 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer border ${
                                        selectedFile === filename 
                                            ? "bg-indigo-900/10 text-indigo-300 border-indigo-500/20 shadow-sm" 
                                            : "text-gray-400 hover:text-white hover:bg-gray-900/40 border-transparent"
                                    }`}
                                >
                                    <span className="truncate flex items-center gap-2">
                                        {getFileIcon(filename)}
                                        {filename}
                                    </span>
                                    <button
                                        onClick={(e) => handleDeleteFile(e, filename)}
                                        className="opacity-0 group-hover/file:opacity-100 p-0.5 text-gray-500 hover:text-red-400 rounded transition-opacity"
                                        title="Delete File"
                                    >
                                        <i className="ri-delete-bin-line"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* 3. Editor Viewport */}
                <section className="flex-1 bg-gray-950 flex flex-col min-w-0 border-r border-gray-900">
                    {selectedFile ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Editor Header */}
                            <div className="h-11 border-b border-gray-900 px-4 flex justify-between items-center bg-gray-950 flex-shrink-0">
                                <span className="text-xs font-mono text-gray-300 flex items-center gap-1.5">
                                    {getFileIcon(selectedFile)}
                                    {selectedFile}
                                    {isUnsaved && (
                                        <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full" title="Unsaved changes"></span>
                                    )}
                                </span>
                                <button
                                    onClick={handleSaveFile}
                                    className={`flex items-center gap-1 border text-xs px-2.5 py-1 rounded-lg transition-all font-semibold ${
                                        isUnsaved 
                                            ? "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-950/20" 
                                            : "bg-gray-900 text-gray-500 border-gray-900 cursor-not-allowed"
                                    }`}
                                    disabled={!isUnsaved}
                                >
                                    <i className="ri-save-line"></i> Save File
                                </button>
                            </div>
                            {/* Editor Textarea with Synced Line Gutter */}
                            <div className="flex-1 flex overflow-hidden relative">
                                <div 
                                    ref={gutterRef}
                                    className="w-12 bg-gray-950 border-r border-gray-900 text-gray-600 font-mono text-xs text-right pr-3 select-none overflow-hidden scroll-container"
                                    style={{
                                        paddingTop: '16px',
                                        paddingBottom: '16px',
                                        lineHeight: '20px'
                                    }}
                                >
                                    {editorContent.split('\n').map((_, i) => (
                                        <div key={i} className="h-5 leading-5">{i + 1}</div>
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
                                    className="flex-1 h-full bg-gray-950 font-mono text-xs text-gray-300 focus:outline-none resize-none overflow-y-auto overflow-x-auto whitespace-pre p-4"
                                    style={{
                                        tabSize: 4,
                                        outline: 'none',
                                        lineHeight: '20px',
                                        paddingTop: '16px',
                                        paddingBottom: '16px'
                                    }}
                                    placeholder="Write your code here..."
                                />
                            </div>
                            {/* Editor Status Bar */}
                            <div className="h-7 border-t border-gray-900 bg-gray-950 px-4 flex justify-between items-center text-[10px] text-gray-500 font-mono flex-shrink-0 select-none">
                                <div className="flex items-center gap-3">
                                    <span>Words: {editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0}</span>
                                    <span>Chars: {editorContent.length}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isUnsaved ? (
                                        <span className="text-yellow-500/80 flex items-center gap-1"><i className="ri-alert-line"></i> Unsaved Changes</span>
                                    ) : (
                                        <span className="text-emerald-500/80 flex items-center gap-1"><i className="ri-checkbox-circle-line"></i> Synchronized</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-950/40">
                            <div className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center mb-4 border border-gray-900 shadow-lg">
                                <i className="ri-code-s-slash-line text-3xl text-gray-500"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-300 tracking-tight">No File Opened</h3>
                            <p className="text-xs text-gray-500 max-w-xs mt-1 font-mono leading-relaxed">
                                Select or create a file from the explorer pane, or ask @ai to generate contents.
                            </p>
                        </div>
                    )}
                </section>

                {/* 4. Chat Drawer */}
                <section className="w-80 bg-gray-950 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-900 flex items-center justify-between bg-gray-950/40">
                        <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Chatroom & AI</span>
                        <div className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg font-mono">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                            <span>Live</span>
                        </div>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col message-box">
                        {messages.length === 0 && (
                            <div className="my-auto text-center text-xs text-gray-600 px-4 font-mono leading-relaxed">
                                <p className="mb-3">No messages yet.</p>
                                <div className="bg-gray-900/30 p-3.5 rounded-xl border border-gray-900 text-left">
                                    <strong className="text-indigo-400 block mb-1.5 font-bold"><i className="ri-lightbulb-line"></i> Sandbox Help</strong>
                                    Type <code className="text-gray-300 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">@ai Create web app</code> to trigger generative templates.
                                </div>
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
                                className="w-full pl-3.5 pr-11 py-3 bg-gray-900 border border-gray-850 hover:border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                                placeholder="Message developers or trigger @ai..."
                            />
                            <button
                                type="submit"
                                className="absolute right-1.5 top-1.5 w-8 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-colors shadow-md shadow-indigo-950/50"
                            >
                                <i className="ri-send-plane-2-line text-sm"></i>
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 transition-opacity">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-white tracking-tight">Add Collaborator</h2>
                            <button 
                                onClick={() => {
                                    setIsInviteModalOpen(false);
                                    setSearchQuery("");
                                }}
                                className="p-1 text-gray-500 hover:text-white rounded hover:bg-gray-800 transition-colors"
                            >
                                <i className="ri-close-line text-xl"></i>
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                                placeholder="Search user email..."
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1.5 mb-6">
                            {allUsers
                                .filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((u) => {
                                    const isAlreadyMember = collaborators.some(collab => collab._id === u._id);
                                    return (
                                        <div key={u._id} className="flex justify-between items-center p-2.5 bg-gray-950/20 rounded-xl border border-gray-800/40">
                                            <span className="text-xs text-gray-300 font-mono truncate mr-2" title={u.email}>{u.email}</span>
                                            {isAlreadyMember ? (
                                                <span className="text-[10px] text-gray-500 font-bold bg-gray-900 px-2.5 py-1 rounded-lg">Member</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddCollaborator(u._id)}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors shadow-md shadow-indigo-900/30"
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
