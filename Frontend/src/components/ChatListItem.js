import React from 'react';

const ChatListItem = ({
    contact,
    selectedChat,
    currentUser,
    unreadMessagesCount,
    onlineUsers,
    handleContactClick,
    toggleFavorite,
    deleteChat,
    formatLastMessageTime,
    regexPattern,
}) => {
    const isGroupChat = contact.isGroupChat;
    const lastMessage = contact.lastMessage;

    const displayName = isGroupChat
        ? contact.chatName && contact.chatName.length > 20
            ? `${contact.chatName.substring(0, 15)}...`
            : contact.chatName || 'Unnamed Group'
        : contact.chatName
            ? contact.chatName.replace(regexPattern, '').length > 20
                ? `${contact.chatName.replace(regexPattern, '').substring(0, 15)}...`
                : contact.chatName.replace(regexPattern, '')
            : 'Chat'

    const profilePicture = isGroupChat
        ? contact.groupPicture
        : contact.users.find(user => user._id !== currentUser._id)?.profilePicture;

    const getLastMessagePreview = () => {
        if (!contact.lastMessage) return "No messages yet";

        const lastMessage = contact.lastMessage;
        const deleteHistoryTimestamp = contact.deleteHistoryTimestamp?.[currentUser._id];
        const isDeletedForEveryone = lastMessage.deletedForEveryone;
        const isDeletedForCurrentUser = lastMessage.deletedForUsers?.includes(currentUser._id);
        const isSystemMessage = lastMessage.systemMessage;

        // Check if it's a group chat and handle system message or deletion conditions
        if (contact.isGroupChat) {
            if (isSystemMessage && (!deleteHistoryTimestamp || deleteHistoryTimestamp < lastMessage.timestamp)) {
                return lastMessage.content;
            }

            if (!deleteHistoryTimestamp || deleteHistoryTimestamp < lastMessage.timestamp) {
                if (isDeletedForEveryone) {
                    return lastMessage.senderUsername === currentUser.username
                        ? "You deleted this message"
                        : "This message has been deleted";
                }

                if (isDeletedForCurrentUser) {
                    return "You deleted this message";
                }

                return (
                    <>
                        {`${lastMessage.senderUsername}: `}
                        {renderMessageContent(lastMessage)}
                    </>
                );
            }
            return "No messages yet";
        }

        // For individual chats, handle deletion conditions
        if (isDeletedForEveryone) {
            return lastMessage.senderUsername === currentUser.username
                ? "You deleted this message"
                : "This message has been deleted";
        }

        if (isDeletedForCurrentUser) {
            return "You deleted this message";
        }

        return (
            <>
                {`${lastMessage.senderUsername}: `}
                {renderMessageContent(lastMessage)}
            </>
        );
    };

    // Helper function to render message content with icons based on file type
    const renderMessageContent = (message) => {
        if (message.fileUrl && message.fileUrl.endsWith('.pdf')) {
            return (
                <>
                    <i className="bi bi-file-earmark"></i>&nbsp;
                    {message.content || 'document'}
                </>
            );
        }

        switch (message.fileType) {
            case 'image':
                return (
                    <>
                        <i className="bi bi-image"></i>&nbsp;
                        {message.content || 'image'}
                    </>
                );
            case 'video':
                return (
                    <>
                        <i className="bi bi-camera-video"></i>&nbsp;
                        {message.content || 'video'}
                    </>
                );
            case 'audio':
                return (
                    <>
                        <i className="bi bi-mic-fill"></i>
                        <span> {message.recordingDuration}</span>
                    </>
                );
            case 'raw':
                return (
                    <>
                        <i className="bi bi-file-earmark"></i>&nbsp;
                        {message.content || 'document'}
                    </>
                );
            default:
                return message.content;
        }
    };

    return (
        <div
            key={contact._id}
            onClick={() => handleContactClick(contact)}
            className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
        >
            <img src={profilePicture} alt="profile" className="profile-image" />
            <div className="user-info">
                <div className="username-container">
                    <span className="username">
                        {displayName}
                        {unreadMessagesCount[contact._id] > 0 && (
                            <span className="unread-badge">{unreadMessagesCount[contact._id]}</span>
                        )}
                    </span>
                </div>
                <div className="last-message-preview">{getLastMessagePreview()}</div>
            </div>
            <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                {lastMessage && formatLastMessageTime(lastMessage.timestamp)}
            </div>
            {!isGroupChat && (
                <span
                    className={`status-indicator ${onlineUsers.includes(contact.users.find(user => user._id !== currentUser._id)?._id)
                        ? 'connect'
                        : 'disconnect'
                        }`}
                ></span>
            )}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(contact._id);
                }}
                className="favorite-btn"
            >
                <i className={`bi ${contact.favoriteBy?.includes(currentUser._id) ? 'bi-heart-fill' : 'bi-heart'}`}></i>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(contact._id);
                }}
                className="delete-chat-button"
            >
                <i className="bi bi-trash"></i>
            </button>
        </div>
    );
};

export default ChatListItem;
