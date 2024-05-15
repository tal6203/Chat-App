// Chat.js
import React, { Component } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Chat.css';
import config from './config/default.json';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import { sha1 } from 'crypto-hash';
import FileUploadComponent from './FileUploadComponent';
import CustomNavbar from './CustomNavbar';




class Chat extends Component {
  constructor(props) {
    super(props);
    this.messagesListRef = React.createRef();
    this.fileUploadRef = React.createRef();
    this.state = {
      contacts: [],
      loading: true,         // List of users
      selectedChat: null,    // Currently selected chat
      messages: [],         // Messages in the selected chat
      newMessage: '',       // New message content
      showEmojiPicker: false,
      showEmojiPickerForChatDetailsModal: false,
      showEmojiPickerForCreateGroup: false,
      searchUsername: '',   // Search for new users
      socket: null,
      newGroupName: '',
      newGroupPicture: '',
      pendingChatRecipient: null,
      onlineUsers: [],
      searchList: [],
      filteredContacts: [],
      unreadMessagesCount: {},
      expandedMessages: {},
      userTyping: null,
      showModal: false,
      selectedMessageId: null,
      hasMoreMessages: true,
      loadingOlderMessages: false,
      firstUnreadMessageIndex: null,
      showUnreadTitle: false,
      showScrollToBottomButton: false,
      unreadMessages: null,
      contextMenu: {
        isVisible: false,
        posX: 0,
        posY: 0,
        messageId: null,
        canDeleteForEveryone: true,
        canEdit: false
      },
      isContextMenuOpen: false,
      isEditing: false,
      editingMessageId: null,
      showGroupCreateModal: false,
      availableUsers: [],
      selectedGroupMemberDetails: [],
      selectedGroupMembers: new Set(),
      userSearchTerm: '',
      showChatDetailsModal: false,
      newUserSearchTerm: '',
      newUserSearchResults: [],
      selectedNewUsers: new Map(),
      existingUserSearchTerm: '',
      filteredGroupMembers: [],
      uploadedPublicId: null,
      sharedGroups: [],
      updateGroupName: '',
      uploadedFileUrl: '',
      uploadedFileType: '',
      isDarkMode: false,
      isUploadingImageCreateGroup: false,
      updatePictureGroup: '',
      touchStartX: 0,
      touchStartY: 0,
      currentMessage: null,
      uploading: false,
      isImageZoomed: false,
      enlargedImageUrl: '',
      showImageModal: false
    };
    this.contextMenuRef = React.createRef();
  }


  componentDidMount() {
    // Connect to socket.io when the component mounts
    // const token = localStorage.getItem("token");
    const socket = io.connect(`${config.URL_CONNECT}`);   //   <==, { query: { token: token } } 
    this.setState({ socket: socket });

    socket.on('connect', () => {
      if (socket && socket.connected) {
        // Fetch user chats and setup socket listeners
        this.fetchUserChats();
        this.setupSocket();
      }
    });
    document.addEventListener('click', this.handleDocumentClick);
  }

  componentDidUpdate(prevProps, prevState) {
    // Check if messages have been updated
    const { messages, showScrollToBottomButton } = this.state;
    const user = JSON.parse(localStorage.getItem("user"));
    if (prevState.messages.length !== this.state.messages.length && messages && messages[messages.length - 1]?.senderUsername === user.username && !messages[messages.length - 1]?.systemMessage) {
      if (this.messagesListRef.current) {
        this.messagesListRef.current.scrollTop = this.messagesListRef.current.scrollHeight;
      }
    }
    else if (prevState.messages.length !== this.state.messages.length && messages && messages[messages.length - 1]?.senderUsername !== user.username && !messages[messages.length - 1]?.systemMessage && !showScrollToBottomButton) {
      if (this.messagesListRef.current) {
        this.messagesListRef.current.scrollTo({
          top: this.messagesListRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }


  componentWillUnmount() {
    // Disconnect from socket.io when the component unmounts
    const { socket } = this.state;
    if (socket && socket.connected) {
      socket.disconnect();
    }
    document.removeEventListener('click', this.handleDocumentClick);
  }



  setupSocket = async () => {
    const { socket } = this.state;
    let typingTimeout;

    const userData = JSON.parse(localStorage.getItem("user"));
    socket.emit('setup', userData);


    socket.on('connectedUsers', (users) => {
      const removeYourSelf = users.filter(id => id !== userData._id);
      this.setState({ onlineUsers: removeYourSelf });
    });

    socket.on('new message notification', this.handleNewMessageNotification);

    socket.on('message deleted for everyone', (data) => {
      this.setState(prevState => {
        const updatedContacts = prevState.contacts.map(contact => {
          if (contact._id === data.chatId && contact.lastMessage?._id === data.messageId) {
            return {
              ...contact,
              lastMessage: {
                ...contact.lastMessage,
                content: "This message has been deleted",
                deletedForEveryone: true
              }
            };
          }
          return contact;
        });

        let updatedFilteredContacts = prevState.filteredContacts;
        if (prevState.searchUsername.length > 0) {
          updatedFilteredContacts = updatedContacts.filter(contact =>
            contact.chatName.toLowerCase().includes(prevState.searchUsername.toLowerCase())
          );
        }

        return {
          messages: prevState.messages.map(message =>
            message._id === data.messageId ? { ...message, content: "This message has been deleted", deletedForEveryone: true } : message),
          contacts: updatedContacts,
          filteredContacts: updatedFilteredContacts
        };
      });
    });

    socket.on('message edited', (data) => {
      this.setState(prevState => ({
        messages: prevState.messages.map(message => message._id === data.messageId ? { ...message, content: data.newContent } : message)
      }));
    });

    socket.on('update last message', (updatedChat) => {
      this.handleUpdateLastMessage(updatedChat);
    });


    socket.on('typing', (result) => {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (this.state.selectedChat &&
        result.chatId === this.state.selectedChat._id &&
        currentUser._id !== result.userId) {
        this.setState({ userTyping: result.username });
      }
      clearTimeout(typingTimeout); // Clear any existing timeout
      typingTimeout = setTimeout(() => {
        this.setState({ userTyping: null }); // Clear typing status after a delay
      }, 3000); // Example timeout of 3 seconds
    });

    socket.on('stop typing', (result) => {
      if (this.state.selectedChat &&
        result.chatId === this.state.selectedChat._id &&
        this.state.userTyping === result.username) {
        this.setState({ userTyping: null });
      }
    });

    socket.on('alert message removed from group', (messageAlert) => {
      Swal.fire({
        title: 'Removed from Group!',
        text: messageAlert,
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Okay'
      });
    });

    socket.on('read messsages', (data) => {
      this.setState(prevState => {
        const updatedMessagesMap = new Map(data.map(msg => [msg._id, msg]));

        // Update the state only for those messages which are marked as read
        const updatedMessages = prevState.messages.map(message => {
          return updatedMessagesMap.get(message._id) || message;
        });

        return { messages: updatedMessages };
      });
    });



    socket.on('disconnect', () => {
      clearTimeout(typingTimeout); // Clear timeout on disconnect
      this.setState({ userTyping: null });
      console.log('User disconnected');
    });

    // Check if the event listeners are already set up
    if (!this.eventListenersSet) {
      socket.on('add new contact', (new_contact) => {
        this.handleAddNewContact(new_contact);
      });

      socket.on('added users group', ({ systemMessage, chat }) => {
        this.handleAddedUsersGroup(systemMessage, chat);
      });

      socket.on('deleted users group', ({ systemMessage, chat, removedUserId }) => {
        this.handleDeletedUsersGroup(systemMessage, chat, removedUserId);
      });

      socket.on('updated group name', ({ systemMessage, chat }) => {
        this.handleUpdatedGroupName(systemMessage, chat);
      });

      socket.on('update picture group', ({ systemMessage, chat }) => {
        this.handleUpdatedPictureGroup(systemMessage, chat);
      });

      socket.on('new group created', (newChat) => {
        this.handleNewGroupCreated(newChat);
      });

      socket.on('user left group', ({ systemMessage, chat }) => {
        this.handleUpdateChatUserLeft(systemMessage, chat);
      });


      socket.on('new message', this.handleNewMessage);


      // Set a flag to indicate that event listeners are set up
      this.eventListenersSet = true;
    }
  };

  handleUpdatedGroupName = (systemMessage, updatedChat) => {
    this.setState(prevState => {
      const updatedContacts = prevState.contacts.map(chat => {
        if (chat._id === updatedChat._id) {
          return { ...chat, chatName: updatedChat.chatName, lastMessage: systemMessage };
        }
        return chat;
      });

      let updatedMessages = prevState.messages;
      let updatedSelectedChat = prevState.selectedChat;

      // Update messages and selectedChat if the updated chat is currently selected
      if (prevState.selectedChat && prevState.selectedChat._id === updatedChat._id) {
        updatedSelectedChat = { ...prevState.selectedChat, chatName: updatedChat.chatName, lastMessage: systemMessage };
        updatedMessages = [...prevState.messages, systemMessage];
      }

      return {
        contacts: updatedContacts,
        selectedChat: updatedSelectedChat,
        messages: updatedMessages
      };
    });
  };

  handleUpdatedPictureGroup = (systemMessage, updatedChat) => {
    this.setState(prevState => {
      const updatedContacts = prevState.contacts.map(chat => {
        if (chat._id === updatedChat._id) {
          return { ...chat, groupPicture: updatedChat.groupPicture, lastMessage: systemMessage };
        }
        return chat;
      });

      let updatedMessages = prevState.messages;
      let updatedSelectedChat = prevState.selectedChat;

      // Update messages and selectedChat if the updated chat is currently selected
      if (prevState.selectedChat && prevState.selectedChat._id === updatedChat._id) {
        updatedSelectedChat = { ...prevState.selectedChat, groupPicture: updatedChat.groupPicture, lastMessage: systemMessage };
        updatedMessages = [...prevState.messages, systemMessage];
      }

      return {
        contacts: updatedContacts,
        selectedChat: updatedSelectedChat,
        messages: updatedMessages
      };
    });
  };

  handleAddedUsersGroup = (systemMessage, updatedChat) => {
    this.setState(prevState => {
      // Check if the updated chat is the currently selected chat
      if (prevState.selectedChat && prevState.selectedChat._id === updatedChat._id) {
        // Update the selectedChat with the latest details from updatedChat
        const updatedSelectedChat = { ...updatedChat, lastMessage: systemMessage };

        // Update the contacts list with the new chat details
        const updatedContacts = prevState.contacts.map(contact =>
          contact._id === updatedChat._id ? updatedSelectedChat : contact
        );

        // Add the system message to the existing messages
        const updatedMessages = [...prevState.messages, systemMessage];

        return {
          contacts: updatedContacts,
          selectedChat: updatedSelectedChat,
          messages: updatedMessages
        };
      } else {
        // If the updated chat is not the currently selected chat
        // Update only the contacts list
        const updatedContacts = prevState.contacts.some(contact => contact._id === updatedChat._id)
          ? prevState.contacts.map(contact =>
            contact._id === updatedChat._id ? { ...contact, lastMessage: systemMessage } : contact
          )
          : [...prevState.contacts, { ...updatedChat, lastMessage: systemMessage }];

        return {
          contacts: updatedContacts,
          messages: prevState.messages
        };
      }
    });
  }


  handleDeletedUsersGroup = (systemMessage, updatedChat, removedUserId) => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const { socket } = this.state;

    this.setState(prevState => {
      const isCurrentUserRemoved = currentUser._id === removedUserId;

      let updatedContacts, updatedSelectedChat, updatedMessages, updatedFilteredGroupMembers;

      if (isCurrentUserRemoved) {
        updatedContacts = prevState.contacts.filter(contact => contact._id !== updatedChat._id);

        // If the current user is inside the chat, remove them and emit 'leave chat' event
        if (prevState.selectedChat && prevState.selectedChat._id === updatedChat._id) {
          updatedSelectedChat = null;
          updatedMessages = [];
          updatedFilteredGroupMembers = [];
          socket.emit('leave chat', updatedChat._id);
        } else {
          updatedSelectedChat = prevState.selectedChat;
          updatedMessages = prevState.messages;
          updatedFilteredGroupMembers = prevState.filteredGroupMembers;
        }
      } else {
        updatedContacts = prevState.contacts.map(contact => {
          if (contact._id === updatedChat._id) {
            return { ...contact, users: updatedChat.users, lastMessage: systemMessage };
          }
          return contact;
        });

        if (prevState.selectedChat && prevState.selectedChat._id === updatedChat._id) {
          updatedFilteredGroupMembers = updatedChat.users;
          updatedMessages = [...prevState.messages, systemMessage];
          updatedSelectedChat = { ...prevState.selectedChat, ...updatedChat, lastMessage: systemMessage };
        } else {
          updatedSelectedChat = prevState.selectedChat;
          updatedMessages = prevState.messages;
          updatedFilteredGroupMembers = prevState.filteredGroupMembers;
        }
      }

      return {
        contacts: updatedContacts,
        selectedChat: updatedSelectedChat,
        messages: updatedMessages,
        filteredGroupMembers: updatedFilteredGroupMembers
      };
    });
  }



  handleNewGroupCreated = (newChat) => {
    this.setState(prevState => ({
      contacts: [newChat, ...prevState.contacts]
    }));
  };

  handleUpdateChatUserLeft = (systemMessage, updatedChat) => {
    this.setState(prevState => {
      // Update the contacts array with the new last message
      const updatedContacts = prevState.contacts.map(contact => {
        if (contact._id === systemMessage.chatId) {
          return { ...updatedChat, lastMessage: systemMessage };
        }
        return contact;
      });

      // Check if the system message is for the currently selected chat
      let updatedMessages = prevState.messages;
      let selectedChatUpdated = prevState.selectedChat;
      if (prevState.selectedChat && prevState.selectedChat._id === systemMessage.chatId) {
        updatedMessages = [...prevState.messages, systemMessage];
        selectedChatUpdated = { ...prevState.selectedChat, ...updatedChat };
      }

      return {
        contacts: updatedContacts,
        messages: updatedMessages,
        selectedChat: selectedChatUpdated
      };
    });
  }

  handleUpdateLastMessage = (updatedChat) => {
    this.setState(prevState => {
      // Update contacts with the new last message
      const updatedContacts = prevState.contacts.map(chat => {
        if (chat._id === updatedChat._id) {
          return { ...chat, lastMessage: updatedChat.lastMessage };
        }
        return chat;
      });

      // Prepare the state update object
      const newStateUpdate = { contacts: updatedContacts };

      // If there's an active search, update filteredContacts as well
      if (prevState.searchUsername.length > 0) {
        const updatedFilteredContacts = updatedContacts.filter(contact =>
          contact.chatName.toLowerCase().includes(prevState.searchUsername.toLowerCase())
        );
        newStateUpdate.filteredContacts = updatedFilteredContacts;
      }

      return newStateUpdate;
    });
  };



  handleMessageClick = (message) => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (message.senderUsername === currentUser.username && message.deletedForEveryone !== true) {
      this.setState({ selectedMessageId: message._id, showModal: true });
    }
  };

  // Function to close the modal
  handleCloseModal = () => {
    this.setState({ showModal: false });
  };

  handleTyping = () => {
    const { socket, selectedChat } = this.state;
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (socket && selectedChat) {
      socket.emit('typing', selectedChat._id, currentUser._id, currentUser.username);
    }
  };

  handleStopTyping = () => {
    const { socket, selectedChat } = this.state;
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (socket && selectedChat) {
      socket.emit('stop typing', selectedChat._id, currentUser._id, currentUser.username);
    }
  };


  handleNewMessageNotification = (data) => {
    if (this.state.selectedChat?._id !== data.chatId) {
      this.setState(prevState => {
        const newUnreadMessagesCount = { ...prevState.unreadMessagesCount };
        newUnreadMessagesCount[data.chatId] = data.count;
        return { unreadMessagesCount: newUnreadMessagesCount };
      });
    }
  };

  handleAddNewContact = (data) => {
    const { contacts, searchUsername, searchList } = this.state;
    const isNewContact = !contacts.some(contact => contact._id === data._id);
    if (isNewContact) {
      this.setState(prevState => {
        // Add the new contact to the contacts list
        const updatedContacts = [...prevState.contacts, data];

        let newState = { contacts: updatedContacts };

        // If there's an active search, update filteredContacts
        if (searchUsername.length > 0) {
          const isMatchingSearch = data.users.some(user =>
            user.username.toLowerCase().includes(searchUsername.toLowerCase())
          );
          // If it matches, also add it to the filteredContacts
          if (isMatchingSearch) {
            newState.filteredContacts = [...prevState.filteredContacts, data];
          }
        }

        // Remove the user from searchList if they are now a contact
        const updatedSearchList = searchList.filter(user =>
          !data.users.some(contactUser => contactUser._id === user._id)
        );
        newState.searchList = updatedSearchList;

        return newState;
      });
    }
  };




  fetchUserChats = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      const response = await axios.get(`http://localhost:8080/chats/${user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const chats = response.data.chats;
      this.setState({ contacts: chats, loading: false });
    } catch (error) {
      console.error('Error fetching user chats:', error);
      this.setState({ loading: false });
    }
  };


  handleContactClick = (chat) => {
    const { selectedChat, socket } = this.state;

    // Leave the current chat room (if any)
    if (selectedChat) {
      socket.emit('leave chat', selectedChat._id);
      this.resetUnreadCount(selectedChat._id);
    }

    socket.emit('join chat', chat._id);

    // Fetch chat messages after joining the new chat
    this.fetchChatMessages(chat._id);

    if (this.fileUploadRef.current) {
      this.fileUploadRef.current.resetPreview();
    }
    // Update the state to reflect the new selected chat
    this.setState({
      selectedChat: chat,
      newMessage: '',
      showScrollToBottomButton: false,
      isEditing: false,
      showEmojiPicker: false,
      editingMessageId: null,
      uploadedFileUrl: '',
      uploadedFileType: '',
      showChatDetailsModal: false
    }, () => {
      // Reset unread count for the selected chat
      this.resetUnreadCount(chat._id);
    });
  };


  fetchChatMessages = async (chatId, lastMessageId = null) => {
    const { socket, unreadMessagesCount } = this.state;

    let endpoint = `http://localhost:8080/message/getMessageByChatId/${chatId}`;

    // Calculate limit based on unread messages count
    const unreadCount = unreadMessagesCount[chatId] || 0;
    const limit = unreadCount > 20 ? unreadCount : 20;

    // Append query parameters as needed
    const queryParams = [];
    if (lastMessageId) queryParams.push(`lastMessageId=${lastMessageId}`);
    queryParams.push(`limit=${limit}`);
    if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data;
      socket.emit('read messsages', chatId, data);
      const fetchedMessages = response.data.messages;
      const currentScrollHeight = this.messagesListRef.current && this.messagesListRef.current.scrollHeight;
      this.setState(prevState => {
        const fetchedMessagesCount = fetchedMessages.length;
        const newFirstUnreadMessageIndex = lastMessageId
          ? prevState.firstUnreadMessageIndex + fetchedMessagesCount
          : fetchedMessagesCount - unreadCount;
        return {
          messages: lastMessageId ? [...fetchedMessages, ...prevState.messages] : fetchedMessages,
          hasMoreMessages: fetchedMessages.length === limit,
          loadingOlderMessages: false,
          firstUnreadMessageIndex: newFirstUnreadMessageIndex,
          unreadMessages: unreadCount
        }
      }, () => {
        if (lastMessageId) {
          if (this.messagesListRef.current) {
            // Adjust scroll to maintain position
            const newScrollHeight = this.messagesListRef.current.scrollHeight;
            this.messagesListRef.current.scrollTop = newScrollHeight - currentScrollHeight;
          }
        } else {
          if (unreadCount > 0) {
            if (this.messagesListRef.current) {
              const firstUnreadMessageIndex = fetchedMessages.length - unreadCount;
              const firstUnreadMessage = this.messagesListRef.current.children[firstUnreadMessageIndex];
              this.setState({ showUnreadTitle: true });
              if (firstUnreadMessage) {
                firstUnreadMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
          else {
            if (this.messagesListRef.current) {
              // Scroll to bottom for new messages
              this.messagesListRef.current.scrollTop = this.messagesListRef.current.scrollHeight;
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      this.setState({ loadingOlderMessages: false });
    }
  };

  handleScroll = () => {
    if (this.messagesListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = this.messagesListRef.current;

      if (scrollTop === 0 && this.state.hasMoreMessages && !this.state.loadingOlderMessages) {
        const oldestMessage = this.state.messages[0];
        if (oldestMessage) {
          this.setState({ loadingOlderMessages: true });
          this.fetchChatMessages(this.state.selectedChat._id, oldestMessage._id);
        }
      }
      if (this.messagesListRef.current && this.state.firstUnreadMessageIndex !== null) {
        const { scrollTop } = this.messagesListRef.current;
        const firstUnreadMessage = this.messagesListRef.current.children[this.state.firstUnreadMessageIndex];

        if (firstUnreadMessage && scrollTop > firstUnreadMessage.offsetTop) {
          this.setState({ showUnreadTitle: false });
        }
      }

      const bottom = scrollHeight - scrollTop - clientHeight;

      // Show the button when the user scrolls up and hide when at the bottom
      this.setState({ showScrollToBottomButton: bottom > 400 && scrollHeight > clientHeight });
    }
  };


  handleNewMessage = (newMessageReceived) => {
    const { selectedChat } = this.state;

    // Check if the message is for the currently selected chat
    if (selectedChat && selectedChat._id === newMessageReceived.chatId) {
      this.setState((prevState) => {
        const updatedMessages = [...prevState.messages, newMessageReceived];
        return { messages: updatedMessages };
      });
    }
  };



  handleSendMessage = async () => {
    const { selectedChat, newMessage, pendingChatRecipient, editingMessageId, isEditing, socket, uploadedFileUrl, uploadedFileType } = this.state;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!newMessage.trim() && !uploadedFileUrl) {
      return; // Exit if message is empty
    }

    if (isEditing && editingMessageId) {
      // Handle message editing
      try {
        await axios.put(`http://localhost:8080/message/editMessage/${editingMessageId}`,
          { content: newMessage },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        socket.emit('message edited', { chatId: selectedChat._id, messageId: editingMessageId, newContent: newMessage });

        this.setState(prevState => ({
          messages: prevState.messages.map(message => message._id === editingMessageId ? { ...message, content: newMessage } : message),
          newMessage: '',
          isEditing: false,
          editingMessageId: null
        }));

      } catch (error) {
        console.error('Error editing message:', error);
      }
    } else {

      let chatId = selectedChat ? selectedChat._id : null;

      // Create a new chat if there's a pending recipient and no selected chat
      if (!chatId && pendingChatRecipient) {
        try {
          const response = await axios.post(`http://localhost:8080/chats/createChat`,
            { recipientId: pendingChatRecipient },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const newChat = response.data.chat;
          chatId = newChat._id;
          socket.emit('join chat', chatId);

          this.setState(prevState => {

            // Remove the user from the searchList as they are now a contact
            const updatedSearchList = prevState.searchList.filter(user => user._id !== pendingChatRecipient);

            // Update state with the new chat
            return {
              selectedChat: newChat,
              contacts: [newChat, ...this.state.contacts],
              pendingChatRecipient: null,
              searchList: updatedSearchList
            };
          });
        }

        catch (error) {
          console.error('Error creating new chat:', error);
          return; // Exit if chat creation fails
        }
      }

      // Send the message
      try {
        const response = await axios.post('http://localhost:8080/message/sendMessage',
          { chatId, content: newMessage, fileUrl: uploadedFileUrl || null, fileType: uploadedFileType || null, senderUsername: user.username },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        socket.emit('new message', response.data.message);
        this.setState({ newMessage: '', uploadedFileUrl: '', uploadedFileType: '', showEmojiPicker: false });
        if (this.fileUploadRef.current) {
          this.fileUploadRef.current.resetPreview();
        }
      }
      catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }


  handleSearch = async (e) => {
    const searchTerm = e.target.value.trim();
    const token = localStorage.getItem("token");
    const currentUserID = JSON.parse(localStorage.getItem("user"))._id;

    this.setState({ searchUsername: searchTerm });

    // Filter existing contacts
    const filteredContacts = this.state.contacts.filter(contact =>
      (contact.isGroupChat && contact.chatName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contact.users.some(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
        user._id !== currentUserID
      )
    );

    if (searchTerm.length === 0) {
      this.setState({ searchList: [], filteredContacts: [] });
      return;
    }

    // Call the server API directly for new users
    try {
      const response = await axios.get(`http://localhost:8080/users/search/${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });


      const contactUserIds = new Set(this.state.contacts.flatMap(contact => contact.users.map(u => u._id)));
      const newUsers = response.data.results.filter(user => !contactUserIds.has(user._id));


      this.setState({ searchList: newUsers, filteredContacts });
    } catch (error) {
      console.error('Error searching for users:', error);
    }
  };


  handleCreateNewChat = (userId) => {
    const user = this.state.searchList.find(u => u._id === userId);
    if (!user) return; // Exit if user not found

    const tempChat = {
      _id: null, // Temporary placeholder ID
      isGroupChat: false,
      chatName: user.username, // Use username as the chat name
      users: [user] // Include the selected user in the users array
    };

    this.setState({
      selectedChat: tempChat,
      messages: [], // Start with no messages
      pendingChatRecipient: userId
    });
  };

  handleCloseChat = () => {
    const { selectedChat, socket } = this.state;

    // Leave the chat room and reset its unread count
    if (selectedChat) {
      socket.emit('leave chat', selectedChat._id);
      this.resetUnreadCount(selectedChat._id);
    }

    // Clear the selected chat in the state
    this.setState({
      selectedChat: null, messages: [],
      newMessage: '',
      showScrollToBottomButton: false,
      isEditing: false,
      showEmojiPicker: false,
      uploadedFileUrl: '',
      uploadedFileType: '',
      editingMessageId: null
    });

    if (this.fileUploadRef.current) {
      this.fileUploadRef.current.resetPreview();
    }
  };

  resetUnreadCount = (chatId) => {
    const userId = JSON.parse(localStorage.getItem("user"))._id;
    const token = localStorage.getItem("token");


    axios.post('http://localhost:8080/chats/resetUnreadCount', { chatId, userId }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(() => {
      // Update the unread message count in the state
      this.setState(prevState => ({
        unreadMessagesCount: {
          ...prevState.unreadMessagesCount,
          [chatId]: 0
        }
      }));
    }).catch(error => {
      console.error('Error resetting unread count:', error);
    });
  };


  scrollToBottom = () => {
    if (this.messagesListRef.current) {
      this.messagesListRef.current.scrollTo({
        top: this.messagesListRef.current.scrollHeight,
        behavior: 'smooth' // Smooth scroll
      });
    }
  };

  isDifferentDay = (message, previousMessage) => {
    if (!previousMessage) return true;

    const messageDate = new Date(message.timestamp);
    const previousMessageDate = new Date(previousMessage.timestamp);

    return messageDate.getDate() !== previousMessageDate.getDate() ||
      messageDate.getMonth() !== previousMessageDate.getMonth() ||
      messageDate.getFullYear() !== previousMessageDate.getFullYear();
  };

  formatDate = (timestamp) => {
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
        year: 'numeric'
      })
    }
  };

  deleteChat = async (chatId) => {
    const { socket } = this.state;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"))
    try {
      const response = await axios.post('http://localhost:8080/chats/deleteChat', { chatId }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const chat = response.data.chat;
      socket.emit('leave chat', chatId);

      if (chat && chat.isGroupChat) {
        socket.emit('left group', { chat, user });
      }

      this.setState(prevState => ({
        contacts: prevState.contacts.filter(contact => contact._id !== chatId),
        // Reset selectedChat if it's the one being deleted
        selectedChat: prevState.selectedChat && prevState.selectedChat._id === chatId ? null : prevState.selectedChat
      }));
    } catch (error) {
      console.error('Error deleting chat:', error.response ? error.response.data.error : error.message);
      // Handle errors appropriately
    }
  };


  deleteMessage = async (messageId, forEveryone) => {
    try {
      const { socket, selectedChat } = this.state;
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:8080/message/deleteMessage`,
        { messageId, deleteForEveryone: forEveryone },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (forEveryone) {
        this.setState(prevState => ({
          messages: prevState.messages.map(message =>
            message._id === messageId ? { ...message, content: "This message has been deleted" } : message),
          contextMenu: { isVisible: false }
        }));
        socket.emit('message deleted for everyone', { chatId: selectedChat._id, messageId });
      } else {
        this.setState(prevState => ({
          contacts: prevState.contacts.map(contact => {
            if (contact._id === selectedChat._id) {
              return {
                ...contact,
                lastMessage: contact.lastMessage._id === messageId ? {
                  ...contact.lastMessage,
                  content: "You deleted this message",
                  deletedForUsers: contact.lastMessage.deletedForUsers
                    ? [...contact.lastMessage.deletedForUsers, currentUser._id]
                    : [currentUser._id]
                } : contact.lastMessage
              };
            }
            return contact;
          }),
          messages: prevState.messages.filter(message => message._id !== messageId),
          contextMenu: { isVisible: false }
        }));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  handleContextMenu = (event, message) => {
    event.preventDefault();
    const contextMenuWidth = 150; // Approximate width of your context menu
    let posX = event.clientX - contextMenuWidth; // Calculate left position

    // Ensure the menu doesn't go off-screen
    if (posX < 0) {
      posX = 10; // A small buffer from the left edge of the window
    }
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const canEdit = message.senderUsername === currentUser.username && message.content && message.content.length > 0;
    // const canEdit = message.senderUsername === currentUser.username && !message.deletedForEveryone && (!message.readBy || message.readBy.length === 0);

    this.setState({
      contextMenu: {
        isVisible: true,
        posX: posX,
        posY: event.clientY,
        messageId: message._id,
        canEdit: canEdit,
        canDeleteForEveryone: !message.readBy || message.readBy.length === 0,
      },
      isContextMenuOpen: true,
    });
  };


  closeContextMenu = () => {
    this.setState({
      contextMenu: { ...this.state.contextMenu, isVisible: false },
      isContextMenuOpen: false
    });
  };


  handleDocumentClick = (event) => {
    // Close the context menu if the click is outside
    if (this.state.isContextMenuOpen &&
      this.contextMenuRef &&
      !this.contextMenuRef.current.contains(event.target)) {
      this.closeContextMenu();
    }
  };

  handleEditMessageFromContextMenu = () => {
    const messageToEdit = this.state.messages.find(m => m._id === this.state.contextMenu.messageId);
    if (messageToEdit) {
      this.setState({
        newMessage: messageToEdit.content,
        isEditing: true,
        editingMessageId: this.state.contextMenu.messageId,
        contextMenu: { isVisible: false }, // Close context menu
      });
    }
  };

  openGroupCreateModal = () => {
    this.setState({ showGroupCreateModal: true });
  }

  handleSearchInputChange = async (e) => {
    const searchTerm = e.target.value.trim();
    this.setState({ userSearchTerm: searchTerm });

    if (searchTerm.length === 0) {
      this.setState({ availableUsers: [] });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:8080/users/search/${searchTerm}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Check if the current input matches the search term when the response was received
      if (this.state.userSearchTerm === searchTerm) {
        this.setState({ availableUsers: response.data.results });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }



  handleMemberSelection = (event, userId) => {
    this.setState(prevState => {
      const newSelectedMembers = new Set(prevState.selectedGroupMembers);
      const newSelectedMemberDetails = [...prevState.selectedGroupMemberDetails];
      const userDetail = this.state.availableUsers.find(user => user._id === userId);

      if (event.target.checked) {
        newSelectedMembers.add(userId);
        if (userDetail) {
          newSelectedMemberDetails.push(userDetail);
        }
      } else {
        newSelectedMembers.delete(userId);
        const index = newSelectedMemberDetails.findIndex(user => user._id === userId);
        if (index > -1) {
          newSelectedMemberDetails.splice(index, 1);
        }
      }
      return {
        selectedGroupMembers: newSelectedMembers,
        selectedGroupMemberDetails: newSelectedMemberDetails
      };
    });
  }

  removeMember = (memberId) => {
    this.setState(prevState => {
      const newSelectedMembers = new Set(prevState.selectedGroupMembers);
      const newSelectedMemberDetails = prevState.selectedGroupMemberDetails.filter(user => user._id !== memberId);

      newSelectedMembers.delete(memberId);
      return {
        selectedGroupMembers: newSelectedMembers,
        selectedGroupMemberDetails: newSelectedMemberDetails
      };
    });
  }

  handleCloseModalForCreateGroup = () => {
    this.setState({
      showGroupCreateModal: false,
      newGroupName: '',
      newGroupPicture: '',
      showEmojiPickerForCreateGroup: false,
      selectedGroupMembers: new Set(),
      availableUsers: [],
      selectedGroupMemberDetails: [],
      userSearchTerm: ''
    });
  }

  handleCreateGroupSubmit = () => {
    const { newGroupName, newGroupPicture, selectedGroupMembers, socket } = this.state;
    const token = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user"));
    selectedGroupMembers.add(currentUser._id);
    const groupDetails = {
      chatName: newGroupName || "No group name",
      groupPicture: newGroupPicture || "https://res.cloudinary.com/dfa7zee9i/image/upload/v1715111941/anonymous-avatar_wcrklv_u0kzbb.png",
      members: Array.from(selectedGroupMembers),
    };

    axios.post('http://localhost:8080/chats/createGroup', groupDetails, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(response => {
        const newChat = response.data.chat;

        socket.emit('create new group', newChat, currentUser);

        this.setState(prevState => ({
          showGroupCreateModal: false,
        }));

        // Reset the form fields
        this.setState({
          newGroupName: '',
          newGroupPicture: '',
          selectedGroupMembers: new Set(),
          availableUsers: [],
          selectedGroupMemberDetails: [],
          userSearchTerm: ''
        });
      })
      .catch(error => {
        console.error('Error creating group chat:', error);
        // Handle error appropriately
      });
  }

  renderGroupCreateModal() {
    const filteredUsers = this.state.availableUsers.filter(user =>
      user.username.toLowerCase().includes(this.state.userSearchTerm.toLowerCase())
    );

    const { isUploadingImage } = this.state;

    return (
      <Modal className='model-create-group' show={this.state.showGroupCreateModal} onHide={this.handleCloseModalForCreateGroup} centered>
        <Modal.Header closeButton>
          <Modal.Title className="title-create-group">Create Group</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '450px', overflowY: 'auto' }}>
          <Form>
            <Form.Group controlId="groupChatName" style={{ marginBottom: '15px' }}>
              <Form.Label className="create-group-name">Group Name</Form.Label>
              <div className="container-update-chat-group-name-emoji">
                <button className="emoji-picker-button" type="button" style={{ border: '1px solid black' }} onClick={this.toggleEmojiPickerForCreateGroup}>😊</button>
                {this.state.showEmojiPickerForCreateGroup && (
                  <div className="emoji-picker-for-create-group">
                    <EmojiPicker height={400} width={300} previewConfig={{ showPreview: false }} emojiStyle={EmojiStyle.APPLE} onEmojiClick={this.onEmojiClickNewGroupName} />
                  </div>
                )}
                <Form.Control
                  type="text"
                  style={{ borderColor: '#ddd', borderRadius: '4px', padding: '0.375rem 0.75rem 0.375rem 0.75rem' }}
                  placeholder="Enter group name"
                  value={this.state.newGroupName}
                  onChange={(e) => this.setState({ newGroupName: e.target.value })}
                />
              </div>
            </Form.Group>
            <Form.Group style={{ marginBottom: '15px' }}>
              <Form.Label className="create-group-groupChatPicture" htmlFor="groupChatPicture" >
                Group Picture URL
              </Form.Label>
              <div>
                <Form.Control
                  type="file"
                  hidden
                  id="groupChatPicture"
                  onChange={this.handleFileChange}
                  accept="image/*"
                />
                <Button
                  as="label"
                  htmlFor="groupChatPicture"
                  style={{ backgroundColor: '#25D366', border: 'none' }}
                  className="mt-2"
                >
                  <i className="bi bi-cloud-plus-fill"></i> Upload Group Picture
                </Button>
              </div>
              {this.state.newGroupPicture && (
                <div style={{ position: 'relative', display: 'block', marginBottom: '10px', width: '100px' }}>
                  <img
                    src={this.state.newGroupPicture}
                    alt="Group"
                    style={{
                      width: '100px',
                      height: '100px',
                      display: 'block',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      marginTop: '10px',
                      boxShadow: '0px 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Button
                    onClick={this.deleteImageFromCloudinary}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '0 5px 0 0', // rounded corners only on the top right
                      backgroundColor: '#dc3545',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="bi bi-x"></i>
                  </Button>
                </div>
              )}
            </Form.Group>
            <Form.Group controlId="userSearch" style={{ marginBottom: '15px' }}>
              <Form.Label className="create-group-search-users">Search Users</Form.Label>
              <Form.Control
                type="search"
                placeholder="Enter username"
                style={{ borderColor: '#ddd', borderRadius: '4px' }}
                value={this.state.userSearchTerm}
                onChange={this.handleSearchInputChange}
              />
            </Form.Group>
            <div className="selected-members" style={{ backgroundColor: '#f2f2f2', padding: '10px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #ddd', overflow: 'hidden' }}>
              <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>Selected Members:</h5>
              <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
                {this.state.selectedGroupMemberDetails.map(member => (
                  <li key={member._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <img
                      src={member.profilePicture}
                      alt={member.username}
                      style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%' }}
                    />
                    <span style={{ flexGrow: 1, color: '#333' }}>{member.username}</span>
                    <button
                      onClick={() => this.removeMember(member._id)}
                      className="remove-member-btn"
                      style={{ backgroundColor: '#FF6347', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <Form.Group controlId="selectMembers" className="scrollable-container" style={{ maxHeight: '200px', overflowY: 'auto', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
              {filteredUsers.map(user => {
                return (
                  <div key={user._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <img
                      src={user.profilePicture}
                      alt={user.username}
                      style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%' }}
                    />
                    <Form.Check
                      key={user._id}
                      id={`checkbox-${user._id}`}
                      className="checkbox-user"
                      type="checkbox"
                      label={user.username}
                      onChange={(e) => this.handleMemberSelection(e, user._id)}
                      checked={this.state.selectedGroupMembers.has(user._id)}
                    />
                  </div>
                )
              })}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: 'space-around' }}>
          <Button variant="light" style={{ backgroundColor: '#CCC', borderColor: '#CCC' }} onClick={this.handleCloseModalForCreateGroup}>Close</Button>
          <Button variant="primary" className='button-create-group' style={{
            backgroundColor: '#25D366', borderColor: '#25D366', color: 'white', display: 'flex', justifyContent: 'center',
            alignItems: 'center'
          }} disabled={isUploadingImage} onClick={this.handleCreateGroupSubmit}> {isUploadingImage ? <i className="bi bi-arrow-clockwise spin-icon"></i> : "Create Group"}</Button>
        </Modal.Footer>
      </Modal>
    );
  }


  searchNewUsers = async (e) => {
    const searchTerm = e.target.value.trim();
    this.setState({ newUserSearchTerm: searchTerm });

    if (searchTerm.length === 0) {
      this.setState({ newUserSearchResults: [] });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:8080/users/search/${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const existingUserIds = new Set(this.state.selectedChat.users.map(u => u._id));
      const newUserSearchResults = response.data.results.filter(user => !existingUserIds.has(user._id));

      if (this.state.newUserSearchTerm === searchTerm) {
        this.setState({ newUserSearchResults });
      }
    } catch (error) {
      console.error('Error searching for new users:', error);
    }
  };

  toggleUserSelection = (user) => {
    this.setState(prevState => {
      const newSelected = new Map(prevState.selectedNewUsers);
      if (newSelected.has(user._id)) {
        newSelected.delete(user._id);
      } else {
        newSelected.set(user._id, user);
      }
      return { selectedNewUsers: newSelected };
    });
  };


  filterGroupMembers = (searchTerm) => {
    this.setState(prevState => {
      const filtered = prevState.selectedChat.users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { filteredGroupMembers: filtered };
    });
  };


  addSelectedUsersToGroup = async () => {
    const { selectedChat, selectedNewUsers, socket } = this.state;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    const chatId = selectedChat._id; // The ID of the current chat group

    if (selectedNewUsers.size === 0) {
      return;
    }

    // Prepare an array of user IDs
    const usersToAdd = Array.from(selectedNewUsers.keys());

    try {
      const response = await axios.put(`http://localhost:8080/chats/group/add-users`, {
        chatId: chatId,
        usersToAdd: usersToAdd
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const chat = response.data.chat;
      const usernames = Array.from(selectedNewUsers.values()).map(user => user.username);

      socket.emit('add-users-group', { chat, user, usernames });

      this.setState({
        selectedNewUsers: new Map(),
        newUserSearchTerm: '',
        newUserSearchResults: []
      });

    } catch (error) {
      console.error('Error adding users to group:', error);
      // Handle error appropriately
    }
  };

  removeUserFromGroup = async (user) => {
    const { selectedChat, socket } = this.state;
    const token = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user"))
    const chatId = selectedChat._id; // The ID of the current chat group

    try {
      const response = await axios.delete(`http://localhost:8080/chats/group/delete-users`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {  // Include the payload in the `data` property
          chatId: chatId,
          usersToDelete: [user._id]
        }
      });

      const chat = response.data.chat;


      socket.emit('delete-users-group', { chat, currentUser, user });

    } catch (error) {
      console.error('Error removing user from group:', error);
      // Handle error appropriately
    }
  };

  fetchSharedChatGroups = async (partnerId) => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(`http://localhost:8080/chats/group/shared-chat-groups?partnerId=${partnerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      this.setState({ sharedGroups: response.data.sharedGroups });
    } catch (error) {
      console.error('Error fetching shared chat groups:', error);
      // Handle error appropriately
    }
  };

  handleUpdateGroupName = async () => {
    const { selectedChat, updateGroupName, socket } = this.state;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (updateGroupName.length === 0) {
      return;
    }

    try {
      const response = await axios.put('http://localhost:8080/chats/renameGroup', {
        chatId: selectedChat._id,
        newGroupName: updateGroupName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const chat = response.data.chat;

      socket.emit('update group name', { chat, user, updateGroupName });

      // Update the chat name in the state
      this.setState({ updateGroupName: '' });

    } catch (error) {
      console.error('Error updating group name:', error);
      // Handle errors (e.g., show a notification to the user)
    }
  };

  handleUpdatePictureGroup = async () => {
    const { selectedChat, updatePictureGroup, socket } = this.state;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (updatePictureGroup.length === 0) {
      return;
    }

    try {
      const response = await axios.put('http://localhost:8080/chats/updateGroupPicture', {
        chatId: selectedChat._id,
        newGroupPicture: updatePictureGroup
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const chat = response.data.chat;

      socket.emit('update picture group', { chat, user, updatePictureGroup });

      // Update the chat name in the state
      this.setState({ updatePictureGroup: '' });

    } catch (error) {
      console.error('Error updating group name:', error);
      // Handle errors (e.g., show a notification to the user)
    }
  };


  renderChatDetailsModal = () => {
    const { showChatDetailsModal, selectedChat, newUserSearchTerm, newUserSearchResults,
      selectedNewUsers, existingUserSearchTerm, filteredGroupMembers, sharedGroups, isImageZoomed } = this.state;
    const currentUser = JSON.parse(localStorage.getItem("user"));


    // Function to render group members (used for both admin and non-admin view)
    const renderGroupMembers = (members) => {
      const membersToShow = existingUserSearchTerm ? filteredGroupMembers : selectedChat.users;

      // Show the "no results" message if there's a search term and the filtered list is empty
      if (existingUserSearchTerm && membersToShow.length === 0) {
        return <p>No group members found for this search.</p>;
      }

      return membersToShow.map(member => (
        <div key={member._id} style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '10px',
          backgroundColor: '#f0f0f0', // Light grey background
          padding: '5px', // Padding around the elements
          borderRadius: '10px' // Rounded corners
        }}>
          <img
            src={member.profilePicture}
            alt={member.username}
            style={{
              width: '30px',
              height: '30px',
              marginRight: '10px',
              borderRadius: '50%'
            }}
          />
          <span className="group-members" style={{ flexGrow: 1 }}>{member.username}</span>
          {
            currentUser._id === selectedChat.groupAdmin._id && currentUser._id !== member._id ? (
              <button
                onClick={() => this.removeUserFromGroup(member)}
                style={{
                  backgroundColor: '#FF6347', // Tomato red color
                  color: 'white', // White text
                  border: 'none',
                  borderRadius: '5px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  marginRight: '25px'
                }}>
                <i className="bi bi-trash3-fill"></i>
              </button>
            ) : currentUser._id === member._id ? (
              <span style={{ fontWeight: 'bold', marginRight: '25px', color: "black" }}>You</span>
            )
              : member._id === selectedChat.groupAdmin._id ?
                (
                  <span style={{ fontWeight: 'bold', marginRight: '25px', color: "black" }}>Admin</span>
                ) :
                (
                  <></>
                )
          }
        </div>
      ));
    };


    // Function to render new user search results (admin view)
    const renderNewUserSearchResults = () => {
      if (newUserSearchTerm && newUserSearchResults.length === 0) {
        return <p className="no-result-search-add-group">No results found for this search.</p>;
      }

      return newUserSearchResults.map(user => (
        <div key={user._id} style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '10px',
          maxWidth: '500px',
          padding: '5px',
          borderRadius: '5px',
          backgroundColor: '#f2f2f2',
          cursor: 'pointer',
          ':hover': {
            backgroundColor: '#e8e8e8'
          }
        }}>
          <img
            src={user.profilePicture}
            alt={user.username}
            style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%' }}
          />
          <span className="search-members-result" style={{ flexGrow: 1 }}>{user.username}</span>
          <input
            id={`checkbox-${user._id}`}
            type="checkbox"
            checked={selectedNewUsers.has(user._id)}
            onChange={() => this.toggleUserSelection(user)}
            style={{ accentColor: '#25D366' }}
          />
        </div>
      ));
    };




    const renderSelectedUsers = () => {
      return Array.from(this.state.selectedNewUsers.values()).map(user => (
        <div key={user._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <img
            src={user.profilePicture}
            alt={user.username}
            style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%' }}
          />
          <span style={{ marginRight: '50px', fontSize: '1.1em', color: '#333' }}>{user.username}</span>
          <button style={{
            backgroundColor: '#FF6347', // Tomato red color
            color: 'white', // White text
            border: 'none',
            borderRadius: '5px',
            padding: '5px 10px',
            cursor: 'pointer',
          }} onClick={() => this.toggleUserSelection(user)}><i className="bi bi-x"></i></button>
        </div>
      ));
    };


    if (!showChatDetailsModal || !selectedChat) return null;

    const isGroupChat = selectedChat.isGroupChat;
    const isAdmin = selectedChat.groupAdmin?._id === currentUser._id;
    const regexPattern = new RegExp(`${currentUser.username}\\s*and\\s*|\\s*and\\s*${currentUser.username}`, 'i');
    const modalProps = selectedChat.isGroupChat ? {
      size: "l",
      "aria-labelledby": "contained-modal-title-vcenter",
      centered: true
    } : { centered: true };


    return (
      <>
        <Modal className="modal-chat-details" show={showChatDetailsModal} onHide={() => this.setState({
          showChatDetailsModal: false, updateGroupName: '',
          newUserSearchTerm: '', newUserSearchResults: [], existingUserSearchTerm: '', showEmojiPickerForChatDetailsModal: false,
          updatePictureGroup: '', isUploadingImage: false, selectedNewUsers: new Map(), isImageZoomed: false
        })} {...modalProps}>
          <Modal.Header closeButton>
            <Modal.Title className="title-chat-details">
              {isGroupChat && selectedChat.groupPicture ? (
                <>
                  <img
                    src={selectedChat.groupPicture}
                    alt="Group"
                    onClick={() => {
                      this.setState({ isImageZoomed: true }); // Open zoomed image modal
                    }}
                    style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%', cursor: 'pointer' }}
                  />
                  <span>{selectedChat.chatName && selectedChat.chatName.length > 20
                    ? `${selectedChat.chatName.substring(0, 20)}...`
                    : selectedChat.chatName || 'Chat'}</span>
                </>
              ) : (<img onClick={() => {
                this.setState({ isImageZoomed: true }); // Open zoomed image modal
              }}
                src={selectedChat.users.find(user => user._id !== currentUser._id).profilePicture}
                alt={selectedChat.users.find(user => user._id !== currentUser._id).username}
                style={{ width: '50px', height: '50px', marginLeft: '15px', borderRadius: '50%', cursor: 'pointer' }}
              />)}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {isGroupChat ? (
              <>
                {/* Group Chat View */}
                {isAdmin && (
                  <>
                    <Form.Group>
                      <Form.Label>Group Name</Form.Label>
                      <div className="container-update-chat-group-name-emoji">
                        <button className="emoji-picker-button" style={{ border: '1px solid black' }} onClick={this.toggleEmojiPickerForChatDetailsModal}>😊</button>
                        {this.state.showEmojiPickerForChatDetailsModal && (
                          <div className="emoji-picker-for-modal-details">
                            <EmojiPicker height={400} width={300} previewConfig={{ showPreview: false }} emojiStyle={EmojiStyle.APPLE} onEmojiClick={this.onEmojiClickUpdateGroupName} />
                          </div>
                        )}
                        <Form.Control
                          type="text"
                          style={{ padding: '0.375rem 0.75rem 0.375rem 0.75rem' }}
                          placeholder="Enter new group name"
                          value={this.state.updateGroupName}
                          onChange={(e) => this.setState({ updateGroupName: e.target.value })} />
                      </div>
                    </Form.Group>
                    <Button
                      onClick={this.handleUpdateGroupName}
                      style={{ backgroundColor: '#25D366', borderColor: '#25D366', marginBottom: '15px' }}>
                      <i className="bi bi-pencil-fill"></i> Change Name
                    </Button>
                    <Form.Group style={{ marginBottom: '15px' }}>
                      <Form.Label className="update-groupChatPicture" htmlFor="updategroupChatPicture" >
                        Update Group Picture URL
                      </Form.Label>
                      {!this.state.updatePictureGroup ?
                        (<div>
                          <Form.Control
                            type="file"
                            hidden
                            id="updategroupChatPicture"
                            onChange={this.handleFileChangeToUpdatePictureGroup}
                            accept="image/*"
                          />
                          <Button
                            as="label"
                            htmlFor="updategroupChatPicture"
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              border: 'none',
                              maxWidth: '150px',
                              backgroundColor: '#25D366'
                            }}
                            disabled={this.state.isUploadingImage} // Disable if upload in progress
                          >
                            {this.state.isUploadingImage ? (
                              <i className="bi bi-arrow-clockwise spin-icon"></i>
                            ) : (
                              <>
                                <i className="bi bi-cloud-plus-fill"></i>&nbsp;Upload Group Picture
                              </>)}
                          </Button>
                        </div>)

                        : (
                          <>
                            <Button
                              as="label"
                              htmlFor="updategroupChatPicture"
                              style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                border: 'none',
                                maxWidth: '150px',
                                backgroundColor: '#25D366'
                              }}
                              onClick={this.handleUpdatePictureGroup}
                            >Update Picture</Button>
                            <div style={{ position: 'relative', display: 'block', marginBottom: '10px', width: '100px' }}>
                              <img
                                src={this.state.updatePictureGroup}
                                alt="Group"
                                style={{
                                  width: '100px',
                                  height: '100px',
                                  display: 'block',
                                  border: '1px solid #ddd',
                                  borderRadius: '5px',
                                  marginTop: '10px',
                                  boxShadow: '0px 2px 4px rgba(0,0,0,0.1)'
                                }}
                              />
                              <Button
                                onClick={this.deleteImageFromCloudinary}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  padding: '5px 10px',
                                  border: 'none',
                                  borderRadius: '0 5px 0 0', // rounded corners only on the top right
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  cursor: 'pointer'
                                }}
                              >
                                <i className="bi bi-x"></i>
                              </Button>
                            </div>
                          </>
                        )}
                    </Form.Group>
                    <Form.Group>
                      <Form.Label><i className="bi bi-search"></i> Search users</Form.Label>
                      <Form.Control
                        type="search"
                        placeholder="Search users to add"
                        value={newUserSearchTerm}
                        onChange={this.searchNewUsers}
                        style={{ marginBottom: '10px', maxWidth: '350px' }}
                      />
                    </Form.Group>
                    <h4 className="selected-users">Selected Users:</h4>
                    <div className="selected-members" style={{
                      maxHeight: '200px', backgroundColor: '#f2f2f2', padding: '10px',
                      borderRadius: '4px', marginBottom: '15px', border: '1px solid #ddd', overflow: 'auto',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      {renderSelectedUsers()}
                    </div>
                    <div className="scrollable-container" style={{
                      maxHeight: '200px', maxWidth: '400px', overflowY: 'auto', padding: '5px', border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}>{renderNewUserSearchResults()}</div>
                    <Button onClick={this.addSelectedUsersToGroup} style={{ backgroundColor: '#25D366', borderColor: '#25D366', marginBottom: '15px', marginTop: '15px' }}><i className="bi bi-person-fill-add"></i> Add Users</Button>
                    <hr />
                  </>
                )}
                <Form.Group>
                  <h4 style={{ fontWeight: 'bolder' }}>{selectedChat.users.length > 1 ? `${selectedChat.users.length} Members` :
                    `${selectedChat.users.length} Member`}
                  </h4>
                  <Form.Label>
                    <i className="bi bi-sort-down-alt"></i> Filter group members
                  </Form.Label>
                  <Form.Control
                    type="search"
                    placeholder="Filter group members"
                    value={existingUserSearchTerm}
                    style={{ marginBottom: '10px', maxWidth: '350px' }}
                    onChange={(e) => {
                      this.setState({ existingUserSearchTerm: e.target.value }, () => {
                        this.filterGroupMembers(e.target.value);
                      });
                    }}
                  />
                </Form.Group>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', maxWidth: '400px' }} >{renderGroupMembers(existingUserSearchTerm.length > 0 ? filteredGroupMembers : selectedChat.users)}</div>
              </>
            ) : (
              <div className="chat-container-modal-user">
                <div className="chat-header-modal-user">
                  <p className="chat-name">{selectedChat.chatName.replace(regexPattern, '')}</p>
                  <p className="user-status-modal-user">
                    <span className="status-text-modal-user">{selectedChat.users.find(user => user._id !== currentUser._id).status}</span>
                  </p>
                </div>
                <div className="shared-groups-container">
                  <h4 className="shared-groups-title">Shared Groups:</h4>
                  <div className="groups-list">
                    {sharedGroups && sharedGroups.length > 0 ? (
                      sharedGroups.map(group => (
                        <div key={group._id} className="group-item">
                          <img src={group.groupPicture} alt={group.chatName} className="group-image" />
                          <p className="group-name">{group.chatName}</p>
                        </div>
                      ))
                    ) : (
                      <p className="no-groups">No common groups found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal >

        {isImageZoomed && (
          <Modal
            show={isImageZoomed}
            onHide={() => {
              this.setState({ isImageZoomed: false }); // Close zoomed image modal
            }}
            centered
          >
            {isGroupChat && selectedChat.groupPicture ? (
              <img
                src={selectedChat.groupPicture}
                alt="Group"
                style={{ width: '100%', height: '100%' }}
                onClick={() => {
                  this.setState({ isImageZoomed: false }); // Close zoomed image modal
                }}
              />
            ) : (<img
              src={selectedChat.users.find(user => user._id !== currentUser._id).profilePicture}
              alt={selectedChat.users.find(user => user._id !== currentUser._id).username}
              style={{ width: '100%', height: '100%' }}
              onClick={() => {
                this.setState({ isImageZoomed: false }); // Close zoomed image modal
              }}
            />)}
          </Modal>
        )
        }
      </>
    );
  };

  handleExpandMessage = (messageId) => {
    this.setState(prevState => ({
      expandedMessages: {
        ...prevState.expandedMessages,
        [messageId]: !prevState.expandedMessages[messageId], // Toggle the state
      },
    }));
  };

  formatLastMessageTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);

    // Calculate the difference in milliseconds
    const diffMs = now - messageTime;

    // Convert the difference to minutes
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Convert the difference to hours
    const diffHours = Math.floor(diffMinutes / 60);

    // Convert the difference to days
    const diffDays = Math.floor(diffMinutes / (24 * 60));

    // Function to format date as dd/mm/yyyy
    const formatDate = (date) => {
      let day = date.getDate().toString().padStart(2, '0');
      let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0!
      let year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Return relative time based on the difference
    if (diffMinutes < 60) {
      // Display the time in a format like "5:30 PM"
      return messageTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffHours < 24 && messageTime.getDate() === now.getDate()) {
      return "Today";
    } else if (diffDays === 1 && messageTime.getDate() === now.getDate() - 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return daysOfWeek[messageTime.getDay()];
    } else {
      return formatDate(messageTime);
    }
  }


  toggleEmojiPicker = () => {
    this.setState({ showEmojiPicker: !this.state.showEmojiPicker });
  };

  toggleEmojiPickerForChatDetailsModal = () => {
    this.setState({ showEmojiPickerForChatDetailsModal: !this.state.showEmojiPickerForChatDetailsModal });
  }
  toggleEmojiPickerForCreateGroup = () => {
    this.setState({ showEmojiPickerForCreateGroup: !this.state.showEmojiPickerForCreateGroup });
  }


  onEmojiClick = (event, emojiObject) => {
    this.setState(prevState => ({
      newMessage: (prevState.newMessage || "") + event.emoji
    }));
  };

  onEmojiClickUpdateGroupName = (event, emojiObject) => {
    this.setState(prevState => ({
      updateGroupName: (prevState.updateGroupName || "") + event.emoji
    }));
  };

  onEmojiClickNewGroupName = (event, emojiObject) => {
    this.setState(prevState => ({
      newGroupName: (prevState.newGroupName || "") + event.emoji
    }));
  };




  handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert('Please upload a file.');
      return;
    }

    this.setState({ isUploadingImage: true });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);

    try {
      const response = await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, formData);
      this.setState({ newGroupPicture: response.data.secure_url, uploadedPublicId: response.data.public_id, isUploadingImage: false });
    } catch (error) {
      this.setState({ isUploadingImage: false });
      let errorMessage = 'Failed to upload file.';
      if (error.response && error.response.data && error.response.data.error.message.includes('File size too large')) {
        const maxAllowedSize = (10485760 / 1024 / 1024).toFixed(1);
        errorMessage = `The file size is too large. The maximum allowed size is ${maxAllowedSize} MB.`;
      }
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: errorMessage,
      });
    }
  };

  handleFileChangeToUpdatePictureGroup = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert('Please upload a file.');
      return;
    }

    this.setState({ isUploadingImage: true });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset);

    try {
      const response = await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, formData);
      this.setState({ updatePictureGroup: response.data.secure_url, uploadedPublicId: response.data.public_id, isUploadingImage: false });
    } catch (error) {
      this.setState({ updatePictureGroup: '', isUploadingImage: false, });
      let errorMessage = 'Failed to upload file.';
      if (error.response && error.response.data && error.response.data.error.message.includes('File size too large')) {
        const maxAllowedSize = (10485760 / 1024 / 1024).toFixed(1);
        errorMessage = `The file size is too large. The maximum allowed size is ${maxAllowedSize} MB.`;
      }
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: errorMessage,
      });
    }
  };

  deleteImageFromCloudinary = async () => {
    const publicId = this.state.uploadedPublicId;
    if (!publicId) return;

    const timestamp = new Date().getTime()
    const string = `public_id=${publicId}&timestamp=${timestamp}${config.YOUR_CLOUDINARY_API_SECRET}`
    const signature = await sha1(string)
    const formData = new FormData()
    formData.append("public_id", publicId)
    formData.append("signature", signature)
    formData.append("api_key", config.API_KEY)
    formData.append("timestamp", timestamp)
    await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, formData);
    this.setState({ newGroupPicture: '', uploadedPublicId: '', updatePictureGroup: '' });
  };


  onFileUpload = (fileUrl, fileType) => {
    this.setState({ uploadedFileUrl: fileUrl, uploadedFileType: fileType });
  };

  // Method to handle file upload cancellation
  onCancelUpload = async (uploadedPublicId, fileType) => {
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
    this.setState({ uploadedFileUrl: '', uploadedFileType: '' });
  };

  handleImageClick = (event, imageUrl) => {
    event.stopPropagation(); // Prevent the click from triggering parent event handlers
    this.enlargeImage(imageUrl);
  };

  enlargeImage = (imageUrl) => {
    // You can implement this to display the image in a modal or in an enlarged view
    this.setState({ enlargedImageUrl: imageUrl, showImageModal: true });
  };

  renderFileContent(message) {
    const isDocx = message.fileUrl.endsWith('.docx');
    const isPdf = message.fileUrl.endsWith('.pdf');
    const isTxt = message.fileUrl.endsWith('.txt');


    // Render PDF as an image and make it downloadable
    if (isPdf || isTxt) {
      return (
        <div className="pdf-preview-container">
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" download onClick={(e) => e.stopPropagation()}>
            <iframe title="PDF" src={message.fileUrl} alt="Uploaded-pdf" className="pdf-image">
            </iframe>
            <div className="hover-download-button">
              <i className="bi bi-download" style={{ marginRight: '5px' }}></i>
              <span>Preview</span>
            </div>
          </a>
        </div>
      );
    }

    // Render DOCX as a download button
    if (isDocx) {
      return (
        <div style={{ display: 'block' }}>
          <iframe
            title="Document Viewer"
            style={{ width: '100%', minHeight: '400px', border: 'none' }}
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(message.fileUrl)}`}
          ></iframe>
        </div>

      );
    }

    switch (message.fileType) {
      case 'image':
        return <img loading='lazy' src={message && message.fileUrl} alt="Uploaded-img" onClick={(event) => this.handleImageClick(event, message.fileUrl)} className="message-image" />;
      case 'video':
        return <video preload="none" src={message.fileUrl} controls className="message-video" />;
      default:
        return <iframe title="Other File" src={message.fileUrl} className="message-file-link" > </iframe>;
    }
  }

  toggleDarkMode = () => {
    this.setState({ isDarkMode: !this.state.isDarkMode });
  };


  handleTouchStart = (event, message) => {
    this.setState({
      touchStartX: event.touches[0].clientX,
      touchStartY: event.touches[0].clientY,
      currentMessage: message
    });
  }

  handleTouchEnd = (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    if (this.state.touchStartX - touchEndX > 50) {  // Swipe left threshold
      const syntheticEvent = {
        clientX: this.state.touchStartX,
        clientY: this.state.touchStartY,
        preventDefault: () => { }  // Mock preventDefault if necessary
      };
      this.handleContextMenu(syntheticEvent, this.state.currentMessage);
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !this.state.uploading) {
      e.preventDefault();  // Prevent the default action to avoid a new line in input
      this.handleSendMessage();  // Call your send message function
    }
  };

  render() {
    const { contacts, selectedChat, messages, newMessage, searchUsername, onlineUsers, searchList
      , unreadMessagesCount, userTyping, showModal, selectedMessageId, loadingOlderMessages,
      showUnreadTitle, firstUnreadMessageIndex, filteredContacts, unreadMessages, loading, showImageModal, enlargedImageUrl } = this.state;

    const currentUser = JSON.parse(localStorage.getItem("user"));
    const regexPattern = new RegExp(`${currentUser.username}\\s*and\\s*|\\s*and\\s*${currentUser.username}`, 'i');
    const selectedMessage = messages.find(message => message._id === selectedMessageId);

    const sortedContacts = contacts.slice().sort((a, b) => {
      const lastMessageA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() || 0 : 0;
      const lastMessageB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() || 0 : 0;
      return lastMessageB - lastMessageA;
    });



    return (
      <div className={`container ${this.state.isDarkMode ? 'dark-mode' : ''}`}>
        <div className="row">
          <CustomNavbar
            onToggleDarkMode={this.toggleDarkMode}
          />
        </div>
        <div className="row">
          <div className="col-lg-4 chat-list-panel">
            <div className="chat-list-header">
              <h3>Chats</h3>
              <div className="search-bar">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search..."
                  value={searchUsername}
                  onChange={(e) => this.handleSearch(e)}
                />
              </div>
            </div>
            <button className="create-group-btn" onClick={this.openGroupCreateModal}><i className="bi bi-people"></i> New Group</button>
            {this.renderGroupCreateModal()}
            <div className="chat-list">
              {searchUsername.length > 0 ? (
                <>
                  <h4 className='Existing-Contacts'>Existing Contacts</h4>
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map(contact => (
                      <div
                        key={contact._id}
                        onClick={() => this.handleContactClick(contact)}
                        className={`chat-list-item ${selectedChat && selectedChat._id === contact._id ? 'active' : ''}`}
                      >
                        <img
                          src={contact.isGroupChat ? contact.groupPicture : contact.users.find(user => user._id !== currentUser._id).profilePicture}
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
                                : contact.chatName.replace(regexPattern, '').length > 20
                                  ? `${contact.chatName.replace(regexPattern, '').substring(0, 20)}...`
                                  : contact.chatName.replace(regexPattern, '') || 'Chat'}
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
                        <div
                          className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'
                            }`}
                        >
                          {contact.lastMessage && this.formatLastMessageTime(contact.lastMessage.timestamp)}
                        </div>
                        {contact.isGroupChat ?
                          (<></>) :
                          (<span className={`status-indicator ${onlineUsers.includes(contact.users.find(user => user._id !== currentUser._id)._id) ? 'connect' : 'disconnect'
                            }`}
                          ></span>)
                        }
                      </div>
                    ))
                  ) : (
                    <p className='no-matching-contacts'>No matching contacts found.</p>
                  )}
                  <h4 className='other-users'>Other Users</h4>
                  {searchList.length > 0 ? (
                    searchList.map(user => (
                      <div
                        key={user._id}
                        onClick={() => this.handleCreateNewChat(user._id)}
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
                        <span className={`status-indicator ${onlineUsers.includes(user._id) ? 'connect' : 'disconnect'
                          }`}
                        ></span>
                      </div>
                    ))
                  ) : (
                    <p className='no-new-users-found'>No new users found.</p>
                  )}
                </>
              ) :

                loading ? (
                  <div className="loading-indicator"><p className="loader-contacts"></p></div> // Display loading indicator
                ) :

                  (sortedContacts.length > 0 ? (
                    sortedContacts.map((contact) => (
                      <div
                        key={contact._id}
                        onClick={() => this.handleContactClick(contact)}
                        className={`chat-list-item ${selectedChat === contact ? 'active' : ''
                          }`}
                      >
                        {contact.isGroupChat ? (
                          <React.Fragment>
                            <img
                              src={contact.groupPicture}
                              alt='groupPicture'
                              className="profile-image"
                            />
                            <div className="user-info">
                              <div className="username-container">
                                <span className="username">
                                  {contact.chatName && contact.chatName.length > 20
                                    ? `${contact.chatName.substring(0, 15)}...`
                                    : contact.chatName || 'Unnamed Group'}
                                </span>
                                {unreadMessagesCount[contact._id] > 0 && (
                                  <span className="unread-badge">
                                    {unreadMessagesCount[contact._id]}
                                  </span>
                                )}
                              </div>
                              <div className="last-message-preview">
                                {
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
                                    : "No messages yet"
                                }
                              </div>
                            </div>
                            <div
                              className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'
                                }`}
                            >
                              {contact.lastMessage && this.formatLastMessageTime(contact.lastMessage.timestamp)}
                            </div>
                          </React.Fragment>
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
                                    <span className="username">{user.username}
                                      {unreadMessagesCount[contact._id] > 0 && (
                                        <span className="unread-badge">
                                          {unreadMessagesCount[contact._id]}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="last-message-preview">
                                    {contact.lastMessage ?
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
                                <div
                                  className={`${unreadMessagesCount[contact._id] > 0 ? 'notification' : 'last-message-time'
                                    }`}
                                >
                                  {contact.lastMessage && this.formatLastMessageTime(contact.lastMessage.timestamp)}
                                </div>
                                <span className={`status-indicator ${onlineUsers.includes(user._id) ? 'connect' : 'disconnect'
                                  }`}
                                ></span>

                              </React.Fragment>
                            ))
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            this.deleteChat(contact._id);
                          }}
                          className="delete-chat-button"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    ))) : (<p className="no-contacts"> You have no contacts </p>)
                  )}
            </div>
          </div>
          <div className={`col-lg-8 chat-window-panel ${selectedChat ? 'show' : ''}`}>
            {selectedChat ? (
              <>
                <div className="chat-header" onClick={() => {
                  const partnerId = !selectedChat.isGroupChat && selectedChat.users.find(user => user._id !== currentUser._id)._id;
                  if (!selectedChat.isGroupChat) {
                    this.fetchSharedChatGroups(partnerId);
                  }
                  this.setState({ showChatDetailsModal: true });
                }}>
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
                        <img src='https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'
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

                  <button className="btn close-button" onClick={this.handleCloseChat}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                {this.state.showChatDetailsModal && (
                  this.renderChatDetailsModal()
                )}
                <div className="chat-window" ref={this.messagesListRef} onScroll={this.handleScroll}>
                  {loadingOlderMessages && (
                    <div className="loader-container">
                      <div className="neon-dot"></div>
                      <div className="neon-dot"></div>
                      <div className="neon-dot"></div>
                    </div>
                  )}


                  {messages && messages.map((message, index) => {
                    const showDateHeader = this.isDifferentDay(message, messages[index - 1]);
                    return (
                      <React.Fragment key={message._id}>
                        {showDateHeader && (

                          <div className={`date-header ${loadingOlderMessages ? 'hidden' : ''}`}>
                            {this.formatDate(message.timestamp)}
                          </div>

                        )}
                        {index === firstUnreadMessageIndex && showUnreadTitle && message.senderUsername !== currentUser.username && unreadMessages !== 0 && (
                          <div className="unread-messages-title"> Unread Messages ({unreadMessages})</div>
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
                            onClick={() => this.handleMessageClick(message)}
                            onTouchStart={message.senderUsername === currentUser.username && !message.deletedForEveryone ? (e) => this.handleTouchStart(e, message) : null}
                            onTouchEnd={message.senderUsername === currentUser.username && !message.deletedForEveryone ? this.handleTouchEnd : null}
                            onContextMenu={message.senderUsername === currentUser.username && !message.deletedForEveryone ? (e) => this.handleContextMenu(e, message) : null}
                          >

                            <div className="message-content">{
                              message.senderUsername === currentUser.username && message.deletedForEveryone
                                ? "You deleted this message"
                                : message.deletedForEveryone
                                  ? "This message has been deleted"
                                  : <>
                                    {message.fileUrl && this.renderFileContent(message)}

                                    {(message.content && message.content.length > 100 && !this.state.expandedMessages[message._id])
                                      ? <>
                                        {`${message.content.substring(0, 100)}... `}
                                        <span className="read-more" onClick={(e) => {
                                          e.stopPropagation();
                                          this.handleExpandMessage(message._id);
                                        }}>
                                          Read More
                                        </span>
                                      </>
                                      : (message.content.length > 100 && this.state.expandedMessages[message._id])
                                        ? <>
                                          {message.content} {/* Show full message */}
                                          <span className="read-more" onClick={(e) => {
                                            e.stopPropagation();
                                            this.handleExpandMessage(message._id);
                                          }}>
                                            Read Less
                                          </span>
                                        </>
                                        : message.content
                                    }
                                  </>
                            }</div>

                            <div className="message-time">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {this.state.showScrollToBottomButton && (
                    <button
                      className="scroll-to-bottom-btn"
                      onClick={this.scrollToBottom}
                    >
                      <i className="bi bi-arrow-down-circle"></i>
                    </button>
                  )}
                </div>
                {showModal && (
                  <Modal show={showModal} className="modal-readBy" onHide={this.handleCloseModal} centered>
                    <Modal.Header className="modal-readBy-header" closeButton>
                      <Modal.Title>Read By</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      {selectedMessage && selectedMessage.readBy.map(read => (
                        <div key={read._id} className="reader-info">
                          <img src={read.readerId.profilePicture} alt={read.readerId.username} />
                          <div className="username-readBy">{read.readerId.username}</div>
                          <div className="read-time">
                            {new Date(read.readAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </Modal.Body>
                    <Modal.Footer className="modal-readBy-footer">
                      <button className="btn-close-modal-readBy"
                        onClick={this.handleCloseModal}>Close</button>
                    </Modal.Footer>
                  </Modal>
                )}

                {showImageModal && (
                  <Modal className="transparent-modal" show={showImageModal} onHide={() => this.setState({ showImageModal: false })} size="lg" centered>
                    <Modal.Body>
                      <img src={enlargedImageUrl} onClick={() => this.setState({ showImageModal: false })} alt="Enlarged" style={{ width: '100%' }} />
                    </Modal.Body>
                  </Modal>
                )}

                {userTyping && (
                  <div className="typing-indicator">
                    {userTyping} is typing...
                  </div>
                )}
                <div className="message-input-area">
                  {this.state.showEmojiPicker && (
                    <div className="emoji-picker">
                      <EmojiPicker height={400} width={300} previewConfig={{ showPreview: false }} emojiStyle={EmojiStyle.APPLE} onEmojiClick={this.onEmojiClick} />
                    </div>
                  )}
                  <button className="emoji-text-area"
                    onClick={this.toggleEmojiPicker}>😊</button>
                  <FileUploadComponent
                    ref={this.fileUploadRef}
                    onFileUpload={this.onFileUpload}
                    onCancelUpload={this.onCancelUpload}
                    setUploading={(uploading) => this.setState({ uploading })}
                  />
                  <textarea
                    className="form-control"
                    placeholder={this.state.isEditing ? "Editing message..." : "Type a message..."}
                    value={newMessage}
                    onChange={(e) => this.setState({ newMessage: e.target.value })}
                    onInput={() => this.handleTyping()}
                    onBlur={() => this.handleStopTyping()}
                    onKeyPress={this.handleKeyPress}
                  ></textarea>
                  <button
                    disabled={this.state.uploading}
                    className="send-btn"
                    onClick={this.handleSendMessage}>
                    {this.state.isEditing ? <><i className="bi bi-pencil"></i><span className="text-for-phone"> Edit</span></> : <><i className="bi bi-send"></i>
                      <span className="text-for-phone">Send</span> </>
                    }
                  </button>
                </div>
              </>
            ) : (
              <div className="no-chat-selected">Select a chat to start messaging</div>
            )}
            {this.state.contextMenu.isVisible && (
              <div
                ref={this.contextMenuRef}
                className="context-menu"
                style={{ top: this.state.contextMenu.posY, left: this.state.contextMenu.posX }}
                onClick={this.closeContextMenu}
              >
                {this.state.contextMenu.canEdit && (
                  <div onClick={this.handleEditMessageFromContextMenu}>Edit Message</div>
                )}
                <div onClick={() => this.deleteMessage(this.state.contextMenu.messageId, false)}>Delete for Me</div>
                {this.state.contextMenu.canDeleteForEveryone && (
                  <div style={{ color: '#dc3545' }} onClick={() => this.deleteMessage(this.state.contextMenu.messageId, true)}>Delete for Everyone</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default Chat;
