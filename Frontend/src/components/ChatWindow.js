import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import Linkify from 'react-linkify';
import { Modal } from 'react-bootstrap';
import ModalReadBy from './ModalReadBy';
import './ChatWindow.css'



const ChatWindow = ({ selectedChat, messages, setMessages, socket, currentUser, fetchChatMessages,
    handleContextMenu, unreadCount, loadingOlderMessages, setLoadingOlderMessages, lastMessage,
    hasMoreMessages, previousHeight, setPreviousHeight, firstUnreadMessageIndex, messagesListRef,
    setCounterMessageUpScroll, counterMessageUpScroll }) => {

    const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
    const [showUnreadTitle, setShowUnreadTitle] = useState(false);
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [expandedMessages, setExpandedMessages] = useState({});
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchStartY, setTouchStartY] = useState(0);
    const [currentMessage, setCurrentMessage] = useState(null);
    const [modalReadBy, setModalReadBy] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [enlargedImageUrl, setEnlargedImageUrl] = useState("");




    const handleReadMessages = useCallback((data) => {
        setMessages(prevMessages => {
            const updatedMessagesMap = new Map(data.map(msg => [msg._id, msg]));
            return prevMessages.map(message => updatedMessagesMap.get(message._id) || message);
        });
    }, [setMessages]);

    useEffect(() => {
        const hanleCloseTitleUnreadAndCounterMessageUpScroll = (message) => {
            if (showUnreadTitle) {
                setShowUnreadTitle(false);
            }
            if (messagesListRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
                const isAtBottom = (scrollHeight - scrollTop - clientHeight) <= 400;
                if (message.senderUsername !== currentUser.username && !message.systemMessage && !isAtBottom) {
                    setCounterMessageUpScroll(prevCounter => prevCounter + 1);
                }
            }
        }

        socket.on('read messsages', handleReadMessages);
        socket.on('new message', hanleCloseTitleUnreadAndCounterMessageUpScroll);

        return () => {
            socket.off('read messsages', handleReadMessages);
            socket.off('new message', hanleCloseTitleUnreadAndCounterMessageUpScroll);
        };
    }, [socket, currentUser, messagesListRef, setCounterMessageUpScroll, setMessages, showUnreadTitle, handleReadMessages]);

    useEffect(() => {
        if (selectedChat._id) {
            if (messagesListRef.current && !lastMessage && unreadCount === 0) {
                setPreviousHeight(0);
                messagesListRef.current.scrollTo({
                    top: messagesListRef.current.scrollHeight,
                    behavior: 'auto',
                });
            }
        }
    }, [selectedChat._id, setCounterMessageUpScroll, lastMessage, messagesListRef, unreadCount, setPreviousHeight])

    useEffect(() => {
        if (selectedChat)
            setCounterMessageUpScroll(0);
    }, [selectedChat, setCounterMessageUpScroll]);


    useLayoutEffect(() => {
        if (messagesListRef.current) {
            if (lastMessage) {
                // Adjust scroll to maintain position
                const newScrollHeight = messagesListRef.current.scrollHeight;
                const newPosition = newScrollHeight - previousHeight;
                messagesListRef.current.scrollTo({
                    top: newPosition,
                    behavior: 'auto',
                });
            }
        }
    }, [lastMessage, messagesListRef, previousHeight]);


    useLayoutEffect(() => {
        if (messagesListRef.current) {
            if (unreadCount > 0) {
                const firstUnreadMessage = messagesListRef.current.children[firstUnreadMessageIndex];
                setShowUnreadTitle(true);
                if (firstUnreadMessage) {
                    firstUnreadMessage.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    }, [messagesListRef, firstUnreadMessageIndex, unreadCount]);

    const handleScroll = useCallback(async () => {
        if (messagesListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;

            if (scrollTop === 0 && hasMoreMessages && !loadingOlderMessages) {
                const oldestMessage = messages[0];
                if (oldestMessage) {
                    setPreviousHeight(scrollHeight);
                    setLoadingOlderMessages(true);
                    await fetchChatMessages(selectedChat._id, oldestMessage._id);
                }
            }

            if (firstUnreadMessageIndex !== null) {
                const firstUnreadMessage = messagesListRef.current.children[firstUnreadMessageIndex];
                if (firstUnreadMessage && scrollTop > firstUnreadMessage.offsetTop) {
                    setShowUnreadTitle(false);
                }
            }

            const bottom = scrollHeight - scrollTop - clientHeight;
            setShowScrollToBottomButton(bottom > 400);

            if (counterMessageUpScroll > 0 && bottom <= 400) {
                setCounterMessageUpScroll(0);
            }
        }
    }, [messages, hasMoreMessages, loadingOlderMessages, selectedChat, fetchChatMessages,
        firstUnreadMessageIndex, messagesListRef, setLoadingOlderMessages, setPreviousHeight,
        setCounterMessageUpScroll, counterMessageUpScroll
    ]);


    useEffect(() => {
        const scrollHandler = () => {
            requestAnimationFrame(handleScroll);
        };

        const messagesRefCurrent = messagesListRef.current;
        if (messagesRefCurrent) {
            messagesRefCurrent.addEventListener('scroll', scrollHandler);
        }

        return () => {
            if (messagesRefCurrent) {
                messagesRefCurrent.removeEventListener('scroll', scrollHandler);
            }
        };
    }, [handleScroll, messagesListRef]);

    const handleMessageClick = (message) => {
        setSelectedMessageId(message._id);
        setModalReadBy(true);
    };


    const scrollToBottom = () => {
        if (messagesListRef.current) {
            messagesListRef.current.scrollTo({
                top: messagesListRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    };

    const handleExpandMessage = (messageId) => {
        setExpandedMessages((prevExpandedMessages) => ({
            ...prevExpandedMessages,
            [messageId]: !prevExpandedMessages[messageId],
        }));
    };

    const handleImageClick = (event, imageUrl) => {
        event.stopPropagation();
        setEnlargedImageUrl(imageUrl);
        setShowImageModal(true);
    }

    const renderFileContent = (message) => {
        const isDocx = message.fileUrl.endsWith('.docx');
        const isPdf = message.fileUrl.endsWith('.pdf');
        const isTxt = message.fileUrl.endsWith('.txt');

        const fullFileName = message.fileUrl.split('/').pop();
        const fileParts = fullFileName.split('_');
        const fileExtension = fileParts.pop().split('.').pop();
        const baseFileName = fileParts.join('_');
        const truncatedFileName = baseFileName.length > 15 ? baseFileName.substring(0, 15) + '...' : baseFileName;
        const fileName = `${truncatedFileName}.${fileExtension}`;

        if (isPdf || isTxt) {
            return (
                <div className="pdf-preview-container">
                    <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" download onClick={(e) => e.stopPropagation()}>
                        <iframe title={fileExtension === "pdf" ? "PDF" : "TEXT"} src={message.fileUrl} alt="Uploaded-pdf" className="pdf-image"></iframe>
                        <div className='pdf-text-preview-card'>
                            <div className="pdf-text-preview-content">
                                {fileExtension === "pdf" ?
                                    (<i className="bi bi-filetype-pdf pdf-text-icon"></i>) :
                                    (<i className="bi bi-file-earmark-text-fill pdf-text-icon"></i>)
                                }
                                <span className="pdf-text-name">{fileName}</span>
                            </div>
                        </div>
                    </a>
                </div>
            );
        }

        if (isDocx) {
            return (
                <div className="docx-preview-container" onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${message.fileUrl}`, '_blank');
                }}>
                    <div className="docx-preview-card">
                        <div className="docx-preview-content">
                            <i className="bi bi-filetype-docx docx-icon"></i>
                            <span className="docx-file-name">{fileName}</span>
                        </div>
                    </div>
                </div>
            );
        }

        switch (message.fileType) {
            case 'image':
                return <img src={message && message.fileUrl} alt="Uploaded-img" onClick={(event) => handleImageClick(event, message.fileUrl)} className="message-image" />;
            case 'video':
                return <video preload="none" src={message.fileUrl} controls className="message-video" />;
            default:
                return <iframe title="Other File" src={message.fileUrl} className="message-file-link" > </iframe>;
        }
    };

    const formatDate = useCallback((timestamp) => {
        const messageDate = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (messageDate.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (messageDate.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return messageDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        }
    }, []);

    const linkDecorator = useCallback((href, text, key) => (
        <a href={href} key={key} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 'bold' }} target="_blank" rel="noopener noreferrer">
            {text}
        </a>
    ), []);

    const handleTouchStart = (event, message) => {
        setTouchStartX(event.touches[0].clientX);
        setTouchStartY(event.touches[0].clientY);
        setCurrentMessage(message);
    }

    const handleTouchEnd = (event) => {
        const touchEndX = event.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) {  // Swipe left threshold
            const syntheticEvent = {
                clientX: touchStartX,
                clientY: touchStartY,
                preventDefault: () => { }  // Mock preventDefault if necessary
            };
            handleContextMenu(syntheticEvent, currentMessage);
        }
    }

    const selectedMessage = messages?.find(message => message._id === selectedMessageId);

    return (
        <div key={selectedChat._id} className="chat-window" ref={messagesListRef}>
            {loadingOlderMessages && (
                <div className="loader-container">
                    <div className="loader-message"></div>
                    <div className="loader-message"></div>
                    <div className="loader-message"></div>
                </div>
            )}
            {messages && messages.map((message, index) => {
                const showDateHeader = index === 0 || new Date(message.timestamp).toDateString() !== new Date(messages[index - 1]?.timestamp).toDateString();
                return (
                    <React.Fragment key={message._id}>
                        {showDateHeader && (
                            <div className={`date-header ${loadingOlderMessages ? 'hidden' : ''}`}>
                                {formatDate(message.timestamp)}
                            </div>
                        )}
                        {index === firstUnreadMessageIndex && showUnreadTitle && message.senderUsername !== currentUser.username && unreadCount > 0 && (
                            <div className="unread-messages-title"> Unread Messages ({unreadCount})</div>
                        )}
                        {message.systemMessage ? (
                            <div className="system-message">
                                <span className="bg-system">{message.content}</span>
                            </div>
                        ) : (
                            <div
                                className={`chat-message ${message.senderUsername === currentUser.username
                                    ? (message.deletedForEveryone ? 'received-deleted-message' : 'received')
                                    : 'sent'
                                    }`}
                                onTouchStart={message.senderUsername === currentUser.username && !message.deletedForEveryone ? (e) => handleTouchStart(e, message) : null}
                                onTouchEnd={message.senderUsername === currentUser.username && !message.deletedForEveryone ? handleTouchEnd : null}
                                onContextMenu={message.senderUsername === currentUser.username && !message.deletedForEveryone ? (e) => handleContextMenu(e, message) : null}
                                onClick={message.senderUsername === currentUser.username && message.deletedForEveryone !== true ? () => handleMessageClick(message) : null}>
                                <div className="message-content">{
                                    message.senderUsername === currentUser.username && message.deletedForEveryone
                                        ? "You deleted this message"
                                        : message.deletedForEveryone
                                            ? "This message has been deleted"
                                            : <>
                                                {message.fileUrl && renderFileContent(message)}

                                                {(message.content && message.content.length > 100 && !expandedMessages[message._id])
                                                    ? <div className={`${message?.fileUrl && message.fileUrl !== null ? 'message-content-with-media' : ''}`}>

                                                        <Linkify componentDecorator={linkDecorator}>{`${message.content.substring(0, 100)}... `}</Linkify>

                                                        <span className="read-more" onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleExpandMessage(message._id);
                                                        }}>
                                                            Read More
                                                        </span>
                                                    </div>
                                                    : (message.content.length > 100 && expandedMessages[message._id])
                                                        ? <div className={`${message?.fileUrl && message.fileUrl !== null ? 'message-content-with-media' : ''}`}>

                                                            <Linkify componentDecorator={linkDecorator}>{message.content}</Linkify> {/* Show full message */}

                                                            <span className="read-more" onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExpandMessage(message._id);
                                                            }}>
                                                                Read Less
                                                            </span>
                                                        </div>
                                                        : <div className={`${message?.fileUrl && message.fileUrl !== null ? 'message-content-with-media' : ''}`}><Linkify componentDecorator={linkDecorator}>{message.content}</Linkify></div>
                                                }
                                            </>
                                }</div>
                                <div className="message-time">
                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
            {showScrollToBottomButton && (
                <div className="scroll-to-bottom-container">
                    {counterMessageUpScroll > 0 && (
                        <span className="message-counter">{counterMessageUpScroll}</span>
                    )}
                    <button className="scroll-to-bottom-btn" onClick={scrollToBottom}>
                        <i className="bi bi-arrow-down-circle"></i>
                    </button>
                </div>
            )}


            {showImageModal && (
                <Modal className="transparent-modal" show={showImageModal} onHide={() => setShowImageModal(false)} size="lg" centered>
                    <Modal.Body>
                        <img src={enlargedImageUrl} onClick={() => setShowImageModal(false)} alt="Enlarged" style={{ width: '100%' }} />
                    </Modal.Body>
                </Modal>
            )}

            {modalReadBy && (
                <ModalReadBy
                    selectedMessage={selectedMessage}
                    show={modalReadBy}
                    setModalReadBy={setModalReadBy}
                />
            )}
        </div>

    );
};

export default ChatWindow;
