import React, { useState } from "react";
import axios from "axios";
import config from "./config/default.json";
import './ChatHeader.css';
import ChatDetailsModal from "./ChatDetailsModal";
import MediaMessagesModal from "./MediaMessagesModal";

function ChatHeader({ selectedChat, onlineUsers, setSelectedChat, socket, setContacts,
    setMessages, setFilteredContacts, mediaRecorder, setAudioBlob }) {
    const [sharedGroups, setSharedGroups] = useState([]);
    const [showChatDetailsModal, setShowChatDetailsModal] = useState(false);
    const [showMediaMessagesModal, setShowMediaMessagesModal] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user'));
    const regexPattern = new RegExp(`${currentUser.username}\\s*and\\s*|\\s*and\\s*${currentUser.username}`, 'i');

    const handleCloseChat = () => {
        setSelectedChat(null);
        setMessages([]);
        if (selectedChat) {
            socket.emit('stop recording', { chatId: selectedChat._id, userId: currentUser._id });
            socket.emit('leave chat', selectedChat._id);
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = () => {
                // Stop the audio stream
                if (mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
                setAudioBlob(null);
            };
            mediaRecorder.stop();
        }
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

    const handleShowMediaModal = () => {
        setShowMediaMessagesModal(true);
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
                                {selectedChat.chatName.length > 20 ? (
                                    `${selectedChat.chatName.substring(0, 15)}...`
                                    ) : (selectedChat.chatName)} - Group Chat
                            </div>
                        </>
                    ) : selectedChat._id ? (
                        <>
                            <img src={selectedChat.users.find(user => user._id !== currentUser._id).profilePicture}
                                alt={selectedChat.users.find(user => user._id !== currentUser._id).username}
                                className="profile-image" />
                            <div className="chat-details">
                                <div>{
                                    selectedChat.chatName.length > 20 ? (
                                `${selectedChat.chatName.replace(regexPattern, '').substring(0, 15)}...`) : selectedChat.chatName.replace(regexPattern, '')}</div>
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
                                {selectedChat.chatName.length > 20 ? (
                                    `${selectedChat.chatName.substring(0, 15)}...`
                                    ) : selectedChat.chatName}
                                <span className={onlineUsers.includes(selectedChat.users[0]._id) ? 'online' : 'offline'}>
                                    {onlineUsers.includes(selectedChat.users[0]._id) ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </>
                    )}
                </h4>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <button className="btn-media-button" onClick={(e) => {
                        e.stopPropagation();
                        handleShowMediaModal();
                    }}>
                        <i className="bi bi-collection"></i>
                    </button>
                    <button className="btn close-button" onClick={(e) => {
                        e.stopPropagation();
                        handleCloseChat();
                    }}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>

            {showMediaMessagesModal && (
                <MediaMessagesModal
                    show={showMediaMessagesModal}
                    onHide={() => setShowMediaMessagesModal(false)}
                    chatId={selectedChat._id}
                    socket={socket}
                />
            )}

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
