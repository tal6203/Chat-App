import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import config from './config/default.json';
import './FileUploadComponent.css';

const FileUploadComponent = ({ setUploading, onFileUpload, onCancelUpload, fileInputRef, selectedChat, socket }) => {
    const [preview, setPreview] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [uploading, setUploadingState] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [uploadedPublicId, setUploadedPublicId] = useState('');




    useEffect(() => {
        const resetPreview = () => {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            setPreview(null);
            setFileType(null);
            setUploading(false);
        };

        socket.on('reset', resetPreview);

        return () => {
            socket.off('reset', resetPreview);
        }
    }, [socket, fileInputRef, setUploading]);

    useEffect(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setPreview(null);
        setFileType(null);
        setUploading(false);
    }, [selectedChat, fileInputRef, setUploading]);

    const handleFileInputChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadingState(true);
        uploadFile(file);
    };

    const uploadFile = (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', config.uploadPreset);

        axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`, formData)
            .then(response => {
                const { secure_url, resource_type, public_id } = response.data;
                setUploading(false);
                setPreview(secure_url);
                setFileType(resource_type);
                setUploadedPublicId(public_id);
                setUploadingState(false);
                setShowOverlay(false);
                if (onFileUpload) {
                    onFileUpload(secure_url, resource_type);
                }
            })
            .catch(error => {
                setUploading(false);
                setUploadingState(false);
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
    };

    const handleCancel = () => {

        if (onCancelUpload) {
            onCancelUpload(uploadedPublicId, fileType);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        setPreview(null);
        setFileType(null);
        setShowOverlay(false);
        setUploadedPublicId('');
    };

    const toggleOverlay = () => {
        setShowOverlay(!showOverlay);
    };

    const renderPreview = () => {
        if (!preview) return null;
        let content;
        if (preview.endsWith('.docx')) {
            content = (
                <iframe
                    title="Document Viewer"
                    style={{ width: '100%', height: '80vh', maxWidth: '1000px', maxHeight: '80vh' }}
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(preview)}`}>
                </iframe>
            );
        } else if (preview.endsWith('.pdf')) {
            content = (
                <iframe title="PDF"
                    src={preview}
                    alt="Preview PDF"
                    style={{ width: '100%', height: '80vh', maxWidth: '1000px', maxHeight: '80vh' }}>
                </iframe>
            );
        } else if (fileType === 'image') {
            content = (
                <embed
                    src={preview}
                    style={{ maxWidth: '100%', maxHeight: '80vh' }}
                    className="preview-image"
                />
            );
        } else if (fileType === 'video') {
            content = (
                <video
                    src={preview}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '80vh' }}
                />
            );
        } else {
            content = (
                <embed
                    src={preview}
                    style={{ width: '100%', height: '80vh', maxWidth: '1000px', maxHeight: '80vh' }}
                    className="message-file-link"
                />
            );
        }

        return (
            <div className="full-page-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                zIndex: '2',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }} onClick={toggleOverlay}>
                <div onClick={e => e.stopPropagation()} style={{ position: 'relative', padding: '20px', boxSizing: 'border-box', backgroundColor: 'white', borderRadius: '8px' }}>
                    {content}
                    <button variant="danger" className='delete-button' onClick={handleCancel}><i className="bi bi-trash"></i></button>
                    <button
                        onClick={toggleOverlay}
                        style={{
                            position: 'absolute', top: 5, right: 10, cursor: 'pointer', backgroundColor: '#6c757d', width: '30px', height: '30px',
                            borderRadius: '50%', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}
                    >
                        <i className="bi bi-x" style={{ color: 'white' }}></i>
                    </button>
                </div>
            </div>
        );
    };



    return (
        <div>
            <input
                ref={fileInputRef}
                type="file"
                hidden
                id="fileInput"
                onChange={handleFileInputChange}
                accept="image/*,video/*,.pdf,.docx,.txt"
            />
            <Button
                variant="light"
                className='upload-file btn btn-light'
                style={{
                    width: '30px',
                    height: '40px',
                    marginRight: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
                onClick={preview ? toggleOverlay : () => fileInputRef.current.click()}
                disabled={uploading}
            >
                {uploading ? <i className="bi bi-arrow-clockwise spin-icon"></i> : (preview ? <i className="bi bi-eye-fill"></i> : <i className="bi bi-link-45deg"></i>)}
            </Button>
            {showOverlay && renderPreview()}
        </div>
    );
};

export default FileUploadComponent;

