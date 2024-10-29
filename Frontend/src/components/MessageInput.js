import React, { useState, useEffect, useRef } from "react";
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import config from './config/default.json';
import FileUploadComponent from "./FileUploadComponent";
import axios from "axios";
import Swal from 'sweetalert2';
import { LiveAudioVisualizer } from 'react-audio-visualize';
import { sha1 } from 'crypto-hash';
import './MessageInput.css';



function MessageInput({ socket, newMessage, setNewMessage, setMessages, isEditing, setIsEditing, uploading,
    setUploading, selectedChat, setSelectedChat, setContacts, userTyping, setUserTyping, setUploadedFileUrl,
    setUploadedFileType, uploadedFileUrl, uploadedFileType, setSearchList, editingMessageId, fileInputRef,
    setEditingMessageId, messagesListRef }) {

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioPublicId, setAudioPublicId] = useState('');
    const [audioBlob, setAudioBlob] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [savedRecordingTime, setSavedRecordingTime] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [timerInterval, setTimerInterval] = useState(null);
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    const textInputRef = useRef(null);

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

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
                            setTimeout(() => {
                                requestAnimationFrame(() => {
                                    messagesListRef.current.scrollTo({
                                        top: messagesListRef.current.scrollHeight,
                                        behavior: 'smooth',
                                    });
                                });
                            }, isMobile ? 150 : 0);
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
    }, [messagesListRef, selectedChat, userTyping, setUserTyping, user, isMobile, setMessages, socket]);

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
                    {
                        chatId, content: newMessage, fileUrl: uploadedFileUrl || null, fileType: uploadedFileType || null,
                        recordingDuration: recordingDuration || null, senderUsername: user.username
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const currentUser = user;

                socket.emit('new message', response.data.message);
                socket.emit('stop typing', selectedChat._id, currentUser._id, currentUser.username);
                setNewMessage('');
                setUploadedFileUrl('');
                setUploadedFileType('');
                setAudioBlob(null);  // Reset after uploading
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
        setAudioPublicId('');
    };

    const startRecording = async () => {
        setIsRecording(true);
        setAudioBlob(null);
        setRecordingDuration(0);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);

        setMediaRecorder(recorder);

        recorder.ondataavailable = (e) => {
            setAudioBlob(e.data);
        };

        recorder.start();

        const interval = setInterval(() => {
            setRecordingDuration((prev) => prev + 1);
        }, 1000);
        setTimerInterval(interval);
    };

    const stopRecording = async () => {

        if (recordingDuration <= 0) {
            setIsRecording(false);
            setIsPaused(false);
            setAudioBlob(null);
            clearInterval(timerInterval);
            setRecordingDuration(0);

            return;
        }

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.ondataavailable = async (e) => {
                const recordedBlob = e.data;
                setAudioBlob(recordedBlob);
                setIsPaused(false);
                await uploadAudio(recordedBlob);
            };

            mediaRecorder.onstop = async () => {
                // Stop the audio stream
                if (mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
                setSavedRecordingTime(formatTime(recordingDuration));
            };

            mediaRecorder.stop();
        }

        clearInterval(timerInterval);
        setIsRecording(false);
    };






    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const formatTimeFromCloudinary = (num) => {
        // Round the number to the nearest integer
        const roundedSeconds = Math.floor(num);

        // Calculate minutes and seconds
        const minutes = Math.floor(roundedSeconds / 60);
        const seconds = roundedSeconds % 60;

        // Format as MM:SS with leading zero for seconds if needed
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };




    const deleteRecording = () => {
        onCancelUpload(audioPublicId, 'video');
        setAudioBlob(null);
    };

    const stopAndDeleteRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = () => {
                // Stop the audio stream
                if (mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
                setAudioBlob(null);
                setIsRecording(false);
                setIsPaused(false);
                clearInterval(timerInterval);
            };
            mediaRecorder.stop();
        }
    };



    const uploadAudio = async (blob) => {
        if (!blob) return;

        const maxSizeInBytes = 10485760; // 10MB limit, adjust as needed

        if (blob.size > maxSizeInBytes) {
            Swal.fire({
                icon: 'error',
                title: 'File Too Large',
                text: 'The audio recording exceeds the maximum allowed size of 10MB. Please try a shorter recording.',
            });
            setAudioBlob(null);
            setIsRecording(false);
            setUploadedFileUrl('');
            setUploadedFileType('');
            setRecordingDuration(0);
            setAudioPublicId(null);
            return;
        }

        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', config.uploadPreset);

        try {
            const response = await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`, formData);
            const { secure_url, public_id, duration } = response.data;
            setUploadedFileUrl(secure_url);
            setUploadedFileType('audio');
            setRecordingDuration(formatTimeFromCloudinary(duration));
            setAudioPublicId(public_id);
        } catch (error) {
            setUploadedFileUrl('');
            setUploadedFileType('');
            setRecordingDuration(0);
            setAudioBlob(null);
            setIsRecording(false);
            setAudioPublicId(null);

            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: 'There was an error uploading the audio recording. Please try again later.',
            });
        }
    };

    const pauseRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            setIsPaused(true);
            clearInterval(timerInterval);  // Stop the timer when paused
        }
    };

    const resumeRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            setIsPaused(false);

            // Restart the timer when resumed
            const interval = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
            setTimerInterval(interval);
        }
    };



    return (
        <div className="message-input-area">
            {!isRecording && !audioBlob ? (
                <>
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
                    <button onClick={startRecording} className="record-btn">
                        <i className="bi bi-mic-fill"></i>
                    </button>
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
                </>
            ) : (
                <>
                    {!audioBlob && (
                        <div className="recording-area">
                            <div className={`${!isPaused ? 'top-section' : 'top-section-center-hidden'}`}>
                                <div className="timer">{formatTime(recordingDuration)}</div>
                                {mediaRecorder && !isPaused && (
                                    <div style={{ width: '100%' }}>
                                        <LiveAudioVisualizer
                                            mediaRecorder={mediaRecorder}
                                            barWidth={6}
                                            gap={6}
                                            width={790}
                                            height={40}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="bottom-section">
                                <button onClick={stopAndDeleteRecording} className="delete-record-btn">
                                    <i className="bi bi-trash"></i>
                                </button>

                                {isPaused ? (
                                    <button onClick={resumeRecording} className="resume-record-btn">
                                        <i className="bi bi-play-fill"></i>
                                    </button>
                                ) : (
                                    <button onClick={pauseRecording} className="pause-record-btn">
                                        <i className="bi bi-pause-fill"></i>
                                    </button>
                                )}

                                <button onClick={stopRecording} className="stop-record-btn">
                                    <i className="bi bi-mic-mute-fill"></i>
                                </button>
                            </div>
                        </div>
                    )}
                    {audioBlob && (
                        <div className="countiner-audio">
                            <div className="countiner-audio-main">
                                <button onClick={deleteRecording} className="delete-audio-btn"><i className="bi bi-trash"></i></button>
                                <audio style={{ width: '100%' }} controls>
                                    <source src={URL.createObjectURL(audioBlob)} type="audio/mp3" />
                                </audio>
                                <span className="recording-time">{savedRecordingTime}</span>
                            </div>
                            <button disabled={!uploadedFileUrl} onPointerDown={(e) => handleSendMessage(e)} className="send-btn">
                                {uploadedFileUrl ? (
                                    <>
                                        <i className="bi bi-send"></i>
                                        <span className="text-for-phone">Send</span>
                                    </>) : (<i className="bi bi-arrow-clockwise spin-icon"></i>)}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default MessageInput;
