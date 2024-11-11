import React, { useState, useEffect, useCallback, useRef } from "react";
import ChatList from "./ChatList";
import ChatHeader from "./ChatHeader";
import ChatWindow from "./ChatWindow";
import MessageInput from "./MessageInput";
import ContextMenu from "./ContextMenu";
import CustomNavbar from "./CustomNavbar"
import config from "./config/default.json";
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import axios from "axios";
import { useDarkMode } from '../DarkModeContext';
import './Chat.css';


function Chat() {
    const [selectedChat, setSelectedChat] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [searchList, setSearchList] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState({});
    const [uploadedFileUrl, setUploadedFileUrl] = useState("");
    const [uploadedFileType, setUploadedFileType] = useState("");
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [firstUnreadMessageIndex, setFirstUnreadMessageIndex] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [previousHeight, setPreviousHeight] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [contextMenu, setContextMenu] = useState({
        isVisible: false, posX: 0, posY: 0,
        messageId: null, canDeleteForEveryone: true, canEdit: false
    });
    const contextMenuRef = useRef();
    const fileInputRef = useRef();
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const [userTyping, setUserTyping] = useState(null);
    const [userRecording, setUserRecording] = useState(null);
    const [counterMessageUpScroll, setCounterMessageUpScroll] = useState(0);

    const messagesListRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const userData = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    const socket = useRef(null);

    const { isDarkMode } = useDarkMode();

    useEffect(() => {
        socket.current = io(config.URL_CONNECT);

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, []);

    const handleConnectedUsers = useCallback((users) => {
        const removeYourSelf = users.filter(id => id !== userData._id);
        setOnlineUsers(removeYourSelf);
    }, [userData]);

    useEffect(() => {
        setUserTyping(null);
        setUserRecording(null);
    }, [selectedChat]);

    useEffect(() => {
        if (!userData) return;

        const connectHandler = () => {
            socket.current.emit('setup', userData);
        };

        const handleNewMessageNotification = (data) => {
            if (selectedChat?._id !== data.chatId) {
                setUnreadMessagesCount((prevUnreadMessagesCount) => {
                    const newUnreadMessagesCount = { ...prevUnreadMessagesCount };
                    newUnreadMessagesCount[data.chatId] = data.count;
                    return newUnreadMessagesCount;
                });
            }
        };

        const handleMessageDeletedForEveryone = (data) => {
            setMessages((prevMessages) =>
                prevMessages.map((message) =>
                    message._id === data.messageId
                        ? { ...message, content: "This message has been deleted", deletedForEveryone: true }
                        : message
                )
            );

            // Update the contacts to reflect the deletion in the last message
            setContacts((prevContacts) =>
                prevContacts.map((contact) => {
                    if (contact._id === data.chatId && contact.lastMessage?._id === data.messageId) {
                        return {
                            ...contact,
                            lastMessage: {
                                ...contact.lastMessage,
                                content: "This message has been deleted",
                                deletedForEveryone: true,
                            },
                        };
                    }
                    return contact;
                })
            );

            setFilteredContacts((prevFilteredContacts) =>
                prevFilteredContacts?.map((contact) => {
                    if (contact._id === data.chatId && contact.lastMessage?._id === data.messageId) {
                        return {
                            ...contact,
                            lastMessage: {
                                ...contact.lastMessage,
                                content: "This message has been deleted",
                                deletedForEveryone: true,
                            },
                        };
                    }
                    return contact;
                })
            );
        };



        const messageAlertForGroup = (messageAlert) => {
            Swal.fire({
                title: 'Removed from Group!',
                text: messageAlert,
                icon: 'warning',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Okay'
            });
        }

        const handle_Typing = (result) => {
            if (selectedChat && selectedChat._id === result.chatId && userData._id !== result.userId) {
                setUserTyping(result.username);
            }
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setUserTyping(null); // Clear typing status after a delay
            }, 2000);
        }

        const handleStop_Typing = (result) => {
            if (selectedChat && result.chatId === selectedChat._id) {
                setUserTyping(null);
            }
        }

        const handleStartRecording = (data) => {
            if (selectedChat && selectedChat._id === data.chatId && userData._id !== data.userId) {
                setUserRecording(data.username);
            }
        }

        const handleStopRecording = (data) => {
            if (selectedChat && selectedChat._id === data.chatId && userData._id !== data.userId) {
                setUserRecording(null);
            }
        }

        const handlePauseRecording = (data) => {
            if (selectedChat && selectedChat._id === data.chatId && userData._id !== data.userId) {
                setUserRecording(`${userRecording} (paused)`);
            }
        }

        const handleResumeRecording = (data) => {
            if (selectedChat && selectedChat._id === data.chatId && userData._id !== data.userId) {
                setUserRecording(userRecording?.replace(' (paused)', ''));
            }
        }


        socket.current.on('typing', handle_Typing);
        socket.current.on('stop typing', handleStop_Typing);
        socket.current.on('alert message removed from group', messageAlertForGroup);
        socket.current.on('connect', connectHandler);
        socket.current.on('connectedUsers', handleConnectedUsers);
        socket.current.on('new message notification', handleNewMessageNotification);
        socket.current.on('message deleted for everyone', handleMessageDeletedForEveryone);
        socket.current.on('start recording', handleStartRecording);
        socket.current.on('stop recording', handleStopRecording);
        socket.current.on('pause recording', handlePauseRecording);
        socket.current.on('resume recording', handleResumeRecording);
        return () => {
            socket.current.off('typing', handle_Typing);
            socket.current.off('stop typing', handleStop_Typing);
            socket.current.off('alert message removed from group', messageAlertForGroup);
            socket.current.off('connectedUsers', handleConnectedUsers);
            socket.current.off('new message notification', handleNewMessageNotification);
            socket.current.off('message deleted for everyone', handleMessageDeletedForEveryone);
            socket.current.off('connect', connectHandler);
            socket.current.off('start recording', handleStartRecording);
            socket.current.off('stop recording', handleStopRecording);
            socket.current.off('pause recording', handlePauseRecording);
            socket.current.off('resume recording', handleResumeRecording);
            clearTimeout(typingTimeoutRef.current);
        };
    }, [userData, userTyping, searchList, selectedChat, userRecording, messages, handleConnectedUsers]);



    const resetUnreadCount = async (chatId) => {
        const userId = userData._id;
        try {
            if (unreadMessagesCount[chatId] === 0) return;
            await axios.post(`${config.URL_CONNECT}/chats/resetUnreadCount`, { chatId, userId }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUnreadMessagesCount((prevUnreadMessagesCount) => ({
                ...prevUnreadMessagesCount,
                [chatId]: 0,
            }));
        } catch (error) {
            console.error('Error resetting unread count:', error);
        }
    };

    const fetchChatMessages = useCallback(async (chatId, lastMessageId = null) => {
        let endpoint = `${config.URL_CONNECT}/message/getMessageByChatId/${chatId}`;
        const unreadCount = unreadMessagesCount[chatId] || 0;
        const limit = unreadCount > 20 ? unreadCount : 20;

        const queryParams = [];
        if (lastMessageId) queryParams.push(`lastMessageId=${lastMessageId}`);
        queryParams.push(`limit=${limit}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;

        try {
            const response = await axios.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = response.data;
            if (!lastMessageId) {
                socket.current.emit('read messsages', chatId, data);
            }
            const fetchedMessages = data.messages;

            setMessages(prevMessages => {
                return lastMessageId ? [...fetchedMessages, ...prevMessages] : fetchedMessages;
            });

            setFirstUnreadMessageIndex(() => {
                return unreadCount > 0
                    ? (unreadCount <= 20 ? fetchedMessages.length - unreadCount : 0)
                    : null;
            });

            setUnreadCount(unreadCount > 0 ? unreadCount : 0);
            setLastMessage(lastMessageId || null);
            setHasMoreMessages(fetchedMessages.length === limit);
            setLoadingOlderMessages(false);

        } catch (error) {
            console.error('Error fetching chat messages:', error);
            setLoadingOlderMessages(false);
        }
    }, [token, setMessages, unreadMessagesCount, socket]);


    const handleContextMenu = (event, message) => {
        event.preventDefault();
        if (contextMenu.isVisible) return;
        const contextMenuWidth = 150; // Approximate width of your context menu
        let posX = event.clientX - contextMenuWidth; // Calculate left position

        // Ensure the menu doesn't go off-screen
        if (posX < 0) {
            posX = 10; // A small buffer from the left edge of the window
        }
        const currentUser = JSON.parse(localStorage.getItem("user"));
        const canEdit = message.senderUsername === currentUser.username && message.content && message.content.length > 0;

        setContextMenu({
            isVisible: true,
            posX: posX,
            posY: event.clientY,
            messageId: message._id,
            canEdit: canEdit,
            canDeleteForEveryone: !message.readBy || message.readBy.length === 0,
        });

        setIsContextMenuOpen(true);
    };


    useEffect(() => {
        if (!socket.current) return;

        // Emit stop recording and stop typing when the user closes or reloads the page
        const handleBeforeUnload = () => {
            if (selectedChat) {
                socket.current.emit('stop recording', { chatId: selectedChat._id, userId: userData._id });
                socket.current.emit('stop typing', { chatId: selectedChat._id, userId: userData._id, username: userData.username });
            }
        };

        // Add the event listener for the beforeunload event
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup the event listener when the component is unmounted
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [selectedChat, userData]);


    return (
        <div className={`container ${isDarkMode ? 'dark-mode' : ''}`}>
            <div className="row">
                <CustomNavbar />
            </div>
            <div className="row">
                <div className="col-lg-4 chat-list-panel">
                    <ChatList
                        socket={socket.current}
                        searchList={searchList}
                        setSearchList={setSearchList}
                        selectedChat={selectedChat}
                        setSelectedChat={setSelectedChat}
                        messages={messages}
                        setMessages={setMessages}
                        contacts={contacts}
                        setContacts={setContacts}
                        filteredContacts={filteredContacts}
                        setFilteredContacts={setFilteredContacts}
                        onlineUsers={onlineUsers}
                        resetUnreadCount={resetUnreadCount}
                        unreadMessagesCount={unreadMessagesCount}
                        setUnreadMessagesCount={setUnreadMessagesCount}
                        fetchChatMessages={fetchChatMessages}
                    />
                </div>
                <div className={`col-lg-8 chat-window-panel ${selectedChat ? 'show' : ''}`}>
                    {selectedChat && messages ?
                        (
                            <>
                                <ChatHeader
                                    selectedChat={selectedChat}
                                    messages={messages}
                                    setFilteredContacts={setFilteredContacts}
                                    setContacts={setContacts}
                                    setMessages={setMessages}
                                    onlineUsers={onlineUsers}
                                    setSelectedChat={setSelectedChat}
                                    mediaRecorder={mediaRecorder}
                                    setAudioBlob={setAudioBlob}
                                    socket={socket.current}
                                    unreadMessagesCount={unreadMessagesCount}
                                    resetUnreadCount={resetUnreadCount}
                                />
                                <ChatWindow
                                    messagesListRef={messagesListRef}
                                    selectedChat={selectedChat}
                                    messages={messages}
                                    setMessages={setMessages}
                                    fetchChatMessages={fetchChatMessages}
                                    socket={socket.current}
                                    currentUser={userData}
                                    handleContextMenu={handleContextMenu}
                                    loadingOlderMessages={loadingOlderMessages}
                                    setLoadingOlderMessages={setLoadingOlderMessages}
                                    lastMessage={lastMessage}
                                    firstUnreadMessageIndex={firstUnreadMessageIndex}
                                    hasMoreMessages={hasMoreMessages}
                                    previousHeight={previousHeight}
                                    setPreviousHeight={setPreviousHeight}
                                    unreadCount={unreadCount}
                                    setCounterMessageUpScroll={setCounterMessageUpScroll}
                                    counterMessageUpScroll={counterMessageUpScroll}
                                />
                                {userRecording && (
                                    <div className="recording-indicator">
                                        {userRecording} is recording...
                                    </div>
                                )}
                                {userTyping && (
                                    <div className="typing-indicator">
                                        {userTyping} is typing...
                                    </div>
                                )}
                                <MessageInput
                                    selectedChat={selectedChat}
                                    setSelectedChat={setSelectedChat}
                                    editingMessageId={editingMessageId}
                                    messagesListRef={messagesListRef}
                                    setEditingMessageId={setEditingMessageId}
                                    setContacts={setContacts}
                                    socket={socket.current}
                                    userTyping={userTyping}
                                    setUserTyping={setUserTyping}
                                    messages={messages}
                                    mediaRecorder={mediaRecorder}
                                    setMediaRecorder={setMediaRecorder}
                                    audioBlob={audioBlob}
                                    setAudioBlob={setAudioBlob}
                                    setMessages={setMessages}
                                    newMessage={newMessage}
                                    fileInputRef={fileInputRef}
                                    setNewMessage={setNewMessage}
                                    isEditing={isEditing}
                                    setIsEditing={setIsEditing}
                                    uploading={uploading}
                                    uploadedFileUrl={uploadedFileUrl}
                                    uploadedFileType={uploadedFileType}
                                    setUploadedFileUrl={setUploadedFileUrl}
                                    setUploadedFileType={setUploadedFileType}
                                    setUploading={setUploading}
                                    setSearchList={setSearchList}
                                    setCounterMessageUpScroll={setCounterMessageUpScroll}
                                />
                            </>
                        )
                        : (
                            <div className="no-chat-selected">Select a chat to start messaging</div>
                        )

                    }

                    {contextMenu.isVisible && (
                        <ContextMenu
                            contextMenuRef={contextMenuRef}
                            isContextMenuOpen={isContextMenuOpen}
                            setIsContextMenuOpen={setIsContextMenuOpen}
                            contextMenu={contextMenu}
                            setContextMenu={setContextMenu}
                            socket={socket.current}
                            selectedChat={selectedChat}
                            messages={messages}
                            setMessages={setMessages}
                            setIsEditing={setIsEditing}
                            setEditingMessageId={setEditingMessageId}
                            setFilteredContacts={setFilteredContacts}
                            setContacts={setContacts}
                            setNewMessage={setNewMessage}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default Chat;
