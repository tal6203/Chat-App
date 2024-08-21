import React, { useState } from "react";
import axios from "axios";
import config from "./config/default.json";
import './ChatHeader.css';
import ChatDetailsModal from "./ChatDetailsModal";

function ChatHeader({ selectedChat, onlineUsers, setSelectedChat, socket, resetUnreadCount, setContacts,
    setMessages, setFilteredContacts, unreadMessagesCount }) {
    const [sharedGroups, setSharedGroups] = useState([]);
    const [showChatDetailsModal, setShowChatDetailsModal] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user'));
    const regexPattern = new RegExp(`${currentUser.username}\\s*and\\s*|\\s*and\\s*${currentUser.username}`, 'i');

    const handleCloseChat = () => {
        if (selectedChat) {
            socket.emit('leave chat', selectedChat._id);
        }
        setSelectedChat(null);
        setMessages([]);
    }

    const fetchSharedChatGroups = async (partnerId) => {
        const token = localStorage.getItem("token");

        try {
            const response = await axios.get(`${config.URL_CONNECT}/chats/group/shared-chat-groups?partnerId=${partnerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSharedGroups(response.data.sharedGroups);
        } catch (error) {
            console.error('Error fetching shared chat groups:', error);
        }
    };

    const handleChatHeaderClick = () => {
        const partnerId = !selectedChat.isGroupChat && selectedChat.users.find(user => user._id !== currentUser._id)._id;
        if (!selectedChat.isGroupChat) {
            fetchSharedChatGroups(partnerId);
        }
        setShowChatDetailsModal(true);
    };

    return (
        <>
            <div className="chat-header" onClick={handleChatHeaderClick}>
                <h4>
                    {selectedChat.isGroupChat ? (
                        <>
                            <img
                                src={selectedChat.groupPicture}
                                alt='groupPicture'
                                className="profile-image"
                            />
                            <div className="chat-details">
                                {selectedChat.chatName} - Group Chat
                            </div>
                        </>
                    ) : selectedChat._id ? (
                        <>
                            <img src={selectedChat.users.find(user => user._id !== currentUser._id).profilePicture}
                                alt={selectedChat.users.find(user => user._id !== currentUser._id).username}
                                className="profile-image" />
                            <div className="chat-details">
                                <div>{selectedChat.chatName.replace(regexPattern, '') || 'Chat'}</div>
                                <span className={
                                    onlineUsers.includes(selectedChat.users.find(user => user._id !== currentUser._id)._id)
                                        ? 'online' : 'offline'
                                }>
                                    {onlineUsers.includes(selectedChat.users.find(user => user._id !== currentUser._id)._id)
                                        ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <img src={selectedChat.profilePicture || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                                alt='anonymousPicture'
                                className="profile-image" />
                            <div className="chat-details">
                                {selectedChat.chatName}
                                <span className={onlineUsers.includes(selectedChat.users[0]._id) ? 'online' : 'offline'}>
                                    {onlineUsers.includes(selectedChat.users[0]._id) ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </>
                    )}
                </h4>

                <button className="btn close-button" onClick={(e) => {
                    e.stopPropagation();
                    handleCloseChat();
                }}>
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            {showChatDetailsModal && (
                <ChatDetailsModal
                    showChatDetailsModal={showChatDetailsModal}
                    setShowChatDetailsModal={setShowChatDetailsModal}
                    setFilteredContacts={setFilteredContacts}
                    setSelectedChat={setSelectedChat}
                    setContacts={setContacts}
                    setMessages={setMessages}
                    sharedGroups={sharedGroups}
                    setSharedGroups={setSharedGroups}
                    selectedChat={selectedChat}
                    socket={socket}
                    updatedChat={selectedChat}
                />
            )}
        </>
    );
}

export default ChatHeader;
