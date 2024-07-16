import React, { Component } from 'react';
import { Navbar, Nav, Modal, Form, Button } from 'react-bootstrap';
import { BsFillSunFill, BsFillMoonFill, BsDoorOpenFill, BsX, BsList } from 'react-icons/bs';
import { Navigate } from 'react-router-dom';
import Switch from 'react-switch';
import axios from 'axios';
import './Navbar.css';
import config from './config/default.json';
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';
import Swal from 'sweetalert2';

class CustomNavbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDarkMode: false,
      navigateTo: null, // For tracking navigation
      showProfileModal: false,
      newProfilePicture: '',
      newStatus: '', // New status
      showEmojiPicker: false, // Emoji picker toggle
      isImageZoomed: false,
      isUploading: false,
      fileName: '',
      isNavbarOpen: false,
    };
  }


  toggleDarkMode = () => {
    const newDarkMode = !this.state.isDarkMode;
    this.setState({ isDarkMode: newDarkMode });

    if (newDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.style.backgroundColor = "#000000";
      document.body.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1184' height='142.1' viewBox='0 0 1000 120'%3E%3Cg fill='none' stroke='%23222' stroke-width='6.7' %3E%3Cpath d='M-500 75c0 0 125-30 250-30S0 75 0 75s125 30 250 30s250-30 250-30s125-30 250-30s250 30 250 30s125 30 250 30s250-30 250-30'/%3E%3Cpath d='M-500 45c0 0 125-30 250-30S0 45 0 45s125 30 250 30s250-30 250-30s125-30 250-30s250 30 250 30s125 30 250 30s250-30 250-30'/%3E%3Cpath d='M-500 105c0 0 125-30 250-30S0 105 0 105s125 30 250 30s250-30 250-30s125-30 250-30s250 30 250 30s125 30 250 30s250-30 250-30'/%3E%3Cpath d='M-500 15c0 0 125-30 250-30S0 15 0 15s125 30 250 30s250-30 250-30s125-30 250-30s250 30 250 30s125 30 250 30s250-30 250-30'/%3E%3Cpath d='M-500-15c0 0 125-30 250-30S0-15 0-15s125 30 250 30s250-30 250-30s125-30 250-30s250 30 250 30s125 30 250 30s250-30 250-30'/%3E%3Cpath d='M-500 135c0 0 125-30 250-30S0 135 0 135s125 30 250 30s250-30 250-30s125-30 250-30s250 30 250 30s125 30 250 30s250-30 250-30'/%3E%3C/g%3E%3C/svg%3E")`
    } else {
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundColor = "#1CA24E";
      document.body.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1600 800'%3E%3Cg %3E%3Cpath fill='%231ab153' d='M486 705.8c-109.3-21.8-223.4-32.2-335.3-19.4C99.5 692.1 49 703 0 719.8V800h843.8c-115.9-33.2-230.8-68.1-347.6-92.2C492.8 707.1 489.4 706.5 486 705.8z'/%3E%3Cpath fill='%2318c158' d='M1600 0H0v719.8c49-16.8 99.5-27.8 150.7-33.5c111.9-12.7 226-2.4 335.3 19.4c3.4 0.7 6.8 1.4 10.2 2c116.8 24 231.7 59 347.6 92.2H1600V0z'/%3E%3Cpath fill='%2316d15c' d='M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z'/%3E%3Cpath fill='%2313e261' d='M0 0v429.4c55.6-18.4 113.5-27.3 171.4-27.7c102.8-0.8 203.2 22.7 299.3 54.5c3 1 5.9 2 8.9 3c183.6 62 365.7 146.1 562.4 192.1c186.7 43.7 376.3 34.4 557.9-12.6V0H0z'/%3E%3Cpath fill='%2313F066' d='M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z'/%3E%3Cpath fill='%230de35f' d='M1600 0H0v136.3c62.3-20.9 127.7-27.5 192.2-19.2c93.6 12.1 180.5 47.7 263.3 89.6c2.6 1.3 5.1 2.6 7.7 3.9c158.4 81.1 319.7 170.9 500.3 223.2c210.5 61 430.8 49 636.6-16.6V0z'/%3E%3Cpath fill='%230bd259' d='M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z'/%3E%3Cpath fill='%2309c152' d='M1600 0H498c118.1 85.8 243.5 164.5 386.8 216.2c191.8 69.2 400 74.7 595 21.1c40.8-11.2 81.1-25.2 120.3-41.7V0z'/%3E%3Cpath fill='%2308af4c' d='M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z'/%3E%3Cpath fill='%23069E45' d='M1315.3 72.4c75.3-12.6 148.9-37.1 216.8-72.4h-723C966.8 71 1144.7 101 1315.3 72.4z'/%3E%3C/g%3E%3C/svg%3E")`
    }

    if (this.props.onToggleDarkMode) {
      this.props.onToggleDarkMode();
    }
  };

  handleLogout = () => {
    document.body.style.backgroundImage = "";
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.setState({ navigateTo: '/login' });
  };

  handleProfileClick = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    this.setState({
      showProfileModal: true,
      newProfilePicture: user.profilePicture,
      newStatus: user.status, // Initialize with current user status
    });
  };

  handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      this.setState({ isUploading: true, fileName: file.name, }); // Set uploading state

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.uploadPreset);

      axios
        .post(
          `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
          formData
        )
        .then((response) => {
          this.setState({
            newProfilePicture: response.data.secure_url,
            isUploading: false, // Reset uploading state
          });
        })
        .catch((error) => {
          this.setState({ isUploading: false });
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

  handleCloseProfileModal = () => {
    this.setState({
      showProfileModal: false,
      newProfilePicture: '',
      fileName: '',
      newStatus: '', // Reset status
      showEmojiPicker: false, // Reset emoji picker toggle
    });
  };

  handleImageClick = () => {
    this.setState({ isImageZoomed: true }); // Open zoomed image modal
  };

  handleCloseZoom = () => {
    this.setState({ isImageZoomed: false }); // Close zoomed image modal
  };

  handleSaveProfilePicture = () => {
    const { newProfilePicture, newStatus } = this.state;

    if (newProfilePicture) {
      axios
        .put(
          `http://localhost:8080/users/updateProfile/${JSON.parse(localStorage.getItem("user"))._id}`,
          { profilePicture: newProfilePicture, status: newStatus }, // Update both
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )
        .then(() => {
          let user = JSON.parse(localStorage.getItem('user'));
          // Update the profilePicture and status properties
          user.profilePicture = newProfilePicture;
          user.status = newStatus;

          // Store the updated user object back in localStorage
          localStorage.setItem('user', JSON.stringify(user));

          this.handleCloseProfileModal(); // Close the modal
        })
        .catch((error) => {
          console.error('Error saving profile picture or status:', error);
        });
    }
  };

  toggleEmojiPicker = () => {
    this.setState({ showEmojiPicker: !this.state.showEmojiPicker });
  };

  onEmojiClick = (event) => {
    this.setState((prevState) => ({
      newStatus: (prevState.newStatus || "") + event.emoji, // Add emoji to status
    }));
  };

  handleNavbarToggle = () => {
    this.setState((prevState) => ({ isNavbarOpen: !prevState.isNavbarOpen }));
  };

  render() {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const { isDarkMode, navigateTo, showProfileModal, newProfilePicture, newStatus, showEmojiPicker,
      isImageZoomed, isUploading, fileName, isNavbarOpen } = this.state;

    if (navigateTo) {
      return <Navigate to={navigateTo} replace />;
    }

    return (
      <>
        <Navbar expand="lg" className="custom-navbar">
          <Navbar.Brand>
            <div className="profile-section" onClick={this.handleProfileClick}>
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
          <Navbar.Toggle aria-controls="responsive-navbar-nav" onClick={this.handleNavbarToggle}>
            {isNavbarOpen ? <BsX style={{ height: '30px', width: '30px' }} /> : <BsList style={{ height: '30px', width: '30px' }} />}
          </Navbar.Toggle>
          <Navbar.Collapse id="responsive-navbar-nav">
            <Nav className="ms-auto d-flex align-items-center flex-row">
              <div className='switch-nav-responsive'>
                <Switch
                  checked={isDarkMode}
                  onChange={this.toggleDarkMode}
                  onColor="#00aced"
                  offColor="#ccc"
                  uncheckedIcon={<BsFillSunFill style={{ color: '#d8860b', marginLeft: '3px' }} />}
                  checkedIcon={<BsFillMoonFill style={{ marginLeft: '10px' }} />}
                />
              </div>
              <Button
                variant={isDarkMode ? "danger" : "light"}
                onClick={this.handleLogout}
                className="ms-3"
                style={{ marginRight: '10px' }}
              >
                <BsDoorOpenFill /> Logout
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        {showProfileModal && (
          <Modal
            show={showProfileModal}
            onHide={this.handleCloseProfileModal}
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title>Edit Profile Picture & Status</Modal.Title>
            </Modal.Header>
            <Modal.Body className='model-edit-pic-status-body'>
              <Form>
                <Form.Group>
                  <Form.Label className="label-upload-new-pic">
                    Upload New Profile Picture
                  </Form.Label>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Form.Control
                      type="file"
                      hidden
                      id="groupChatPicture"
                      onChange={this.handleProfilePictureChange}
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
                    {fileName && (
                      <span style={{ marginLeft: '10px' }}>{fileName}</span> // Display file name
                    )}
                  </div>
                  {newProfilePicture && (
                    <div className="profile-preview" onClick={this.handleImageClick}>
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
                  <Form.Label className="label-change-status" >
                    Change Status
                  </Form.Label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={this.toggleEmojiPicker}
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
                      onChange={(e) => this.setState({ newStatus: e.target.value })}
                    />
                  </div>
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      <EmojiPicker
                        height={400} width={300}
                        onEmojiClick={this.onEmojiClick}
                        emojiStyle={EmojiStyle.APPLE}
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-around' }}>
              <Button variant={isDarkMode ? 'light' : 'dark'} onClick={this.handleCloseProfileModal}>
                Cancel
              </Button>
              <Button
                onClick={this.handleSaveProfilePicture}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: 'none',
                  backgroundColor: '#25D366'
                }}
                disabled={isUploading} // Disable if upload in progress
              >
                {isUploading ? (
                  <i className="bi bi-arrow-clockwise spin-icon"></i>
                ) : (
                  <>
                    Save
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal>
        )}

        {isImageZoomed && (
          <Modal
            show={isImageZoomed}
            onHide={this.handleCloseZoom}
            centered
          >
            <img
              src={newProfilePicture}
              alt="Zoomed Profile"
              style={{ width: '100%', height: '100%' }}
              onClick={this.handleCloseZoom} // Click to close modal
            />
          </Modal>
        )}

      </>
    );
  }
}

export default CustomNavbar;
