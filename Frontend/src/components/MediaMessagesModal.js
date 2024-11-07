import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { Modal } from 'react-bootstrap';
import axios from 'axios';
import config from './config/default.json';
import RecordImg from "./img/record-message.png";
import './MediaMessagesModal.css';

function MediaMessagesModal({ show, onHide, chatId, socket }) {
    const [mediaMessages, setMediaMessages] = useState([]);
    const [hasMoreMedia, setHasMoreMedia] = useState(true);
    const [lastMediaMessageId, setLastMediaMessageId] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Track loading state
    const [previousHeight, setPreviousHeight] = useState(0);
    const [totalMessagesMedia, setTotalMessagesMedia] = useState(0);

    const scrollRef = useRef(null);

    // Helper function to group messages by date
    const groupMessagesByDate = (messages) => {
        return messages.reduce((acc, message) => {
            const messageDate = new Date(message.timestamp).toLocaleDateString();
            if (!acc[messageDate]) acc[messageDate] = [];
            acc[messageDate].push(message);
            return acc;
        }, {});
    };

    // Fetch media messages with pagination
    const fetchMediaMessages = useCallback(async (lastMediaMessageId = null) => {
        if (isLoading || !hasMoreMedia) return;

        setIsLoading(true); // Set loading state to prevent multiple fetches
        try {
            const response = await axios.get(`${config.URL_CONNECT}/message/getMediaMessagesByChatId/${chatId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                params: {
                    limit: 20,
                    lastMessageId: lastMediaMessageId ? lastMediaMessageId : null
                }
            });

            const newMessages = response.data.messages;
            if (totalMessagesMedia === 0) {
                setTotalMessagesMedia(response.data.totalMessages);
            }

            setMediaMessages(prevMediaMessages => {
                return lastMediaMessageId ? [...newMessages, ...prevMediaMessages] : newMessages;
            });
            setHasMoreMedia(newMessages.length === 20);
            setLastMediaMessageId(lastMediaMessageId || null);
        } catch (error) {
            console.error('Error fetching media messages:', error);
        } finally {
            setIsLoading(false); // Reset loading state
        }
        // eslint-disable-next-line 
    }, [chatId]);

    // Real-time listener for new media messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMediaMessage = (newMessage) => {
            if (newMessage.chatId === chatId && newMessage.fileUrl) {
                setMediaMessages((prev) => [...prev, newMessage]);
            }
        };

        socket.on('new media message', handleNewMediaMessage);

        return () => {
            socket.off('new media message', handleNewMediaMessage);
        };
    }, [socket, chatId]);

    // Scroll event listener to load more messages when reaching the top
    const handleScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight } = scrollRef.current;

        // Check if user scrolled to the top
        if (scrollTop === 0 && hasMoreMedia && !isLoading) {
            const oldestMessage = mediaMessages[0];
            if (oldestMessage) {
                setPreviousHeight(scrollHeight);
                fetchMediaMessages(oldestMessage._id);
            }
        }
    }, [fetchMediaMessages, hasMoreMedia, mediaMessages, isLoading]);

    // Attach and detach scroll event listener
    useEffect(() => {
        const currentRef = scrollRef.current;
        if (currentRef) currentRef.addEventListener('scroll', handleScroll);

        return () => {
            if (currentRef) currentRef.removeEventListener('scroll', handleScroll);
        };
    }, [handleScroll]);


    // Fetch initial media messages when the modal is opened
    useEffect(() => {
        if (show && mediaMessages.length === 0) {  // Only fetch if no messages exist
            fetchMediaMessages();
        }
    }, [fetchMediaMessages, show, mediaMessages.length]);

    useLayoutEffect(() => {
        if (scrollRef.current) {
            if (lastMediaMessageId) {
                const newScrollHeight = scrollRef.current.scrollHeight;
                const newPosition = newScrollHeight - previousHeight;
                scrollRef.current.scrollTo({
                    top: newPosition,
                    behavior: 'auto',
                });
            }
        }
    }, [lastMediaMessageId, scrollRef, previousHeight]);

    useLayoutEffect(() => {
        if (show && mediaMessages.length === 20) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [show, mediaMessages.length]);


    const groupedMessages = groupMessagesByDate(mediaMessages);

    return (
        <Modal className='modal-media-message' show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title className='media-message-header'>Media Messages</Modal.Title>
            </Modal.Header>
            <Modal.Body ref={scrollRef} className="media-modal-body">
                {isLoading && (
                    <div className="loader-container">
                        <div className="loader-message"></div>
                        <div className="loader-message"></div>
                        <div className="loader-message"></div>
                    </div>
                )}
                <div className="media-messages-container">
                    {!hasMoreMedia && <p className="no-more-media">No more media messages</p>}
                    {Object.keys(groupedMessages).map(date => (
                        <div key={date} className="date-group">
                            <p className="date-header">{date}</p>
                            <div className="media-grid">
                                {groupedMessages[date].map((message) => (
                                    <div key={message._id} className="media-message-item">
                                        {message.fileType === 'image' && <img src={message.fileUrl} alt="Media" />}
                                        {message.fileType === 'video' && <video src={message.fileUrl} controls />}
                                        {message.fileType === 'audio' &&
                                            <div className="audio-container">
                                                <img src={RecordImg} alt="Audio Thumbnail" className="audio-thumbnail" />
                                                <audio src={message.fileUrl} controls className="audio-player" />
                                            </div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal.Body>
            <Modal.Footer className="modal-footer-media-message">
                <span>Total Media Messages : {totalMessagesMedia}</span>
            </Modal.Footer>
        </Modal>
    );
}

export default MediaMessagesModal;
