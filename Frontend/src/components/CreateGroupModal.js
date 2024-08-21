import React, { useState } from "react";
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import { Modal, Button, Form } from 'react-bootstrap';
import { sha1 } from 'crypto-hash';
import Swal from 'sweetalert2';
import axios from "axios";
import config from './config/default.json';
import { useDarkMode } from '../DarkModeContext';
import './CreateGroupModal.css';


function CreateGroupModal({ setShowGroupCreateModal, showGroupCreateModal, socket }) {

    const [groupName, setGroupName] = useState('');
    const [newGroupPicture, setNewGroupPicture] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedGroupMembers, setSelectedGroupMembers] = useState(new Set());
    const [selectedGroupMemberDetails, setSelectedGroupMemberDetails] = useState([]);

    const { isDarkMode } = useDarkMode();

    const handleClose = () => setShowGroupCreateModal(false);


    const handleEmojiClick = (event) => {
        setGroupName(prevGroupName => (prevGroupName || "") + event.emoji);
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
            alert('Please upload a file.');
            return;
        }

        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', config.uploadPreset);

        try {
            const response = await axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, formData);
            setNewGroupPicture(response.data.secure_url);
            setIsUploadingImage(false);
        } catch (error) {
            setIsUploadingImage(false);
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

    const deleteImageFromCloudinary = async () => {
        const publicId = newGroupPicture.split('/').slice(-1)[0].split('.')[0];
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
            setNewGroupPicture('');
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const handleSearchInputChange = async (e) => {
        const searchTerm = e.target.value.trim();
        setUserSearchTerm(searchTerm);

        if (searchTerm.length === 0) {
            setAvailableUsers([]);
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`${config.URL_CONNECT}/users/search/${searchTerm}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (searchTerm === e.target.value.trim()) {
                setAvailableUsers(response.data.results);
            }
        } catch (error) {
            console.error('Error searching for users:', error);
        }
    };

    const removeMember = (memberId) => {
        setSelectedGroupMembers(prevSelectedMembers => {
            const newSelectedMembers = new Set(prevSelectedMembers);
            newSelectedMembers.delete(memberId);
            return newSelectedMembers;
        });

        setSelectedGroupMemberDetails(prevDetails =>
            prevDetails.filter(user => user._id !== memberId)
        );
    };

    const handleMemberSelection = (event, userId) => {
        const userDetail = availableUsers.find(user => user._id === userId);
        if (!userDetail) return;

        setSelectedGroupMembers(prevSelectedMembers => {
            const newSelectedMembers = new Set(prevSelectedMembers);
            if (event.target.checked) {
                newSelectedMembers.add(userId);
            } else {
                newSelectedMembers.delete(userId);
            }
            return newSelectedMembers;
        });

        setSelectedGroupMemberDetails(prevDetails => {
            if (event.target.checked) {
                if (!prevDetails.some(user => user._id === userId)) {
                    return [...prevDetails, userDetail];
                }
            } else {
                return prevDetails.filter(user => user._id !== userId);
            }
            return prevDetails;
        });
    };



    const handleCreateGroupSubmit = async () => {
        const token = localStorage.getItem("token");
        const currentUser = JSON.parse(localStorage.getItem("user"));
        selectedGroupMembers.add(currentUser._id);
        const groupDetails = {
            chatName: groupName || "No group name",
            groupPicture: newGroupPicture || "https://res.cloudinary.com/dfa7zee9i/image/upload/v1715111941/anonymous-avatar_wcrklv_u0kzbb.png",
            members: Array.from(selectedGroupMembers),
        };

        try {
            const response = await axios.post(`${config.URL_CONNECT}/chats/createGroup`, groupDetails, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const newChat = response.data.chat;
            socket.emit('create new group', newChat, currentUser);

            setShowGroupCreateModal(false);
            setGroupName('');
            setNewGroupPicture('');
            setSelectedGroupMembers(new Set());
            setAvailableUsers([]);
            setSelectedGroupMemberDetails([]);
            setUserSearchTerm('');
        } catch (error) {
            console.error('Error creating group chat:', error);
        }
    };


    return (
        <Modal className={`model-create-group ${isDarkMode ? 'dark-mode' : ''}`} show={showGroupCreateModal} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title className="title-create-group">Create Group</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '450px', overflowY: 'auto' }}>
                <Form>
                    <Form.Group controlId="groupName" style={{ marginBottom: '15px' }}>
                        <Form.Label className="create-group-name">Group Name</Form.Label>
                        <div className="container-update-chat-group-name-emoji">
                            <button className="emoji-picker-button" style={{ border: '1px solid black' }} type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                            {showEmojiPicker && (
                                <div className="emoji-picker-for-create-group">
                                    <EmojiPicker height={400} width={300} previewConfig={{ showPreview: false }} emojiStyle={EmojiStyle.APPLE} onEmojiClick={handleEmojiClick} />
                                </div>
                            )}
                            <Form.Control
                                type="text"
                                style={{ borderColor: '#ddd', borderRadius: '4px', padding: '0.375rem 0.75rem 0.375rem 0.75rem' }}
                                placeholder="Enter group name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                    </Form.Group>
                    <Form.Group style={{ marginBottom: '15px' }}>
                        <Form.Label className="create-group-groupChatPicture" htmlFor="groupChatPicture">Group Picture</Form.Label>
                        {!newGroupPicture && (
                            <div>
                                <Form.Control
                                    type="file"
                                    hidden
                                    id="groupChatPicture"
                                    onChange={handleFileChange}
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
                        )}
                        {newGroupPicture && (
                            <div style={{ position: 'relative', display: 'block', marginBottom: '10px', width: '100px' }}>
                                <img
                                    src={newGroupPicture}
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
                        )}
                    </Form.Group>
                    <Form.Group controlId="userSearch" style={{ marginBottom: '15px' }}>
                        <Form.Label className="create-group-search-users">Search Users</Form.Label>
                        <Form.Control
                            type="search"
                            placeholder="Enter username"
                            style={{ borderColor: '#ddd', borderRadius: '4px' }}
                            value={userSearchTerm}
                            onChange={handleSearchInputChange}
                        />
                    </Form.Group>
                    <div className="selected-members" style={{ backgroundColor: '#f2f2f2', padding: '10px', borderRadius: '4px', marginBottom: '15px', border: '1px solid #ddd', overflow: 'hidden' }}>
                        <h5 style={{ fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>Selected Members:</h5>
                        <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
                            {selectedGroupMemberDetails.map(member => (
                                <li key={member._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <img
                                        src={member.profilePicture}
                                        alt={member.username}
                                        style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%' }}
                                    />
                                    <span style={{ flexGrow: 1, color: '#333' }}>{member.username}</span>
                                    <button
                                        onClick={() => removeMember(member._id)}
                                        className="remove-member-btn"
                                        style={{ backgroundColor: '#FF6347', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <Form.Group controlId="selectMembers" style={{ maxHeight: '200px', overflowY: 'auto', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        {availableUsers.length > 0 ? (
                            availableUsers.map(user => (
                                <div key={user._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                    <img
                                        src={user.profilePicture}
                                        alt={user.username}
                                        style={{ width: '30px', height: '30px', marginRight: '10px', borderRadius: '50%' }}
                                    />
                                    <Form.Check
                                        id={`checkbox-${user._id}`}
                                        className="checkbox-user"
                                        type="checkbox"
                                        label={user.username}
                                        onChange={(e) => handleMemberSelection(e, user._id)}
                                        checked={selectedGroupMembers.has(user._id)}
                                    />
                                </div>
                            )))
                            : (<p className='no-matching-contacts'>No search results found.</p>)
                        }
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="create-group-footer" style={{ justifyContent: 'space-around' }}>
                <Button variant="light" style={{ backgroundColor: '#CCC', borderColor: '#CCC' }} onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleCreateGroupSubmit} className='button-create-group' style={{
                    backgroundColor: '#25D366', borderColor: '#25D366', color: 'white', display: 'flex', justifyContent: 'center',
                    alignItems: 'center'
                }} disabled={isUploadingImage}>
                    {isUploadingImage ? <i className="bi bi-arrow-clockwise spin-icon"></i> : "Create Group"}
                </Button>
            </Modal.Footer>
        </Modal>
    )

}

export default CreateGroupModal;