import React from "react";
import { Modal } from 'react-bootstrap';
import { useDarkMode } from '../DarkModeContext';
import './ModalReadBy.css';

function ModalReadBy({ show, setModalReadBy, selectedMessage }) {

    const { isDarkMode } = useDarkMode();

    return (
        <Modal show={show} className={`modal-readBy ${isDarkMode ? 'dark-mode' : ''}`} onHide={() => setModalReadBy(false)} centered>
            <Modal.Header className="modal-readBy-header" closeButton>
                <Modal.Title>Read By</Modal.Title>
            </Modal.Header>
            <Modal.Body className="modal-readBy-body">
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
                    onClick={() => setModalReadBy(false)}>Close</button>
            </Modal.Footer>
        </Modal>
    )
}

export default ModalReadBy;