// CustomNavbar.js
import React, { useState } from 'react';
import { Navbar, Nav, Modal, Form, Button } from 'react-bootstrap';
import { BsFillSunFill, BsFillMoonFill, BsDoorOpenFill, BsX, BsList } from 'react-icons/bs';
import { Navigate } from 'react-router-dom';
import Switch from 'react-switch';
import axios from 'axios';
import './CustomNavbar.css';
import config from './config/default.json';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import Swal from 'sweetalert2';
import { useDarkMode } from '../DarkModeContext';

const CustomNavbar = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [navigateTo, setNavigateTo] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfilePicture, setNewProfilePicture] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);

  const handleLogout = () => {
    document.body.style.backgroundImage = "";
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.body.classList.remove('dark-mode');
    setNavigateTo('/login');
  };

  const handleProfileClick = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    setShowProfileModal(true);
    setNewProfilePicture(user.profilePicture);
    setNewStatus(user.status);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      setFileName(file.name);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.uploadPreset);

      axios
        .post(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, formData)
        .then((response) => {
          setNewProfilePicture(response.data.secure_url);
          setIsUploading(false);
        })
        .catch((error) => {
          setIsUploading(false);
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
        });
    }
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setNewProfilePicture('');
    setFileName('');
    setNewStatus('');
    setShowEmojiPicker(false);
  };

  const handleImageClick = () => {
    setIsImageZoomed(true);
  };

  const handleCloseZoom = () => {
    setIsImageZoomed(false);
  };

  const handleSaveProfilePicture = () => {
    if (newProfilePicture) {
      axios
        .put(
          `${config.URL_CONNECT}/users/updateProfile/${JSON.parse(localStorage.getItem("user"))._id}`,
          { profilePicture: newProfilePicture, status: newStatus },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )
        .then(() => {
          let user = JSON.parse(localStorage.getItem('user'));
          user.profilePicture = newProfilePicture;
          user.status = newStatus;
          localStorage.setItem('user', JSON.stringify(user));
          handleCloseProfileModal();
        })
        .catch((error) => {
          console.error('Error saving profile picture or status:', error);
        });
    }
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const onEmojiClick = (event) => {
    setNewStatus((prevStatus) => (prevStatus || "") + event.emoji);
  };

  const handleNavbarToggle = () => {
    setIsNavbarOpen(!isNavbarOpen);
  };

  const currentUser = JSON.parse(localStorage.getItem("user"));

  if (navigateTo) {
    return <Navigate to={navigateTo} replace />;
  }

  return (
    <>
      <Navbar expand="lg" className="custom-navbar">
        <Navbar.Brand>
          <div className="profile-section" onClick={handleProfileClick}>
            <div className="image-container">
              <img
                src={currentUser.profilePicture}
                alt={currentUser.username}
                className="profile-image"
              />
              <div className="overlay">
                <span style={{ fontSize: '16px' }}>Edit</span>
              </div>
            </div>
          </div>
          <div className="username-section">
            <span className="username-nav">{currentUser.username}</span>
          </div>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" onClick={handleNavbarToggle}>
          {isNavbarOpen ? <BsX style={{ height: '30px', width: '30px' }} /> : <BsList style={{ height: '30px', width: '30px' }} />}
        </Navbar.Toggle>
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="ms-auto d-flex align-items-center flex-row">
            <div className='switch-nav-responsive'>
              <Switch
                checked={isDarkMode}
                onChange={toggleDarkMode}
                onColor="#00aced"
                offColor="#ccc"
                uncheckedIcon={<BsFillSunFill style={{ color: '#d8860b', marginLeft: '3px' }} />}
                checkedIcon={<BsFillMoonFill style={{ marginLeft: '10px' }} />}
              />
            </div>
            <Button
              variant={isDarkMode ? "danger" : "light"}
              onClick={handleLogout}
              className="ms-3"
              style={{ marginRight: '10px' }}
            >
              <BsDoorOpenFill /> Logout
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Navbar>

      {showProfileModal && (
        <Modal className={`${isDarkMode ? 'dark-mode' : ''}`} show={showProfileModal} onHide={handleCloseProfileModal} centered>
          <Modal.Header closeButton>
            <Modal.Title className='title-model-edit-pic-status'>Edit Profile Picture & Status</Modal.Title>
          </Modal.Header>
          <Modal.Body className={`model-edit-pic-status-body ${isDarkMode ? 'dark-mode' : ''}`}>
            <Form>
              <Form.Group>
                <Form.Label className="label-upload-new-pic">Upload New Profile Picture</Form.Label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Control
                    type="file"
                    hidden
                    id="groupChatPicture"
                    onChange={handleProfilePictureChange}
                    accept="image/*"
                  />
                  <Button
                    as="label"
                    htmlFor="groupChatPicture"
                    style={{ backgroundColor: isDarkMode ? "#f8f9fa" : "#25d366", border: 'none', color: isDarkMode ? "black" : "white" }}
                    className="mt-2"
                  >
                    Choose File
                  </Button>
                  {fileName && <span style={{ marginLeft: '10px' }}>{fileName}</span>}
                </div>
                {newProfilePicture && (
                  <div className="profile-preview" onClick={handleImageClick}>
                    <img
                      src={newProfilePicture}
                      className='profile-preview-img'
                      alt="New Profile"
                      style={{ width: '100px', height: '100px', borderRadius: '50%' }}
                    />
                  </div>
                )}
              </Form.Group>
              <Form.Group controlId="profileStatus">
                <Form.Label className="label-change-status">Change Status</Form.Label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={toggleEmojiPicker}
                    className="emoji-picker-button"
                    style={{
                      border: '1px black solid',
                      background: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                    }}
                  >
                    😊
                  </button>
                  <Form.Control
                    type="text"
                    placeholder="Enter your new status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  />
                </div>
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    <EmojiPicker
                      height={400}
                      width={300}
                      onEmojiClick={onEmojiClick}
                      emojiStyle={EmojiStyle.APPLE}
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer className='model-footer-edit-pic-status' style={{ justifyContent: 'space-around' }}>
            <Button variant={isDarkMode ? 'light' : 'dark'} onClick={handleCloseProfileModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfilePicture}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: 'none',
                backgroundColor: '#25D366',
              }}
              disabled={isUploading}
            >
              {isUploading ? (
                <i className="bi bi-arrow-clockwise spin-icon"></i>
              ) : (
                <>Save</>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {isImageZoomed && (
        <Modal show={isImageZoomed} onHide={handleCloseZoom} centered>
          <img
            src={newProfilePicture}
            alt="Zoomed Profile"
            style={{ width: '100%', height: '100%' }}
            onClick={handleCloseZoom}
          />
        </Modal>
      )}
    </>
  );
};

export default CustomNavbar;
