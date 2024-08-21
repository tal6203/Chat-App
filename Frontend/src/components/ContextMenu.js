import React, { useCallback, useEffect } from "react";
import axios from "axios";
import config from "./config/default.json";
import './ContextMenu.css';



function ContextMenu({ contextMenu, setContextMenu, socket, selectedChat, messages,
    setMessages, setFilteredContacts, setContacts, setNewMessage, setIsContextMenuOpen,
    contextMenuRef, isContextMenuOpen, setEditingMessageId, setIsEditing }) {


    const currentUser = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");


    const closeContextMenu = useCallback(() => {
        setContextMenu({ ...contextMenu, isVisible: false, });
        setIsContextMenuOpen(false);
    }, [contextMenu, setContextMenu, setIsContextMenuOpen]);

    const handleDocumentClick = useCallback((event) => {
        // Close the context menu if the click is outside
        if (isContextMenuOpen && contextMenuRef && !contextMenuRef.current.contains(event.target)) {
            closeContextMenu();
        }
    }, [closeContextMenu, contextMenuRef, isContextMenuOpen]);

    useEffect(() => {
        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, [isContextMenuOpen, contextMenuRef, handleDocumentClick]);

    const deleteMessage = async (messageId, forEveryone) => {
        try {
            await axios.post(
                `${config.URL_CONNECT}/message/deleteMessage`,
                { messageId, deleteForEveryone: forEveryone },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (forEveryone) {
                setMessages(prevMessages =>
                    prevMessages.map((message) =>
                        message._id === messageId
                            ? { ...message, content: "This message has been deleted", deletedForEveryone: true }
                            : message
                    )
                );
                socket.emit('message deleted for everyone', { chatId: selectedChat._id, messageId });
            } else {
                setMessages((prevMessages) =>
                    prevMessages.filter((message) => message._id !== messageId)
                );


                setContacts((prevContacts) =>
                    prevContacts.map((contact) =>
                        contact._id === selectedChat._id
                            ? {
                                ...contact,
                                lastMessage:
                                    contact.lastMessage._id === messageId
                                        ? {
                                            ...contact.lastMessage,
                                            content: "You deleted this message",
                                            deletedForUsers: contact.lastMessage.deletedForUsers
                                                ? [...contact.lastMessage.deletedForUsers, currentUser._id]
                                                : [currentUser._id],
                                        }
                                        : contact.lastMessage,
                            }
                            : contact
                    )
                );

                setFilteredContacts((prevFilteredContacts) =>
                    prevFilteredContacts.map((contact) =>
                        contact._id === selectedChat._id
                            ? {
                                ...contact,
                                lastMessage:
                                    contact.lastMessage._id === messageId
                                        ? {
                                            ...contact.lastMessage,
                                            content: "You deleted this message",
                                            deletedForUsers: contact.lastMessage.deletedForUsers
                                                ? [...contact.lastMessage.deletedForUsers, currentUser._id]
                                                : [currentUser._id],
                                        }
                                        : contact.lastMessage,
                            }
                            : contact
                    )
                );
            }

            closeContextMenu();
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };


    const handleEditMessageFromContextMenu = () => {
        const messageToEdit = messages.find((m) => m._id === contextMenu.messageId);
        if (messageToEdit) {
            setNewMessage(messageToEdit.content);
            setIsEditing(true);
            setEditingMessageId(contextMenu.messageId);
            closeContextMenu(); // Close context menu
        }
    };

    return (
        <div
            ref={contextMenuRef}
            className="context-menu"
            style={{ top: contextMenu.posY, left: contextMenu.posX }}
            onClick={closeContextMenu}
        >
            {contextMenu.canEdit && (
                <div onClick={handleEditMessageFromContextMenu}>Edit Message</div>
            )}
            <div onClick={() => deleteMessage(contextMenu.messageId, false)}>Delete for Me</div>
            {contextMenu.canDeleteForEveryone && (
                <div style={{ color: "#dc3545" }} onClick={() => deleteMessage(contextMenu.messageId, true)}>
                    Delete for Everyone
                </div>
            )}
        </div>
    )
}

export default ContextMenu;