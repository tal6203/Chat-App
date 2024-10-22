import React, { useState, useEffect, useRef } from "react";
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import config from './config/default.json';
import FileUploadComponent from "./FileUploadComponent";
import axios from "axios";
import { sha1 } from 'crypto-hash';
import './MessageInput.css';



function MessageInput({ socket, newMessage, setNewMessage, setMessages, isEditing, setIsEditing, uploading,
    setUploading, selectedChat, setSelectedChat, setContacts, userTyping, setUserTyping, setUploadedFileUrl,
    setUploadedFileType, uploadedFileUrl, uploadedFileType, setSearchList, editingMessageId, fileInputRef,
    setEditingMessageId, messagesListRef }) {

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    const textInputRef = useRef(null);


    useEffect(() => {

        const handleMessageEdited = (data) => {
            setMessages((prevMessages) => {
                const updatedMessages = prevMessages.map((message) =>
                    message._id === data.messageId ? { ...message, content: data.newContent } : message)
                return updatedMessages;
            });
        };


        const handleNewMessage = (message) => {
            if (selectedChat && selectedChat._id === message.chatId) {
                setMessages(prevMessages => {
                    const updatedMessages = [...prevMessages, message];

                    // Scroll only after messages are updated
                    if (messagesListRef.current) {
                        const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
                        const isAtBottom = (scrollHeight - scrollTop - clientHeight) <= 400;

                        // Check conditions to scroll
                        const shouldScroll =
                            (message.senderUsername === user.username && !message.systemMessage) ||
                            (message.senderUsername !== user.username && !message.systemMessage && isAtBottom);

                        // Use requestAnimationFrame to ensure smooth scrolling without delay
                        if (shouldScroll) {
                            requestAnimationFrame(() => {
                                messagesListRef.current.scrollTo({
                                    top: messagesListRef.current.scrollHeight,
                                    behavior: 'smooth',
                                });
                            });
                        }
                    }

                    return updatedMessages;
                });
            }
        };

        socket.on("message edited", handleMessageEdited);
        socket.on('new message', handleNewMessage);

        return () => {
            socket.off('new message', handleNewMessage);
            socket.off("message edited", handleMessageEdited);
        }
    }, [messagesListRef, selectedChat, userTyping, setUserTyping, user, setMessages, socket]);

    useEffect(() => {
        setNewMessage('');
        setShowEmojiPicker(false);
        setIsEditing(false);
        setEditingMessageId(null);
        if (textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [selectedChat, setNewMessage, setEditingMessageId, setIsEditing, setUploadedFileUrl, setUploadedFileType]);


    const onEmojiClick = (event, emojiObject) => {
        setNewMessage(prevNewMessage => (prevNewMessage || "") + event.emoji)
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !uploading) {
            e.preventDefault();  // Prevent the default action to avoid a new line in input
            handleSendMessage(e);  // Call your send message function
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !uploadedFileUrl) {
            return; // Exit if message is empty
        }

        if (isEditing && editingMessageId) {
            // Handle message editing
            try {
                await axios.put(`${config.URL_CONNECT}/message/editMessage/${editingMessageId}`,
                    { content: newMessage },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                socket.emit('message edited', { chatId: selectedChat._id, messageId: editingMessageId, newContent: newMessage });

                setMessages(prevMessages =>
                    prevMessages.map(message =>
                        message._id === editingMessageId ? { ...message, content: newMessage } : message
                    )
                );

                setNewMessage('');
                setIsEditing(false);
                setEditingMessageId(null);
                setShowEmojiPicker(false);
                setUploadedFileUrl('');  
                setUploadedFileType('');

            } catch (error) {
                console.error('Error editing message:', error);
            }
        } else {

            let chatId = selectedChat ? selectedChat._id : null;

            // Create a new chat if there's a pending recipient and no selected chat
            if (!chatId && selectedChat.users[0]._id) {
                try {
                    const response = await axios.post(`${config.URL_CONNECT}/chats/createChat`,
                        { recipientId: selectedChat.users[0]._id },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    const newChat = response.data.chat;
                    chatId = newChat._id;
                    socket.emit('join chat', chatId);

                    setSearchList(prevSearchList => {
                        const updatedSearchList = prevSearchList.filter(user => user._id !== selectedChat.users[0]._id);
                        return updatedSearchList;
                    });

                    setSelectedChat(newChat);
                    setContacts((prevContacts) => [newChat, ...prevContacts]);

                }

                catch (error) {
                    console.error('Error creating new chat:', error);
                    return; // Exit if chat creation fails
                }
            }

            // Send the message
            try {
                const response = await axios.post(`${config.URL_CONNECT}/message/sendMessage`,
                    { chatId, content: newMessage, fileUrl: uploadedFileUrl || null, fileType: uploadedFileType || null, senderUsername: user.username },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const currentUser = user;

                socket.emit('new message', response.data.message);
                socket.emit('stop typing', selectedChat._id, currentUser._id, currentUser.username);
                setNewMessage('');
                setUploadedFileUrl('');
                setUploadedFileType('');
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }

                if (textInputRef.current) {
                    textInputRef.current.focus();
                }

            }
            catch (error) {
                console.error('Error sending message:', error);
            }
        }
    }


    const handleTyping = () => {
        if (socket && selectedChat) {
            socket.emit('typing', selectedChat._id, user._id, user.username);
        }
    };

    const handleStopTyping = () => {
        if (socket && selectedChat) {
            socket.emit('stop typing', selectedChat._id, user._id, user.username);
        }
    };

    const onFileUpload = (fileUrl, fileType) => {
        setUploadedFileUrl(fileUrl);
        setUploadedFileType(fileType);
    }

    const onCancelUpload = async (uploadedPublicId, fileType) => {
        const publicId = uploadedPublicId;
        if (!publicId) return;

        const timestamp = new Date().getTime()
        const string = `public_id=${publicId}&timestamp=${timestamp}${config.YOUR_CLOUDINARY_API_SECRET}`
        const signature = await sha1(string)
        const formData = new FormData()
        formData.append("public_id", publicId)
        formData.append("signature", signature)
        formData.append("api_key", config.API_KEY)
        formData.append("timestamp", timestamp)
        await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/${fileType}/destroy`, formData);
        setUploadedFileUrl('');
        setUploadedFileType('');
    };


    return (
        <div className="message-input-area">
            {showEmojiPicker && (
                <div className="emoji-picker">
                    <EmojiPicker height={400} width={300} previewConfig={{ showPreview: false }} emojiStyle={EmojiStyle.APPLE} onEmojiClick={onEmojiClick} />
                </div>
            )}
            <button className="emoji-text-area"
                onClick={() => setShowEmojiPicker(prv => !prv)}>😊</button>

            {!isEditing && (
                <FileUploadComponent
                    socket={socket}
                    selectedChat={selectedChat}
                    fileInputRef={fileInputRef}
                    onFileUpload={onFileUpload}
                    onCancelUpload={onCancelUpload}
                    setUploading={setUploading}
                />
            )}
            <textarea
                className="form-control"
                placeholder={isEditing ? "Editing message..." : "Type a message..."}
                ref={textInputRef}
                value={newMessage}
                onInput={() => handleTyping()}
                onBlur={() => handleStopTyping()}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e)}
            ></textarea>
            <button
                disabled={uploading}
                className="send-btn"
                onPointerDown={(e) => handleSendMessage(e)}>
                {isEditing ? <><i className="bi bi-pencil"></i><span className="text-for-phone"> Edit</span></> : <><i className="bi bi-send"></i>
                    <span className="text-for-phone">Send</span> </>
                }
            </button>
        </div >
    )
}

export default MessageInput;
