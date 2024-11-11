import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import { sha1 } from 'crypto-hash';
import { useDarkMode } from '../DarkModeContext';
import config from "./config/default.json";
import axios from "axios";
import './ChatDetailsModal.css';

const ChatDetailsModal = ({ showChatDetailsModal, selectedChat, setShowChatDetailsModal, updatedChat,
    sharedGroups, setSharedGroups, socket }) => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem("token");
    const [updateGroupName, setUpdateGroupName] = useState('');
    const [newUserSearchTerm, setNewUserSearchTerm] = useState('');
    const [newUserSearchResults, setNewUserSearchResults] = useState([]);
    const [existingUserSearchTerm, setExistingUserSearchTerm] = useState('');
    const [showEmojiPickerForChatDetailsModal, setShowEmojiPickerForChatDetailsModal] = useState(false);
    const [updatePictureGroup, setUpdatePictureGroup] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [selectedNewUsers, setSelectedNewUsers] = useState(new Map());
    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const [filteredGroupMembers, setFilteredGroupMembers] = useState([]);

    const regexPattern = new RegExp(`${currentUser.username}\\s*and\\s*|\\s*and\\s*${currentUser.username}`, 'i');
    const isGroupChat = selectedChat?.isGroupChat;
    const isAdmin = selectedChat?.groupAdmin?._id === currentUser._id;

    const { isDarkMode } = useDarkMode();

    useEffect(() => {
        if (updatedChat && existingUserSearchTerm) {
            const filteredMembers = updatedChat.users.filter(user =>
                user.username.toLowerCase().includes(existingUserSearchTerm.toLowerCase())
            );
            setFilteredGroupMembers(filteredMembers);
        } else if (updatedChat) {
            setFilteredGroupMembers(updatedChat.users);
        }
    }, [updatedChat, existingUserSearchTerm]);




    const toggleUserSelection = (user) => {
        setSelectedNewUsers((prevSelectedNewUsers) => {
            const newSelectedUsers = new Map(prevSelectedNewUsers);
            if (newSelectedUsers.has(user._id)) {
                newSelectedUsers.delete(user._id);
            } else {
                newSelectedUsers.set(user._id, user);
            }
            return newSelectedUsers;
        });
    };

    const handleFileChangeToUpdatePictureGroup = async (event) => {
        const file = event.target.files[0];
        if (!file) {
            alert('Please upload a file.');
            return;
        }

        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', `${config.uploadPreset}`);

        try {
            const response = await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, formData);
            setUpdatePictureGroup(response.data.secure_url);
            setIsUploadingImage(false);
        } catch (error) {
            setIsUploadingImage(false);
            alert('Failed to upload file.');
        }
    };

    const handleUpdateGroupName = async () => {
        const user = currentUser;

        if (updateGroupName.length === 0) {
            return;
        }

        try {
            const response = await axios.put(`${config.URL_CONNECT}/chats/renameGroup`, {
                chatId: selectedChat._id,
                newGroupName: updateGroupName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const chat = response.data.chat;

            socket.emit('update group name', { chat, user, updateGroupName });

            setUpdateGroupName('');

        } catch (error) {
            console.error('Error updating group name:', error);
            // Handle errors (e.g., show a notification to the user)
        }
    };

    const handleUpdatePictureGroup = async () => {
        const user = currentUser;

        if (updatePictureGroup.length === 0) {
            return;
        }

        try {
            const response = await axios.put(`${config.URL_CONNECT}/chats/updateGroupPicture`, {
                chatId: selectedChat._id,
                newGroupPicture: updatePictureGroup
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const chat = response.data.chat;

            socket.emit('update picture group', { chat, user, updatePictureGroup });

            setUpdatePictureGroup('');

        } catch (error) {
            console.error('Error updating group picture:', error);
            // Handle errors (e.g., show a notification to the user)
        }
    };

    const addSelectedUsersToGroup = async () => {
        const user = currentUser;
        const chatId = selectedChat._id; // The ID of the current chat group

        if (selectedNewUsers.size === 0) {
            return;
        }

        // Prepare an array of user IDs
        const usersToAdd = Array.from(selectedNewUsers.keys());

        try {
            const response = await axios.put(`${config.URL_CONNECT}/chats/group/add-users`, {
                chatId: chatId,
                usersToAdd: usersToAdd
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const chat = response.data.chat;
            const usernames = Array.from(selectedNewUsers.values()).map(user => user.username);

            socket.emit('add-users-group', { chat, user, usernames });

            setSelectedNewUsers(new Map());
            setNewUserSearchTerm('');
            setNewUserSearchResults([]);

        } catch (error) {
            console.error('Error adding users to group:', error);
            // Handle error appropriately
        }
    };

    const removeUserFromGroup = async (user) => {
        const token = localStorage.getItem("token");
        const currentUser = JSON.parse(localStorage.getItem("user"));
        const chatId = selectedChat._id; // The ID of the current chat group

        try {
            const response = await axios.delete(`${config.URL_CONNECT}/chats/group/delete-users`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { // Include the payload in the `data` property
                    chatId: chatId,
                    usersToDelete: [user._id]
                }
            });

            const chat = response.data.chat;

            socket.emit('delete-users-group', { chat, currentUser, user });

        } catch (error) {
            console.error('Error removing user from group:', error);
            // Handle errors appropriately
        }
    };

    const deleteImageFromCloudinary = async () => {
        const publicId = updatePictureGroup.split('/').slice(-1)[0].split('.')[0];
        if (!publicId) return;

        const timestamp = new Date().getTime();
        const string = `public_id=${publicId}&timestamp=${timestamp}${config.YOUR_CLOUDINARY_API_SECRET}`;
        const signature = await sha1(string);
        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("signature", signature);
        formData.append("api_key", config.API_KEY);
        formData.append("timestamp", timestamp);

        try {
            await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, formData);
            setUpdatePictureGroup('');
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const renderSelectedUsers = () => {
        return Array.from(selectedNewUsers.values()).map(user => (
            <div key={user._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <img
                    src={user.profilePicture}
                    alt={user.username}
                    style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%' }}
                />
                <span style={{ marginRight: '50px', fontSize: '1.1em', color: '#333' }}>{user.username.length > 30 ?
                    (`${user.username.substring(0, 25)}...`) : (user.username)}</span>
                <button style={{
                    backgroundColor: '#FF6347',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '5px 10px',
                    cursor: 'pointer',
                }} onClick={() => toggleUserSelection(user)}><i className="bi bi-x"></i></button>
            </div>
        ));
    };

    const renderGroupMembers = (members) => {
        const membersToShow = existingUserSearchTerm ? filteredGroupMembers : selectedChat.users;

        if (existingUserSearchTerm && membersToShow.length === 0) {
            return <p>No group members found for this search.</p>;
        }

        return membersToShow.map(member => (
            <div key={member._id} style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '10px',
                backgroundColor: '#f0f0f0',
                padding: '5px',
                borderRadius: '10px'
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
                <span className="group-members" style={{ flexGrow: 1 }}>{member.username.length > 30 ?
                    (`${member.username.substring(0, 25)}...`) : (member.username)}</span>
                {currentUser._id === selectedChat.groupAdmin._id && currentUser._id !== member._id ? (
                    <button
                        onClick={() => removeUserFromGroup(member)}
                        style={{
                            backgroundColor: '#FF6347',
                            color: 'white',
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
                ) : member._id === selectedChat.groupAdmin._id ? (
                    <span style={{ fontWeight: 'bold', marginRight: '25px', color: "black" }}>Admin</span>
                ) : null}
            </div>
        ));
    };

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
                <span className="search-members-result" onClick={() => toggleUserSelection(user)} style={{ flexGrow: 1 }}>{user.username.length > 30 ?
                    (`${user.username.substring(0, 25)}...`) : (user.username)}</span>
                <input
                    id={`checkbox-${user._id}`}
                    type="checkbox"
                    checked={selectedNewUsers.has(user._id)}
                    onChange={() => toggleUserSelection(user)}
                    style={{ accentColor: '#25D366' }}
                />
            </div>
        ));
    };

    const filterGroupMembers = (searchTerm) => {
        const filtered = selectedChat.users.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredGroupMembers(filtered);
    };

    const searchNewUsers = async (e) => {
        const searchTerm = e.target.value.trim();
        setNewUserSearchTerm(searchTerm);

        if (searchTerm.length === 0) {
            setNewUserSearchResults([]);
            return;
        }

        try {
            const response = await axios.get(`${config.URL_CONNECT}/users/search/${searchTerm}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (searchTerm === e.target.value.trim()) {
                setNewUserSearchResults(response.data.results);
            }
        } catch (error) {
            console.error('Error searching for users:', error);
        }
    };

    const onEmojiClickUpdateGroupName = (event) => {
        setUpdateGroupName(prevGroupName => (prevGroupName || "") + event.emoji);
    };

    if (!showChatDetailsModal || !selectedChat) return null;

    const modalProps = isGroupChat ? {
        size: "l",
        "aria-labelledby": "contained-modal-title-vcenter",
        centered: true
    } : { centered: true };

    return (
        <>
            <Modal className={`modal-chat-details ${isDarkMode ? 'dark-mode' : ''}`} show={showChatDetailsModal} onHide={() => {
                setShowChatDetailsModal(false);
                setUpdateGroupName('');
                setNewUserSearchTerm('');
                setNewUserSearchResults([]);
                setExistingUserSearchTerm('');
                setShowEmojiPickerForChatDetailsModal(false);
                setUpdatePictureGroup('');
                setIsUploadingImage(false);
                setSelectedNewUsers(new Map());
                setIsImageZoomed(false);
                setSharedGroups([]);
            }} {...modalProps}>
                <Modal.Header closeButton>
                    <Modal.Title className="title-chat-details">
                        {isGroupChat && selectedChat.groupPicture ? (
                            <>
                                <img
                                    src={selectedChat.groupPicture}
                                    alt="Group"
                                    onClick={() => setIsImageZoomed(true)}
                                    style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%', cursor: 'pointer' }}
                                />
                                <span>{selectedChat.chatName && selectedChat.chatName.length > 20
                                    ? `${selectedChat.chatName.substring(0, 20)}...`
                                    : selectedChat.chatName || 'Chat'}</span>
                            </>
                        ) : (
                            <img
                                onClick={() => setIsImageZoomed(true)}
                                src={selectedChat.users.find(user => user._id !== currentUser._id).profilePicture}
                                alt={selectedChat.users.find(user => user._id !== currentUser._id).username}
                                style={{ width: '50px', height: '50px', marginLeft: '15px', borderRadius: '50%', cursor: 'pointer' }}
                            />
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {isGroupChat ? (
                        <>
                            {isAdmin && (
                                <>
                                    <Form.Group>
                                        <Form.Label>Group Name</Form.Label>
                                        <div className="container-update-chat-group-name-emoji">
                                            <button className="emoji-picker-button" style={{ border: '1px solid black' }} onClick={() => setShowEmojiPickerForChatDetailsModal(!showEmojiPickerForChatDetailsModal)}>😊</button>
                                            {showEmojiPickerForChatDetailsModal && (
                                                <div className="emoji-picker-for-modal-details">
                                                    <EmojiPicker height={400} width={300} previewConfig={{ showPreview: false }} emojiStyle={EmojiStyle.APPLE} onEmojiClick={onEmojiClickUpdateGroupName} />
                                                </div>
                                            )}
                                            <Form.Control
                                                type="text"
                                                style={{ padding: '0.375rem 0.75rem 0.375rem 0.75rem' }}
                                                placeholder="Enter new group name"
                                                value={updateGroupName}
                                                onChange={(e) => setUpdateGroupName(e.target.value)} />
                                        </div>
                                    </Form.Group>
                                    <Button
                                        onClick={handleUpdateGroupName}
                                        style={{ backgroundColor: '#25D366', borderColor: '#25D366', marginBottom: '15px' }}>
                                        <i className="bi bi-pencil-fill"></i> Change Name
                                    </Button>
                                    <Form.Group style={{ marginBottom: '15px' }}>
                                        <Form.Label className="update-groupChatPicture" htmlFor="updategroupChatPicture" >
                                            Update Group Picture URL
                                        </Form.Label>
                                        {!updatePictureGroup ? (
                                            <div>
                                                <Form.Control
                                                    type="file"
                                                    hidden
                                                    id="updategroupChatPicture"
                                                    onChange={handleFileChangeToUpdatePictureGroup}
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
                                                    disabled={isUploadingImage}
                                                >
                                                    {isUploadingImage ? (
                                                        <i className="bi bi-arrow-clockwise spin-icon"></i>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-cloud-plus-fill"></i>&nbsp;Upload Group Picture
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
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
                                                    onClick={handleUpdatePictureGroup}
                                                >Update Picture</Button>
                                                <div style={{ position: 'relative', display: 'block', marginBottom: '10px', width: '100px' }}>
                                                    <img
                                                        src={updatePictureGroup}
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
                                                        onClick={deleteImageFromCloudinary}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            right: 0,
                                                            padding: '5px 10px',
                                                            border: 'none',
                                                            borderRadius: '0 5px 0 0',
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
                                            onChange={searchNewUsers}
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
                                    <Button onClick={addSelectedUsersToGroup} style={{ backgroundColor: '#25D366', borderColor: '#25D366', marginBottom: '15px', marginTop: '15px' }}><i className="bi bi-person-fill-add"></i> Add Users</Button>
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
                                        setExistingUserSearchTerm(e.target.value);
                                        filterGroupMembers(e.target.value);
                                    }}
                                />
                            </Form.Group>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', maxWidth: '400px' }} >{renderGroupMembers(existingUserSearchTerm.length > 0 ? filteredGroupMembers : selectedChat.users)}</div>
                        </>
                    ) : (
                        <div className="chat-container-modal-user">
                            <div className="chat-header-modal-user">
                                <p className="chat-name">{
                                    selectedChat.chatName.length > 20 ? (
                                        `${selectedChat.chatName.replace(regexPattern, '').substring(0, 15)}...`) : selectedChat.chatName.replace(regexPattern, '')}</p>
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
                                                <p className="group-name">{group.chatName.length > 20 ? (`${group.chatName.substring(0, 15)}...`) : (group.chatName)}</p>
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
            </Modal>

            {isImageZoomed && (
                <Modal
                    show={isImageZoomed}
                    onHide={() => setIsImageZoomed(false)}
                    centered
                >
                    {isGroupChat && selectedChat.groupPicture ? (
                        <img
                            src={selectedChat.groupPicture}
                            alt="Group"
                            style={{ width: '100%', height: '100%' }}
                            onClick={() => setIsImageZoomed(false)}
                        />
                    ) : (
                        <img
                            src={selectedChat.users.find(user => user._id !== currentUser._id).profilePicture}
                            alt={selectedChat.users.find(user => user._id !== currentUser._id).username}
                            style={{ width: '100%', height: '100%' }}
                            onClick={() => setIsImageZoomed(false)}
                        />
                    )}
                </Modal>
            )}
        </>
    );
};

export default ChatDetailsModal;
