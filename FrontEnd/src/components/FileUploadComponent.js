import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import config from './config/default.json';

class FileUploadComponent extends Component {
    constructor(props) {
        super(props);
        this.state = {
            preview: null,
            fileType: null,
            uploading: false,
            showOverlay: false,
            uploadedPublicId: ''
        };
    }

    handleFileInputChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        this.props.setUploading(true);
        this.setState({ uploading: true });
        this.uploadFile(file);
    };

    uploadFile = (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', config.uploadPreset);

        axios.post(`https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`, formData)
            .then(response => {
                const { secure_url, resource_type, public_id } = response.data;
                this.props.setUploading(false);
                this.setState({
                    preview: secure_url,
                    fileType: resource_type,
                    uploadedPublicId: public_id,
                    uploading: false,
                    showOverlay: false
                });
                if (this.props.onFileUpload) {
                    this.props.onFileUpload(secure_url, resource_type);
                }
            })
            .catch(error => {
                this.props.setUploading(false);
                this.setState({ uploading: false });
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

    handleCancel = () => {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';  // Reset the file input value
        }
        if (this.props.onCancelUpload) {
            this.props.onCancelUpload(this.state.uploadedPublicId, this.state.fileType);
        }
        this.setState({ preview: null, fileType: null, showOverlay: false, uploadedPublicId: '' });
    };

    toggleOverlay = () => {
        this.setState(prevState => ({
            showOverlay: !prevState.showOverlay
        }));
    };

    renderPreview = () => {
        const { preview, fileType } = this.state;
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
        }

        else if (preview.endsWith('.pdf')) {
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
                zIndex: '2',  // Ensure the overlay is above all other elements
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }} onClick={this.toggleOverlay}>
                <div onClick={e => e.stopPropagation()} style={{ position: 'relative', padding: '20px', boxSizing: 'border-box', backgroundColor: 'white', borderRadius: '8px' }}>
                    {content}
                    <button variant="danger" className='delete-button' onClick={this.handleCancel}><i className="bi bi-trash"></i></button>
                    <button
                        onClick={this.toggleOverlay}
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

    resetPreview = () => {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';  // Reset the file input value
        }
        this.setState({ preview: null, fileType: null, uploading: false });
    };

    render() {
        return (
            <div>
                <input
                    type="file"
                    hidden
                    id="fileInput"
                    onChange={this.handleFileInputChange}
                    accept="image/*,video/*,.pdf,.docx,.txt"
                />
                <Button
                    variant="light"
                    className='upload-file'
                    style={{
                        width: '30px',
                        height: '40px',
                        marginRight: '5px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                    onClick={this.state.preview ? this.toggleOverlay : () => document.getElementById('fileInput').click()}
                    disabled={this.state.uploading}
                >
                    {this.state.uploading ? <i className="bi bi-arrow-clockwise spin-icon"></i> : (this.state.preview ? <i className="bi bi-eye-fill"></i> : <i className="bi bi-link-45deg"></i>)}
                </Button>
                {this.state.showOverlay && this.renderPreview()}
            </div>
        );
    }
}

export default FileUploadComponent;
