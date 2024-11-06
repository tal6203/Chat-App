import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from 'react-router-dom';
import CreateGroupModal from "./CreateGroupModal";
import config from './config/default.json';
import './ChatList.css';
import axios from "axios";

const ChatList = ({ selectedChat, setSelectedChat, setMessages, messages, resetUnreadCount, unreadMessagesCount,
  setUnreadMessagesCount, onlineUsers, contacts, filteredContacts, setFilteredContacts, setContacts, socket,
  searchList, setSearchList, fetchChatMessages }) => {

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const [searchUsername, setSearchUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGroupCreateModal, setShowGroupCreateModal] = useState(false);
  const [showingUnreadOnly, setShowingUnreadOnly] = useState(false);
  const [showingGroupsOnly, setShowingGroupsOnly] = useState(false);


  const handleAddNewContact = useCallback((data) => {
    const isNewContact = !contacts.some(contact => contact._id === data._id);

    if (isNewContact) {
      // Add the new contact to the contacts list
      setContacts(prevContacts => [...prevContacts, data]);

      // If there's an active search, update filteredContacts
      if (searchUsername.length > 0) {
        const isMatchingSearch = data.users.some(user =>
          user.username.toLowerCase().includes(searchUsername.toLowerCase())
        );

        // If it matches, also add it to the filteredContacts
        if (isMatchingSearch) {
          setFilteredContacts(prevFiltered => [...prevFiltered, data]);
        }
      }

      // Remove the user from searchList if they are now a contact
      setSearchList(prevSearchList =>
        prevSearchList.filter(user =>
          !data.users.some(contactUser => contactUser._id === user._id)
        )
      );
    }
  }, [contacts, searchUsername, setContacts, setFilteredContacts, setSearchList]);


  const handleUpdateLastMessage = useCallback((updatedChat) => {
    setContacts(prevContacts => {
      // Update contacts with the new last message
      const updatedContacts = prevContacts.map(chat => {
        if (chat._id === updatedChat._id) {
          return { ...chat, lastMessage: updatedChat.lastMessage };
        }
        return chat;
      });

      // Return the updated contacts to update the state
      return updatedContacts;
    });

    // Use another useEffect to handle filtered contacts update
    setFilteredContacts(prevFilteredContacts => {
      if (searchUsername.length > 0) {
        return prevFilteredContacts.map(contact => {
          if (contact._id === updatedChat._id) {
            return { ...contact, lastMessage: updatedChat.lastMessage };
          }
          return contact;
        });
      }
      return prevFilteredContacts;
    });

  }, [searchUsername, setContacts, setFilteredContacts]);


  const handleUpdatedGroupName = useCallback((systemMessage, updatedChat) => {
    setContacts(prevContacts => {
      const updatedContacts = prevContacts.map(chat => {
        if (chat._id === updatedChat._id) {
          return { ...chat, chatName: updatedChat.chatName, lastMessage: systemMessage };
        }
        return chat;
      });
      return updatedContacts;
    });

    setSelectedChat(prevSelectedChat => {
      if (prevSelectedChat && prevSelectedChat._id === updatedChat._id) {
        return {
          ...prevSelectedChat,
          chatName: updatedChat.chatName,
          lastMessage: systemMessage
        };
      }
      return prevSelectedChat;
    });

    setMessages(prevMessages => {
      if (updatedChat._id === selectedChat?._id) {
        return [...prevMessages, systemMessage];
      }
      return prevMessages;
    });

    setFilteredContacts(prevFilteredContacts => {
      if (searchUsername.length > 0) {
        return prevFilteredContacts.map(contact => {
          if (contact._id === updatedChat._id) {
            return { ...contact, chatName: updatedChat.chatName, lastMessage: systemMessage };
          }
          return contact;
        });
      }
      return prevFilteredContacts;
    });
  }, [searchUsername, setFilteredContacts, setContacts, setSelectedChat, setMessages, selectedChat?._id]);

  const handleUpdatedPictureGroup = useCallback((systemMessage, updatedChat) => {
    setContacts(prevContacts => {
      const updatedContacts = prevContacts.map(chat => {
        if (chat._id === updatedChat._id) {
          return { ...chat, groupPicture: updatedChat.groupPicture, lastMessage: systemMessage };
        }
        return chat;
      });
      return updatedContacts;
    })

    let updatedMessages = messages;
    let updatedSelectedChat = selectedChat;

    // Update messages and selectedChat if the updated chat is currently selected
    if (selectedChat && selectedChat._id === updatedChat._id) {
      updatedSelectedChat = { ...selectedChat, groupPicture: updatedChat.groupPicture, lastMessage: systemMessage };
      updatedMessages = [...messages, systemMessage];
    }

    setSelectedChat(updatedSelectedChat);
    setMessages(updatedMessages);

    setFilteredContacts(prevFilteredContacts => {
      if (searchUsername.length > 0) {
        return prevFilteredContacts.map(contact => {
          if (contact._id === updatedChat._id) {
            return { ...contact, groupPicture: updatedChat.groupPicture, lastMessage: systemMessage };
          }
          return contact;
        });
      }
      return prevFilteredContacts;
    });


  }, [searchUsername, setContacts, setFilteredContacts, setMessages, setSelectedChat, messages, selectedChat]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await axios.get(`${config.URL_CONNECT}/chats/${currentUser._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setContacts(response.data.chats);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentUser._id, setContacts, token]);

  const handleUpdateChatUserLeft = useCallback((systemMessage, updatedChat) => {
    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map(contact => {
        if (contact._id === systemMessage.chatId) {
          return { ...updatedChat, lastMessage: systemMessage };
        }
        return contact;
      });

      return updatedContacts;
    });

    // Update the selected chat and messages if the system message is for the currently selected chat
    if (selectedChat && selectedChat._id === systemMessage.chatId) {
      setSelectedChat((prevSelectedChat) => ({ ...prevSelectedChat, ...updatedChat }));
      setMessages((prevMessages) => [...prevMessages, systemMessage]);
    }

    setFilteredContacts(prevFilteredContacts => {
      if (searchUsername.length > 0) {
        const updatedFilteredContact = prevFilteredContacts.map(contact => {
          if (contact._id === systemMessage.chatId) {
            return { ...updatedChat, lastMessage: systemMessage };
          }
          return contact;
        });

        return updatedFilteredContact;
      }
    });
    ;
  }, [searchUsername, selectedChat, setContacts, setFilteredContacts, setMessages, setSelectedChat]);


  const handleDeletedUsersGroup = useCallback((systemMessage, updatedChat, removedUserId) => {
    const currentUser = JSON.parse(localStorage.getItem("user"));

    const isCurrentUserRemoved = currentUser._id === removedUserId;

    if (isCurrentUserRemoved) {
      // Update contacts
      setContacts(prevContacts =>
        prevContacts.filter(contact => contact._id !== updatedChat._id)
      );

      // Update filteredContacts
      if (searchUsername.length > 0) {
        setFilteredContacts(prevFilteredContacts =>
          prevFilteredContacts.filter(contact => contact._id !== updatedChat._id)
        );
      }

      setUnreadMessagesCount((prevUnreadMessagesCount) => {
        const { [updatedChat._id]: _, ...remainingUnreadMessagesCount } = prevUnreadMessagesCount;
        return remainingUnreadMessagesCount;
      });

      // If the current user was in the selected chat, clear the selected chat and messages
      if (selectedChat && selectedChat._id === updatedChat._id) {
        setSelectedChat(null);
        setMessages([]);
        socket.emit('leave chat', updatedChat._id);
      }
    } else {
      // Update contacts
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact._id === updatedChat._id
            ? { ...contact, users: updatedChat.users, lastMessage: systemMessage }
            : contact
        )
      );

      // Update filteredContacts
      setFilteredContacts(prevFilteredContacts =>
        prevFilteredContacts.map(contact =>
          contact._id === updatedChat._id
            ? { ...contact, users: updatedChat.users, lastMessage: systemMessage }
            : contact
        )
      );

      // If the selected chat is the one that was updated, update its details
      if (selectedChat && selectedChat._id === updatedChat._id) {
        setSelectedChat(prevSelectedChat => ({ ...prevSelectedChat, ...updatedChat, lastMessage: systemMessage }));
        setMessages(prevMessages => [...prevMessages, systemMessage]);
      }
    }
  }, [searchUsername, setUnreadMessagesCount, selectedChat, setContacts, setSelectedChat, setMessages, setFilteredContacts, socket]);


  const handleAddedUsersGroup = useCallback((systemMessage, updatedChat) => {
    if (selectedChat && selectedChat._id === updatedChat._id) {
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact._id === updatedChat._id ? { ...updatedChat, lastMessage: systemMessage } : contact
        )
      );

      setSelectedChat(prevSelectedChat => ({ ...prevSelectedChat, ...updatedChat, lastMessage: systemMessage }));
      setMessages(prevMessages => [...prevMessages, systemMessage]);

    } else {
      // If the updated chat is not the currently selected chat
      setContacts(prevContacts => {
        let updatedContacts;
        updatedContacts = prevContacts.some(contact => contact._id === updatedChat._id)
          ? prevContacts.map(contact =>
            contact._id === updatedChat._id ? { ...contact, lastMessage: systemMessage } : contact
          )
          : [...prevContacts, { ...updatedChat, lastMessage: systemMessage }];


        // Update filteredContacts
        setFilteredContacts(updatedContacts.filter(contact =>
          contact.chatName.toLowerCase().includes(searchUsername.toLowerCase())
        ));

        return updatedContacts;
      });

    }
  }, [selectedChat, setContacts, setSelectedChat, setMessages, setFilteredContacts, searchUsername]);

  useEffect(() => {
    if (!socket) return;

    const handleNewGroupCreated = (newChat) => {
      setContacts((prevContacts) => [newChat, ...prevContacts]);
    };

    const handleUpdateChatUser_Left = ({ systemMessage, chat }) => {
      handleUpdateChatUserLeft(systemMessage, chat);
    }

    const handleGroupNameUpdate = ({ systemMessage, chat }) => {
      handleUpdatedGroupName(systemMessage, chat);
    };

    const handlePictureGroup = ({ systemMessage, chat }) => {
      handleUpdatedPictureGroup(systemMessage, chat);
    };

    const handleDeletedUsers_Group = ({ systemMessage, chat, removedUserId }) => {
      handleDeletedUsersGroup(systemMessage, chat, removedUserId);
    };

    const handleAddedUsers_Group = ({ systemMessage, chat }) => {
      handleAddedUsersGroup(systemMessage, chat);
    }


    socket.on('added users group', handleAddedUsers_Group);
    socket.on('update picture group', handlePictureGroup);
    socket.on('updated group name', handleGroupNameUpdate);
    socket.on('update last message', handleUpdateLastMessage);
    socket.on('add new contact', handleAddNewContact);
    socket.on('new group created', handleNewGroupCreated);
    socket.on('user left group', handleUpdateChatUser_Left);
    socket.on('deleted users group', handleDeletedUsers_Group);

    return () => {

      socket.off('added users group', handleAddedUsers_Group);
      socket.off('deleted users group', handleDeletedUsers_Group);
      socket.off('update picture group', handlePictureGroup);
      socket.off('updated group name', handleGroupNameUpdate);
      socket.off('update last message', handleUpdateLastMessage);
      socket.off('add new contact', handleAddNewContact);
      socket.off('new group created', handleNewGroupCreated);
      socket.off('user left group', handleUpdateChatUser_Left);
    };
  }, [handleUpdatedGroupName, handleUpdateLastMessage, handleAddNewContact,
    handleUpdatedPictureGroup, handleUpdateChatUserLeft, handleDeletedUsersGroup,
    handleAddedUsersGroup, setContacts, socket]);



  const handleSearch = async (e) => {
    const currentUserID = currentUser._id;
    const searchTerm = e.target.value.trim();
    setSearchUserName(searchTerm);

    const filteredContacts = contacts.filter(contact =>
      (contact.isGroupChat && contact.chatName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contact.users.some(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
        user._id !== currentUserID
      )
    );


    if (searchTerm.length === 0) {
      setSearchList([]);
      setFilteredContacts([]);
      return;
    }


    try {
      const response = await axios.get(`${config.URL_CONNECT}/users/search/${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contactUserIds = new Set(contacts.flatMap(contact => !contact.isGroupChat && contact.users.map(u => u._id)));
      const newUsers = response.data.results.filter(user => !contactUserIds.has(user._id));

      setSearchList(newUsers);
      setFilteredContacts(filteredContacts);
    } catch (error) {
      console.error('Error searching for users:', error);
    }
  };


  const handleContactClick = useCallback(async (chat) => {
    if (selectedChat?._id !== chat._id) {
      // Leave the current chat if one is selected
      if (selectedChat) {
        socket.emit('leave chat', selectedChat._id);
      }
      // Join the new chat
      socket.emit('join chat', chat._id);
      // Set the newly selected chat
      await fetchChatMessages(chat._id);
      setSelectedChat(chat);
      // Reset unread messages count for the new chat
      if (unreadMessagesCount[chat._id] > 0) {
        await resetUnreadCount(chat._id);
      }
    }
  }, [resetUnreadCount, fetchChatMessages, selectedChat, setSelectedChat, socket, unreadMessagesCount]);

  const handleCreateNewChat = (userId) => {
    const user = searchList.find(u => u._id === userId);
    if (!user) return; // Exit if user not found

    const tempChat = {
      _id: null, // Temporary placeholder ID
      isGroupChat: false,
      chatName: user.username, // Use username as the chat name
      profilePicture: user.profilePicture,
      users: [user] // Include the selected user in the users array
    };

    setSelectedChat(tempChat);
    setMessages([]);
  };

  const deleteChat = async (chatId) => {
    try {
      const response = await axios.post(`${config.URL_CONNECT}/chats/deleteChat`, { chatId }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const chat = response.data.chat;
      socket.emit('leave chat', chatId);

      if (chat && chat.isGroupChat) {
        const user = currentUser;
        socket.emit('left group', { chat, user });
      }
      setContacts(contacts.filter(contact => contact._id !== chatId));
      setSelectedChat((prevSelectedChat) => (prevSelectedChat && prevSelectedChat._id === chatId ? null : prevSelectedChat));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };




  const formatLastMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: '2-digit' });
    }
  };

  const regexPattern = new RegExp(`${currentUser.username}\\s*and\\s*|\\s*and\\s*${currentUser.username}`, 'i');

  const sortedContacts = useMemo(() => {
    return contacts.slice().sort((a, b) => {
      const lastMessageA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const lastMessageB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return lastMessageB - lastMessageA;
    });
  }, [contacts]);

  const sortedFilteredContacts = useMemo(() => {
    return filteredContacts.slice().sort((a, b) => {
      const lastMessageA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const lastMessageB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return lastMessageB - lastMessageA;
    });
  }, [filteredContacts]);


  const resetFilters = () => {
    setShowingUnreadOnly(false);
    setShowingGroupsOnly(false);
    setSearchUserName('');
    setFilteredContacts([]);
    setSearchList([]);
  };


  return (
    <>
      <div className="chat-list-header">
        <h3>Chats</h3>
        <div className="search-bar">
          <input
            type="search"
            className="form-control"
            placeholder="Search..."
            value={searchUsername}
            onChange={handleSearch}
          />
        </div>
      </div>
      <button className="create-group-btn" onClick={() => setShowGroupCreateModal(true)}><i className="bi bi-people"></i> New Group</button>
      {showGroupCreateModal && (
        <CreateGroupModal showGroupCreateModal={showGroupCreateModal} socket={socket} setShowGroupCreateModal={setShowGroupCreateModal} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
        <button
          className={!showingUnreadOnly && !showingGroupsOnly ? "active-all-filter-btn" : "all-filter-btn"}
          onClick={resetFilters}
        >
          All
        </button>
        <button
          className={showingUnreadOnly ? "active-unread-filter-btn" : "unread-filter-btn"}
          onClick={() => {
            setShowingUnreadOnly(!showingUnreadOnly);
            setShowingGroupsOnly(false)
          }}
        >
          <i className="bi bi-envelope-fill"></i> Unread
        </button>
        <button
          className={showingGroupsOnly ? "active-group-filter-btn" : "group-filter-btn"}
          onClick={() => {
            setShowingGroupsOnly(!showingGroupsOnly);
            setShowingUnreadOnly(false);
          }}
        >
          <i className="bi bi-people-fill"></i> Groups
        </button>
      </div>
      <div className="chat-list">
        {searchUsername.length > 0 ? (
          <>
            <h4 className="Existing-Contacts">Existing Contacts</h4>
            {sortedFilteredContacts.length > 0 ? (
              showingGroupsOnly && !showingUnreadOnly ? (
                sortedFilteredContacts.filter(contact => contact.isGroupChat).length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span className="no-group-chats">No group chats found.</span>
                    <br />
                    <Link className="view-all-chats-btn" onClick={() => setShowingGroupsOnly(!showingGroupsOnly)}>
                      View All chats
                    </Link>
                  </div>
                ) :
                  (sortedFilteredContacts.filter(contact => contact.isGroupChat).map(contact => (
                    <div
                      key={contact._id}
                      onClick={() => handleContactClick(contact)}
                      className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
                    >
                      <img
                        src={contact.groupPicture}
                        alt={contact.chatName}
                        className="profile-image"
                      />
                      <div className="user-info">
                        <div className="username-container">
                          <span className="username">
                            {contact.isGroupChat
                              ? contact.chatName && contact.chatName.length > 20
                                ? `${contact.chatName.substring(0, 20)}...`
                                : contact.chatName || 'Unnamed Group'
                              : contact.chatName
                                ? contact.chatName.replace(regexPattern, '').length > 20
                                  ? `${contact.chatName.replace(regexPattern, '').substring(0, 20)}...`
                                  : contact.chatName.replace(regexPattern, '')
                                : 'Chat'}
                            {unreadMessagesCount[contact._id] > 0 && (
                              <span className="unread-badge">
                                {unreadMessagesCount[contact._id]}
                              </span>
                            )}
                          </span>

                        </div>
                        <div className="last-message-preview">
                          {contact.isGroupChat ?
                            contact.lastMessage
                              ? contact.lastMessage.systemMessage && (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                                ? contact.lastMessage.content
                                : (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                  contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                                  ? contact.lastMessage.deletedForEveryone
                                    ? contact.lastMessage.senderUsername === currentUser.username
                                      ? "You deleted this message"
                                      : "This message has been deleted"
                                    :
                                    contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                                      ? "You deleted this message"
                                      :
                                      <>
                                        {`${contact.lastMessage.senderUsername}: `}
                                        {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                          (<>
                                            <i className="bi bi-file-earmark"></i>&nbsp;
                                            {contact.lastMessage.content || 'document'}
                                          </>)
                                          : contact.lastMessage.fileType ? (
                                            <>
                                              {contact.lastMessage.fileType === 'image' && (
                                                <>
                                                  <i className="bi bi-image"></i>&nbsp;
                                                  {contact.lastMessage.content || 'image'}
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'video' && (
                                                <>
                                                  <i className="bi bi-camera-video"></i>&nbsp;
                                                  {contact.lastMessage.content || 'video'}
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'audio' && (
                                                <>
                                                  <i className="bi bi-mic-fill"></i>
                                                  <span> {contact.lastMessage.recordingDuration}</span>
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'raw' && (
                                                <>
                                                  <i className="bi bi-file-earmark"></i>&nbsp;
                                                  {contact.lastMessage.content || 'document'}
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            <> {contact.lastMessage.content} </>
                                          )}
                                      </>
                                  : "No messages yet"
                              : "No messages yet" :

                            contact.lastMessage ?
                              contact.lastMessage.deletedForEveryone ?
                                contact.lastMessage.senderUsername === currentUser.username ?
                                  "You deleted this message"
                                  :
                                  "This message has been deleted"
                                :
                                contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                                  ? "You deleted this message"
                                  :
                                  <>
                                    {`${contact.lastMessage.senderUsername}: `}
                                    {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                      (<>
                                        <i className="bi bi-file-earmark"></i>&nbsp;
                                        {contact.lastMessage.content || 'document'}
                                      </>)
                                      : contact.lastMessage.fileType ? (
                                        <>
                                          {contact.lastMessage.fileType === 'image' && (
                                            <>
                                              <i className="bi bi-image"></i>&nbsp;
                                              {contact.lastMessage.content || 'image'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'video' && (
                                            <>
                                              <i className="bi bi-camera-video"></i>&nbsp;
                                              {contact.lastMessage.content || 'video'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'audio' && (
                                            <>
                                              <i className="bi bi-mic-fill"></i>
                                              <span> {contact.lastMessage.recordingDuration}</span>
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'raw' && (
                                            <>
                                              <i className="bi bi-file-earmark"></i>&nbsp;
                                              {contact.lastMessage.content || 'document'}
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <> {contact.lastMessage.content} </>
                                      )}
                                  </>
                              :
                              "No messages yet"
                          }
                        </div>
                      </div>
                      <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                        {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                      </div>
                    </div>
                  )))
              ) :
                (showingUnreadOnly && !showingGroupsOnly ? (
                  sortedFilteredContacts.filter(contact => unreadMessagesCount[contact._id] > 0).length === 0 ?
                    (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="no-unread-message">
                        No chat in Unread
                        <br />
                        <Link className="view-all-chats-btn" onClick={() => setShowingUnreadOnly(!showingUnreadOnly)}>
                          View All chats
                        </Link>
                      </span>
                    </div>) : (
                      sortedFilteredContacts.filter(contact => unreadMessagesCount[contact._id] > 0).map(contact => (
                        <div
                          key={contact._id}
                          onClick={() => handleContactClick(contact)}
                          className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
                        >
                          <img
                            src={contact.isGroupChat ? contact.groupPicture : contact.users?.find(user => user._id !== currentUser._id).profilePicture}
                            alt={contact.chatName}
                            className="profile-image"
                          />
                          <div className="user-info">
                            <div className="username-container">
                              <span className="username">
                                {contact.isGroupChat
                                  ? contact.chatName && contact.chatName.length > 20
                                    ? `${contact.chatName.substring(0, 20)}...`
                                    : contact.chatName || 'Unnamed Group'
                                  : contact.chatName
                                    ? contact.chatName.replace(regexPattern, '').length > 20
                                      ? `${contact.chatName.replace(regexPattern, '').substring(0, 20)}...`
                                      : contact.chatName.replace(regexPattern, '')
                                    : 'Chat'}
                                {unreadMessagesCount[contact._id] > 0 && (
                                  <span className="unread-badge">
                                    {unreadMessagesCount[contact._id]}
                                  </span>
                                )}
                              </span>

                            </div>
                            <div className="last-message-preview">
                              {contact.isGroupChat ?
                                contact.lastMessage
                                  ? contact.lastMessage.systemMessage && (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                    contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                                    ? contact.lastMessage.content
                                    : (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                      contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                                      ? contact.lastMessage.deletedForEveryone
                                        ? contact.lastMessage.senderUsername === currentUser.username
                                          ? "You deleted this message"
                                          : "This message has been deleted"
                                        :
                                        contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                                          ? "You deleted this message"
                                          :
                                          <>
                                            {`${contact.lastMessage.senderUsername}: `}
                                            {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                              (<>
                                                <i className="bi bi-file-earmark"></i>&nbsp;
                                                {contact.lastMessage.content || 'document'}
                                              </>)
                                              : contact.lastMessage.fileType ? (
                                                <>
                                                  {contact.lastMessage.fileType === 'image' && (
                                                    <>
                                                      <i className="bi bi-image"></i>&nbsp;
                                                      {contact.lastMessage.content || 'image'}
                                                    </>
                                                  )}
                                                  {contact.lastMessage.fileType === 'video' && (
                                                    <>
                                                      <i className="bi bi-camera-video"></i>&nbsp;
                                                      {contact.lastMessage.content || 'video'}
                                                    </>
                                                  )}
                                                  {contact.lastMessage.fileType === 'audio' && (
                                                    <>
                                                      <i className="bi bi-mic-fill"></i>
                                                      <span> {contact.lastMessage.recordingDuration}</span>
                                                    </>
                                                  )}
                                                  {contact.lastMessage.fileType === 'raw' && (
                                                    <>
                                                      <i className="bi bi-file-earmark"></i>&nbsp;
                                                      {contact.lastMessage.content || 'document'}
                                                    </>
                                                  )}
                                                </>
                                              ) : (
                                                <> {contact.lastMessage.content} </>
                                              )}
                                          </>
                                      : "No messages yet"
                                  : "No messages yet" :

                                contact.lastMessage ?
                                  contact.lastMessage.deletedForEveryone ?
                                    contact.lastMessage.senderUsername === currentUser.username ?
                                      "You deleted this message"
                                      :
                                      "This message has been deleted"
                                    :
                                    contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                                      ? "You deleted this message"
                                      :
                                      <>
                                        {`${contact.lastMessage.senderUsername}: `}
                                        {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                          (<>
                                            <i className="bi bi-file-earmark"></i>&nbsp;
                                            {contact.lastMessage.content || 'document'}
                                          </>)
                                          : contact.lastMessage.fileType ? (
                                            <>
                                              {contact.lastMessage.fileType === 'image' && (
                                                <>
                                                  <i className="bi bi-image"></i>&nbsp;
                                                  {contact.lastMessage.content || 'image'}
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'video' && (
                                                <>
                                                  <i className="bi bi-camera-video"></i>&nbsp;
                                                  {contact.lastMessage.content || 'video'}
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'audio' && (
                                                <>
                                                  <i className="bi bi-mic-fill"></i>
                                                  <span> {contact.lastMessage.recordingDuration}</span>
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'raw' && (
                                                <>
                                                  <i className="bi bi-file-earmark"></i>&nbsp;
                                                  {contact.lastMessage.content || 'document'}
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            <> {contact.lastMessage.content} </>
                                          )}
                                      </>
                                  :
                                  "No messages yet"
                              }
                            </div>
                          </div>
                          <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                            {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                          </div>
                          {contact.isGroupChat ? (
                            <></>
                          ) : (
                            <span className={`status-indicator ${onlineUsers.includes(contact.users?.find(user => user._id !== currentUser._id)._id) ? 'connect' : 'disconnect'}`}></span>
                          )}
                        </div>
                      )))
                ) :
                  (sortedFilteredContacts.map(contact => (
                    <div
                      key={contact._id}
                      onClick={() => handleContactClick(contact)}
                      className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
                    >
                      <img
                        src={contact.isGroupChat ? contact.groupPicture : contact.users?.find(user => user._id !== currentUser._id).profilePicture}
                        alt={contact.chatName}
                        className="profile-image"
                      />
                      <div className="user-info">
                        <div className="username-container">
                          <span className="username">
                            {contact.isGroupChat
                              ? contact.chatName && contact.chatName.length > 20
                                ? `${contact.chatName.substring(0, 20)}...`
                                : contact.chatName || 'Unnamed Group'
                              : contact.chatName
                                ? contact.chatName.replace(regexPattern, '').length > 20
                                  ? `${contact.chatName.replace(regexPattern, '').substring(0, 20)}...`
                                  : contact.chatName.replace(regexPattern, '')
                                : 'Chat'}
                            {unreadMessagesCount[contact._id] > 0 && (
                              <span className="unread-badge">
                                {unreadMessagesCount[contact._id]}
                              </span>
                            )}
                          </span>

                        </div>
                        <div className="last-message-preview">
                          {contact.isGroupChat ?
                            contact.lastMessage
                              ? contact.lastMessage.systemMessage && (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                                ? contact.lastMessage.content
                                : (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                  contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                                  ? contact.lastMessage.deletedForEveryone
                                    ? contact.lastMessage.senderUsername === currentUser.username
                                      ? "You deleted this message"
                                      : "This message has been deleted"
                                    :
                                    contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                                      ? "You deleted this message"
                                      :
                                      <>
                                        {`${contact.lastMessage.senderUsername}: `}
                                        {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                          (<>
                                            <i className="bi bi-file-earmark"></i>&nbsp;
                                            {contact.lastMessage.content || 'document'}
                                          </>)
                                          : contact.lastMessage.fileType ? (
                                            <>
                                              {contact.lastMessage.fileType === 'image' && (
                                                <>
                                                  <i className="bi bi-image"></i>&nbsp;
                                                  {contact.lastMessage.content || 'image'}
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'video' && (
                                                <>
                                                  <i className="bi bi-camera-video"></i>&nbsp;
                                                  {contact.lastMessage.content || 'video'}
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'audio' && (
                                                <>
                                                  <i className="bi bi-mic-fill"></i>
                                                  <span> {contact.lastMessage.recordingDuration}</span>
                                                </>
                                              )}
                                              {contact.lastMessage.fileType === 'raw' && (
                                                <>
                                                  <i className="bi bi-file-earmark"></i>&nbsp;
                                                  {contact.lastMessage.content || 'document'}
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            <> {contact.lastMessage.content} </>
                                          )}
                                      </>
                                  : "No messages yet"
                              : "No messages yet" :

                            contact.lastMessage ?
                              contact.lastMessage.deletedForEveryone ?
                                contact.lastMessage.senderUsername === currentUser.username ?
                                  "You deleted this message"
                                  :
                                  "This message has been deleted"
                                :
                                contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                                  ? "You deleted this message"
                                  :
                                  <>
                                    {`${contact.lastMessage.senderUsername}: `}
                                    {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                      (<>
                                        <i className="bi bi-file-earmark"></i>&nbsp;
                                        {contact.lastMessage.content || 'document'}
                                      </>)
                                      : contact.lastMessage.fileType ? (
                                        <>
                                          {contact.lastMessage.fileType === 'image' && (
                                            <>
                                              <i className="bi bi-image"></i>&nbsp;
                                              {contact.lastMessage.content || 'image'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'video' && (
                                            <>
                                              <i className="bi bi-camera-video"></i>&nbsp;
                                              {contact.lastMessage.content || 'video'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'audio' && (
                                            <>
                                              <i className="bi bi-mic-fill"></i>
                                              <span> {contact.lastMessage.recordingDuration}</span>
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'raw' && (
                                            <>
                                              <i className="bi bi-file-earmark"></i>&nbsp;
                                              {contact.lastMessage.content || 'document'}
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <> {contact.lastMessage.content} </>
                                      )}
                                  </>
                              :
                              "No messages yet"
                          }
                        </div>
                      </div>
                      <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                        {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                      </div>
                      {contact.isGroupChat ? (
                        <></>
                      ) : (
                        <span className={`status-indicator ${onlineUsers.includes(contact.users?.find(user => user._id !== currentUser._id)._id) ? 'connect' : 'disconnect'}`}></span>
                      )}
                    </div>
                  ))
                  ))) : (
              <p className="no-matching-contacts">No matching contacts found.</p>
            )}
            <h4 className="other-users">Other Users</h4>
            {searchList.length > 0 ? (
              searchList.map(user => (
                <div
                  key={user._id}
                  onClick={() => handleCreateNewChat(user._id)}
                  className="chat-list-item"
                >
                  <img
                    src={user.profilePicture}
                    alt={user.username}
                    className="profile-image"
                  />
                  <div className="user-info">
                    <p>{user.username}</p>
                  </div>
                  <span className={`status-indicator ${onlineUsers.includes(user._id) ? 'connect' : 'disconnect'}`}></span>
                </div>
              ))
            ) : (
              <p className="no-new-users-found">No new users found.</p>
            )}
          </>
        ) : loading ? (
          <div className="loading-indicator">
            <p className="loader-contacts"></p>
          </div>
        ) : sortedContacts.length > 0 ? (
          showingGroupsOnly && !showingUnreadOnly ? (
            sortedContacts.filter(contact => contact.isGroupChat).length === 0 ?
              (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span className="no-group-chats">No group chats found.
                  <br />
                  <Link className="view-all-chats-btn" onClick={() => setShowingGroupsOnly(!showingGroupsOnly)}>
                    View All chats
                  </Link>
                </span>
              </div>) :
              (sortedContacts.filter(contact => contact.isGroupChat).map(contact => (
                <div
                  key={contact._id}
                  onClick={() => handleContactClick(contact)}
                  className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
                >
                  <img
                    src={contact.groupPicture}
                    alt={contact.chatName}
                    className="profile-image"
                  />
                  <div className="user-info">
                    <div className="username-container">
                      <span className="username">
                        {contact.isGroupChat
                          ? contact.chatName && contact.chatName.length > 20
                            ? `${contact.chatName.substring(0, 20)}...`
                            : contact.chatName || 'Unnamed Group'
                          : contact.chatName
                            ? contact.chatName.replace(regexPattern, '').length > 20
                              ? `${contact.chatName.replace(regexPattern, '').substring(0, 20)}...`
                              : contact.chatName.replace(regexPattern, '')
                            : 'Chat'}
                        {unreadMessagesCount[contact._id] > 0 && (
                          <span className="unread-badge">
                            {unreadMessagesCount[contact._id]}
                          </span>
                        )}
                      </span>

                    </div>
                    <div className="last-message-preview">
                      {contact.isGroupChat ?
                        contact.lastMessage
                          ? contact.lastMessage.systemMessage && (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                            contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                            ? contact.lastMessage.content
                            : (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                              contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp)
                              ? contact.lastMessage.deletedForEveryone
                                ? contact.lastMessage.senderUsername === currentUser.username
                                  ? "You deleted this message"
                                  : "This message has been deleted"
                                :
                                contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                                  ? "You deleted this message"
                                  :
                                  <>
                                    {`${contact.lastMessage.senderUsername}: `}
                                    {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                      (<>
                                        <i className="bi bi-file-earmark"></i>&nbsp;
                                        {contact.lastMessage.content || 'document'}
                                      </>)
                                      : contact.lastMessage.fileType ? (
                                        <>
                                          {contact.lastMessage.fileType === 'image' && (
                                            <>
                                              <i className="bi bi-image"></i>&nbsp;
                                              {contact.lastMessage.content || 'image'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'video' && (
                                            <>
                                              <i className="bi bi-camera-video"></i>&nbsp;
                                              {contact.lastMessage.content || 'video'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'audio' && (
                                            <>
                                              <i className="bi bi-mic-fill"></i>
                                              <span> {contact.lastMessage.recordingDuration}</span>
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'raw' && (
                                            <>
                                              <i className="bi bi-file-earmark"></i>&nbsp;
                                              {contact.lastMessage.content || 'document'}
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <> {contact.lastMessage.content} </>
                                      )}
                                  </>
                              : "No messages yet"
                          : "No messages yet" :

                        contact.lastMessage ?
                          contact.lastMessage.deletedForEveryone ?
                            contact.lastMessage.senderUsername === currentUser.username ?
                              "You deleted this message"
                              :
                              "This message has been deleted"
                            :
                            contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id)
                              ? "You deleted this message"
                              :
                              <>
                                {`${contact.lastMessage.senderUsername}: `}
                                {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ?
                                  (<>
                                    <i className="bi bi-file-earmark"></i>&nbsp;
                                    {contact.lastMessage.content || 'document'}
                                  </>)
                                  : contact.lastMessage.fileType ? (
                                    <>
                                      {contact.lastMessage.fileType === 'image' && (
                                        <>
                                          <i className="bi bi-image"></i>&nbsp;
                                          {contact.lastMessage.content || 'image'}
                                        </>
                                      )}
                                      {contact.lastMessage.fileType === 'video' && (
                                        <>
                                          <i className="bi bi-camera-video"></i>&nbsp;
                                          {contact.lastMessage.content || 'video'}
                                        </>
                                      )}
                                      {contact.lastMessage.fileType === 'audio' && (
                                        <>
                                          <i className="bi bi-mic-fill"></i>
                                          <span> {contact.lastMessage.recordingDuration}</span>
                                        </>
                                      )}
                                      {contact.lastMessage.fileType === 'raw' && (
                                        <>
                                          <i className="bi bi-file-earmark"></i>&nbsp;
                                          {contact.lastMessage.content || 'document'}
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <> {contact.lastMessage.content} </>
                                  )}
                              </>
                          :
                          "No messages yet"
                      }
                    </div>
                  </div>
                  <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                    {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                  </div>
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
              )))
          ) :
            (showingUnreadOnly && !showingGroupsOnly ? (
              sortedContacts.filter(contact => unreadMessagesCount[contact._id] > 0).length === 0 ?
                (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span className="no-unread-message">
                    No chat in Unread
                    <br />
                    <Link className="view-all-chats-btn" onClick={() => setShowingUnreadOnly(!showingUnreadOnly)}>
                      View All chats
                    </Link>
                  </span>
                </div>) :
                (sortedContacts.filter(contact => unreadMessagesCount[contact._id] > 0).map((contact) => (
                  <div
                    key={contact._id}
                    onClick={() => handleContactClick(contact)}
                    className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
                  >
                    {contact.isGroupChat ? (
                      <>
                        <img
                          src={contact.groupPicture}
                          alt='groupPicture'
                          className="profile-image"
                        />
                        <div className="user-info">
                          <div className="username-container">
                            <span className="username">
                              {contact.chatName && contact.chatName.length > 20
                                ? `${contact.chatName.substring(0, 20)}...`
                                : contact.chatName || 'Unnamed Group'}
                              {unreadMessagesCount[contact._id] > 0 && (
                                <span className="unread-badge">
                                  {unreadMessagesCount[contact._id]}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="last-message-preview">
                            {contact.lastMessage ? (
                              contact.lastMessage.systemMessage && (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp) ? (
                                contact.lastMessage.content
                              ) : (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                                contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp) ? (
                                contact.lastMessage.deletedForEveryone ? (
                                  contact.lastMessage.senderUsername === currentUser.username ? (
                                    "You deleted this message"
                                  ) : (
                                    "This message has been deleted"
                                  )
                                ) : contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id) ? (
                                  "You deleted this message"
                                ) : (
                                  <>
                                    {`${contact.lastMessage.senderUsername}: `}
                                    {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ? (
                                      <>
                                        <i className="bi bi-file-earmark"></i>&nbsp;
                                        {contact.lastMessage.content || 'document'}
                                      </>
                                    ) : contact.lastMessage.fileType ? (
                                      <>
                                        {contact.lastMessage.fileType === 'image' && (
                                          <>
                                            <i className="bi bi-image"></i>&nbsp;
                                            {contact.lastMessage.content || 'image'}
                                          </>
                                        )}
                                        {contact.lastMessage.fileType === 'video' && (
                                          <>
                                            <i className="bi bi-camera-video"></i>&nbsp;
                                            {contact.lastMessage.content || 'video'}
                                          </>
                                        )}
                                        {contact.lastMessage.fileType === 'audio' && (
                                          <>
                                            <i className="bi bi-mic-fill"></i>
                                            <span> {contact.lastMessage.recordingDuration}</span>
                                          </>
                                        )}
                                        {contact.lastMessage.fileType === 'raw' && (
                                          <>
                                            <i className="bi bi-file-earmark"></i>&nbsp;
                                            {contact.lastMessage.content || 'document'}
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <> {contact.lastMessage.content} </>
                                    )}
                                  </>
                                )
                              ) : (
                                "No messages yet"
                              )
                            ) : (
                              "No messages yet"
                            )}
                          </div>
                        </div>
                        <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                          {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                        </div>
                      </>
                    ) : (
                      contact.users
                        .filter((user) => user._id !== currentUser._id)
                        .map((user) => (
                          <React.Fragment key={user._id}>
                            <img
                              src={user.profilePicture}
                              alt={user.username}
                              className="profile-image"
                            />
                            <div className="user-info">
                              <div className="username-container">
                                <span className="username">
                                  {user.username}
                                  {unreadMessagesCount[contact._id] > 0 && (
                                    <span className="unread-badge">
                                      {unreadMessagesCount[contact._id]}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="last-message-preview">
                                {contact.lastMessage ? (
                                  contact.lastMessage.deletedForEveryone ? (
                                    contact.lastMessage.senderUsername === currentUser.username ? (
                                      "You deleted this message"
                                    ) : (
                                      "This message has been deleted"
                                    )
                                  ) : contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id) ? (
                                    "You deleted this message"
                                  ) : (
                                    <>
                                      {`${contact.lastMessage.senderUsername}: `}
                                      {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ? (
                                        <>
                                          <i className="bi bi-file-earmark"></i>&nbsp;
                                          {contact.lastMessage.content || 'document'}
                                        </>
                                      ) : contact.lastMessage.fileType ? (
                                        <>
                                          {contact.lastMessage.fileType === 'image' && (
                                            <>
                                              <i className="bi bi-image"></i>&nbsp;
                                              {contact.lastMessage.content || 'image'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'video' && (
                                            <>
                                              <i className="bi bi-camera-video"></i>&nbsp;
                                              {contact.lastMessage.content || 'video'}
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'audio' && (
                                            <>
                                              <i className="bi bi-mic-fill"></i>
                                              <span> {contact.lastMessage.recordingDuration}</span>
                                            </>
                                          )}
                                          {contact.lastMessage.fileType === 'raw' && (
                                            <>
                                              <i className="bi bi-file-earmark"></i>&nbsp;
                                              {contact.lastMessage.content || 'document'}
                                            </>
                                          )}
                                        </>
                                      ) : (
                                        <> {contact.lastMessage.content} </>
                                      )}
                                    </>
                                  )
                                ) : (
                                  "No messages yet"
                                )}
                              </div>
                            </div>
                            <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                              {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                            </div>
                            <span className={`status-indicator ${onlineUsers.includes(user._id) ? 'connect' : 'disconnect'}`}></span>
                          </React.Fragment>
                        ))
                    )}
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
                )))
            ) :
              (sortedContacts.map((contact) => (
                <div
                  key={contact._id}
                  onClick={() => handleContactClick(contact)}
                  className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
                >
                  {contact.isGroupChat ? (
                    <>
                      <img
                        src={contact.groupPicture}
                        alt='groupPicture'
                        className="profile-image"
                      />
                      <div className="user-info">
                        <div className="username-container">
                          <span className="username">
                            {contact.chatName && contact.chatName.length > 20
                              ? `${contact.chatName.substring(0, 20)}...`
                              : contact.chatName || 'Unnamed Group'}
                            {unreadMessagesCount[contact._id] > 0 && (
                              <span className="unread-badge">
                                {unreadMessagesCount[contact._id]}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="last-message-preview">
                          {contact.lastMessage ? (
                            contact.lastMessage.systemMessage && (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                              contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp) ? (
                              contact.lastMessage.content
                            ) : (!contact.deleteHistoryTimestamp || !contact.deleteHistoryTimestamp[currentUser._id] ||
                              contact.deleteHistoryTimestamp[currentUser._id] < contact.lastMessage.timestamp) ? (
                              contact.lastMessage.deletedForEveryone ? (
                                contact.lastMessage.senderUsername === currentUser.username ? (
                                  "You deleted this message"
                                ) : (
                                  "This message has been deleted"
                                )
                              ) : contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id) ? (
                                "You deleted this message"
                              ) : (
                                <>
                                  {`${contact.lastMessage.senderUsername}: `}
                                  {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ? (
                                    <>
                                      <i className="bi bi-file-earmark"></i>&nbsp;
                                      {contact.lastMessage.content || 'document'}
                                    </>
                                  ) : contact.lastMessage.fileType ? (
                                    <>
                                      {contact.lastMessage.fileType === 'image' && (
                                        <>
                                          <i className="bi bi-image"></i>&nbsp;
                                          {contact.lastMessage.content || 'image'}
                                        </>
                                      )}
                                      {contact.lastMessage.fileType === 'video' && (
                                        <>
                                          <i className="bi bi-camera-video"></i>&nbsp;
                                          {contact.lastMessage.content || 'video'}
                                        </>
                                      )}
                                      {contact.lastMessage.fileType === 'audio' && (
                                        <>
                                          <i className="bi bi-mic-fill"></i>
                                          <span> {contact.lastMessage.recordingDuration}</span>
                                        </>
                                      )}
                                      {contact.lastMessage.fileType === 'raw' && (
                                        <>
                                          <i className="bi bi-file-earmark"></i>&nbsp;
                                          {contact.lastMessage.content || 'document'}
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <> {contact.lastMessage.content} </>
                                  )}
                                </>
                              )
                            ) : (
                              "No messages yet"
                            )
                          ) : (
                            "No messages yet"
                          )}
                        </div>
                      </div>
                      <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                        {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                      </div>
                    </>
                  ) : (
                    contact.users
                      .filter((user) => user._id !== currentUser._id)
                      .map((user) => (
                        <React.Fragment key={user._id}>
                          <img
                            src={user.profilePicture}
                            alt={user.username}
                            className="profile-image"
                          />
                          <div className="user-info">
                            <div className="username-container">
                              <span className="username">
                                {user.username}
                                {unreadMessagesCount[contact._id] > 0 && (
                                  <span className="unread-badge">
                                    {unreadMessagesCount[contact._id]}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="last-message-preview">
                              {contact.lastMessage ? (
                                contact.lastMessage.deletedForEveryone ? (
                                  contact.lastMessage.senderUsername === currentUser.username ? (
                                    "You deleted this message"
                                  ) : (
                                    "This message has been deleted"
                                  )
                                ) : contact.lastMessage.deletedForUsers && contact.lastMessage.deletedForUsers.includes(currentUser._id) ? (
                                  "You deleted this message"
                                ) : (
                                  <>
                                    {`${contact.lastMessage.senderUsername}: `}
                                    {contact.lastMessage.fileUrl && contact.lastMessage.fileUrl.endsWith('.pdf') ? (
                                      <>
                                        <i className="bi bi-file-earmark"></i>&nbsp;
                                        {contact.lastMessage.content || 'document'}
                                      </>
                                    ) : contact.lastMessage.fileType ? (
                                      <>
                                        {contact.lastMessage.fileType === 'image' && (
                                          <>
                                            <i className="bi bi-image"></i>&nbsp;
                                            {contact.lastMessage.content || 'image'}
                                          </>
                                        )}
                                        {contact.lastMessage.fileType === 'video' && (
                                          <>
                                            <i className="bi bi-camera-video"></i>&nbsp;
                                            {contact.lastMessage.content || 'video'}
                                          </>
                                        )}
                                        {contact.lastMessage.fileType === 'audio' && (
                                          <>
                                            <i className="bi bi-mic-fill"></i>
                                            <span> {contact.lastMessage.recordingDuration}</span>
                                          </>
                                        )}
                                        {contact.lastMessage.fileType === 'raw' && (
                                          <>
                                            <i className="bi bi-file-earmark"></i>&nbsp;
                                            {contact.lastMessage.content || 'document'}
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <> {contact.lastMessage.content} </>
                                    )}
                                  </>
                                )
                              ) : (
                                "No messages yet"
                              )}
                            </div>
                          </div>
                          <div className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'}`}>
                            {contact.lastMessage && formatLastMessageTime(contact.lastMessage.timestamp)}
                          </div>
                          <span className={`status-indicator ${onlineUsers.includes(user._id) ? 'connect' : 'disconnect'}`}></span>
                        </React.Fragment>
                      ))
                  )}
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
              )))
            )) : (
          <p className="no-contacts">You have no contacts</p>
        )}
      </div>
    </>
  );
};

export default ChatList;
