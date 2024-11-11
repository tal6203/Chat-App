import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from 'react-router-dom';
import CreateGroupModal from "./CreateGroupModal";
import ChatListItem from "./ChatListItem";
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
  const [showingFavoritesOnly, setShowingFavoritesOnly] = useState(false);


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
        return prevFilteredContacts?.map(contact => {
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
        return prevFilteredContacts?.map(contact => {
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
        return prevFilteredContacts?.map(contact => {
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
        const updatedFilteredContact = prevFilteredContacts?.map(contact => {
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
          prevFilteredContacts?.filter(contact => contact._id !== updatedChat._id)
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
        prevContacts?.map(contact =>
          contact._id === updatedChat._id
            ? { ...contact, users: updatedChat.users, lastMessage: systemMessage }
            : contact
        )
      );

      // Update filteredContacts
      setFilteredContacts(prevFilteredContacts =>
        prevFilteredContacts?.map(contact =>
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
      if (searchUsername.length > 0) {
        setFilteredContacts(filteredContacts.filter(contact => contact._id !== chatId))
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
    return contacts?.slice().sort((a, b) => {
      const lastMessageA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const lastMessageB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return lastMessageB - lastMessageA;
    });
  }, [contacts]);

  const sortedFilteredContacts = useMemo(() => {
    return filteredContacts?.slice().sort((a, b) => {
      const lastMessageA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const lastMessageB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return lastMessageB - lastMessageA;
    });
  }, [filteredContacts]);


  const resetFilters = () => {
    setShowingUnreadOnly(false);
    setShowingGroupsOnly(false);
    setShowingFavoritesOnly(false);
    setSearchUserName('');
    setFilteredContacts([]);
    setSearchList([]);
  };

  const toggleFavorite = async (chatId) => {
    try {
      await axios.put(
        `${config.URL_CONNECT}/chats/toggleFavorite/${chatId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const userId = currentUser._id;

      // Update contacts or filteredContacts depending on the search
      if (searchUsername.length > 0) {
        setFilteredContacts((prevFilteredContacts) =>
          prevFilteredContacts?.map((contact) =>
            contact._id === chatId
              ? {
                ...contact,
                favoriteBy: contact.favoriteBy?.includes(userId)
                  ? contact.favoriteBy.filter((id) => id !== userId)
                  : [...contact.favoriteBy, userId],
              }
              : contact
          )
        );
      }
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact._id === chatId
            ? {
              ...contact,
              favoriteBy: contact.favoriteBy?.includes(userId)
                ? contact.favoriteBy.filter((id) => id !== userId)
                : [...contact.favoriteBy, userId],
            }
            : contact
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
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
      <div className="button-container">
        <button
          className={!showingUnreadOnly && !showingGroupsOnly && !showingFavoritesOnly ? "active-all-filter-btn" : "all-filter-btn"}
          onClick={resetFilters}>
          All
        </button>
        <button
          className={showingFavoritesOnly ? "active-favorite-filter-btn" : "favorite-filter-btn"}
          onClick={() => {
            setShowingFavoritesOnly(!showingFavoritesOnly)
            setShowingUnreadOnly(false);
            setShowingGroupsOnly(false);
          }}
        >
          Favorite
        </button>
        <button
          className={showingUnreadOnly ? "active-unread-filter-btn" : "unread-filter-btn"}
          onClick={() => {
            setShowingUnreadOnly(!showingUnreadOnly);
            setShowingFavoritesOnly(false);
            setShowingGroupsOnly(false);
          }}
        >
          <i className="bi bi-envelope-fill"></i> Unread
        </button>
        <button
          className={showingGroupsOnly ? "active-group-filter-btn" : "group-filter-btn"}
          onClick={() => {
            setShowingGroupsOnly(!showingGroupsOnly);
            setShowingUnreadOnly(false);
            setShowingFavoritesOnly(false);
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
              showingFavoritesOnly && !showingGroupsOnly && !showingUnreadOnly ? (
                !sortedFilteredContacts.some(contact => contact.favoriteBy?.includes(currentUser._id)) ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span className="no-group-chats">
                      No favorite chats found.
                      <br />
                      <Link className="view-all-chats-btn" onClick={() => setShowingFavoritesOnly(!showingFavoritesOnly)}>
                        View All chats
                      </Link>
                    </span>
                  </div>
                ) :
                  (
                    sortedFilteredContacts.filter(contact => contact.favoriteBy?.includes(currentUser._id)).map(contact => (
                      <ChatListItem
                        key={contact._id}
                        contact={contact}
                        selectedChat={selectedChat}
                        currentUser={currentUser}
                        unreadMessagesCount={unreadMessagesCount}
                        onlineUsers={onlineUsers}
                        handleContactClick={handleContactClick}
                        toggleFavorite={toggleFavorite}
                        deleteChat={deleteChat}
                        formatLastMessageTime={formatLastMessageTime}
                        regexPattern={regexPattern}
                      />
                    )
                    )
                  )) :
                showingGroupsOnly && !showingUnreadOnly && !showingFavoritesOnly ? (
                  sortedFilteredContacts.filter(contact => contact.isGroupChat).length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="no-group-chats">
                        No group chats found.
                        <br />
                        <Link className="view-all-chats-btn" onClick={() => setShowingGroupsOnly(!showingGroupsOnly)}>
                          View All chats
                        </Link>
                      </span>
                    </div>
                  ) :
                    (sortedFilteredContacts.filter(contact => contact.isGroupChat).map(contact => (
                      <ChatListItem
                        key={contact._id}
                        contact={contact}
                        selectedChat={selectedChat}
                        currentUser={currentUser}
                        unreadMessagesCount={unreadMessagesCount}
                        onlineUsers={onlineUsers}
                        handleContactClick={handleContactClick}
                        toggleFavorite={toggleFavorite}
                        deleteChat={deleteChat}
                        formatLastMessageTime={formatLastMessageTime}
                        regexPattern={regexPattern}
                      />
                    )))
                ) :
                  (showingUnreadOnly && !showingGroupsOnly && !showingFavoritesOnly ? (
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
                          <ChatListItem
                            key={contact._id}
                            contact={contact}
                            selectedChat={selectedChat}
                            currentUser={currentUser}
                            unreadMessagesCount={unreadMessagesCount}
                            onlineUsers={onlineUsers}
                            handleContactClick={handleContactClick}
                            toggleFavorite={toggleFavorite}
                            deleteChat={deleteChat}
                            formatLastMessageTime={formatLastMessageTime}
                            regexPattern={regexPattern}
                          />
                        )))
                  ) :
                    (sortedFilteredContacts.map(contact => (
                      <ChatListItem
                        key={contact._id}
                        contact={contact}
                        selectedChat={selectedChat}
                        currentUser={currentUser}
                        unreadMessagesCount={unreadMessagesCount}
                        onlineUsers={onlineUsers}
                        handleContactClick={handleContactClick}
                        toggleFavorite={toggleFavorite}
                        deleteChat={deleteChat}
                        formatLastMessageTime={formatLastMessageTime}
                        regexPattern={regexPattern}
                      />
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
                    <p>{user.username.length > 20 ? (
                      `${user.username.substring(0, 15)}...`
                    ) : (user.username)}</p>
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
          showingFavoritesOnly && !showingGroupsOnly && !showingUnreadOnly ? (
            !sortedContacts.some(contact => contact.favoriteBy?.includes(currentUser._id)) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span className="no-group-chats">
                  No favorite chats found.
                  <br />
                  <Link className="view-all-chats-btn" onClick={() => setShowingFavoritesOnly(!showingFavoritesOnly)}>
                    View All chats
                  </Link>
                </span>
              </div>
            ) :
              (
                sortedContacts.filter(contact => contact.favoriteBy?.includes(currentUser._id)).map(contact => (
                  <ChatListItem
                    key={contact._id}
                    contact={contact}
                    selectedChat={selectedChat}
                    currentUser={currentUser}
                    unreadMessagesCount={unreadMessagesCount}
                    onlineUsers={onlineUsers}
                    handleContactClick={handleContactClick}
                    toggleFavorite={toggleFavorite}
                    deleteChat={deleteChat}
                    formatLastMessageTime={formatLastMessageTime}
                    regexPattern={regexPattern}
                  />
                )
                )
              )) :
            showingGroupsOnly && !showingUnreadOnly && !showingFavoritesOnly ? (
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
                  <ChatListItem
                    key={contact._id}
                    contact={contact}
                    selectedChat={selectedChat}
                    currentUser={currentUser}
                    unreadMessagesCount={unreadMessagesCount}
                    onlineUsers={onlineUsers}
                    handleContactClick={handleContactClick}
                    toggleFavorite={toggleFavorite}
                    deleteChat={deleteChat}
                    formatLastMessageTime={formatLastMessageTime}
                    regexPattern={regexPattern}
                  />
                )))
            ) :
              (showingUnreadOnly && !showingGroupsOnly && !showingFavoritesOnly ? (
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
                    <ChatListItem
                      key={contact._id}
                      contact={contact}
                      selectedChat={selectedChat}
                      currentUser={currentUser}
                      unreadMessagesCount={unreadMessagesCount}
                      onlineUsers={onlineUsers}
                      handleContactClick={handleContactClick}
                      toggleFavorite={toggleFavorite}
                      deleteChat={deleteChat}
                      formatLastMessageTime={formatLastMessageTime}
                      regexPattern={regexPattern}
                    />
                  )))
              ) :
                (sortedContacts.map((contact) => (
                  <ChatListItem
                    key={contact._id}
                    contact={contact}
                    selectedChat={selectedChat}
                    currentUser={currentUser}
                    unreadMessagesCount={unreadMessagesCount}
                    onlineUsers={onlineUsers}
                    handleContactClick={handleContactClick}
                    toggleFavorite={toggleFavorite}
                    deleteChat={deleteChat}
                    formatLastMessageTime={formatLastMessageTime}
                    regexPattern={regexPattern}
                  />
                )))
              )) : (
          <p className="no-contacts">You have no contacts</p>
        )}
      </div >
    </>
  );
};

export default ChatList;
