import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { Button, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { updateContentBlock, uploadContentBlockImage, updateNewsItem } from '@/services/sectionEditorApi';

/**
 * NewsArticleStructured - Renders news article in 3 parts
 * 
 * Part 1 (TOP): Hero image (100% width, cover) + Title + Subtitle
 * Part 2 (MIDDLE): Main text with small inline image
 * Part 3 (BOTTOM): Full-width text + Full-width image (100% vw, no crop)
 */
const NewsArticleStructured = ({ newsItem, onUpdate }) => {
  const { isStaff } = useAuth();
  const { slug } = useParams();
  const [hoveredPart, setHoveredPart] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [blockText, setBlockText] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentBlockId, setCurrentBlockId] = useState(null);
  
  const handleEditPart = (part) => {
    setEditingPart(part);
    setSelectedImageFile(null);
    setImagePreview(null);
    setCurrentBlockId(null);
    
    if (part === 'top') {
      setNewsTitle(newsItem.title || '');
      setNewsSummary(newsItem.summary || '');
      if (heroImage) {
        setCurrentBlockId(heroImage.id);
      }
    } else if (part === 'middle') {
      const middleText = textBlocks[0]?.body || '';
      setBlockText(middleText);
      if (inlineImage) {
        setCurrentBlockId(inlineImage.id);
      }
    } else if (part === 'bottom') {
      const bottomText = textBlocks[1]?.body || '';
      setBlockText(bottomText);
      if (bottomImage) {
        setCurrentBlockId(bottomImage.id);
      }
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePart = async () => {
    try {
      setSaving(true);
      
      // Save text content
      if (editingPart === 'top') {
        await updateNewsItem(slug, newsItem.id, {
          title: newsTitle,
          summary: newsSummary
        });
      } else if (editingPart === 'middle' && textBlocks[0]) {
        await updateContentBlock(slug, textBlocks[0].id, { body: blockText });
      } else if (editingPart === 'bottom' && textBlocks[1]) {
        await updateContentBlock(slug, textBlocks[1].id, { body: blockText });
      }
      
      // Upload image if selected
      if (selectedImageFile && currentBlockId) {
        await uploadContentBlockImage(slug, currentBlockId, selectedImageFile);
      }
      
      toast.success('Changes saved successfully');
      setEditingPart(null);
      setSelectedImageFile(null);
      setImagePreview(null);
      setCurrentBlockId(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  const blocks = newsItem.content_blocks || [];
  
  // Find first image for hero
  const heroImage = blocks.find(b => b.block_type === 'image');
  
  // Find remaining images and text blocks
  const textBlocks = blocks.filter(b => b.block_type === 'text');
  const remainingImages = blocks.filter(b => b.block_type === 'image' && b.id !== heroImage?.id);
  
  // Split text into middle and bottom
  const middleText = textBlocks[0]?.body || '';
  const bottomText = textBlocks[1]?.body || '';
  const inlineImage = remainingImages[0];
  const bottomImage = remainingImages[1];

  return (
    <article className="news-article-structured" style={{ marginBottom: '4rem' }}>
      {/* PART 1: TOP - Hero Image + Title + Subtitle */}
      <div 
        className="article-part article-part--top" 
        style={{ 
          padding: '2rem', 
          borderRadius: '8px', 
          marginBottom: '3rem',
          position: 'relative',
          transition: 'box-shadow 0.3s ease'
        }}
        onMouseEnter={() => isStaff && setHoveredPart('top')}
        onMouseLeave={() => isStaff && setHoveredPart(null)}
      >
        {isStaff && hoveredPart === 'top' && (
          <button
            className="btn btn-hm btn-hm-editor"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 10,
              opacity: 0.9
            }}
            onClick={() => handleEditPart('top')}
          >
            <i className="bi bi-pencil me-2"></i>
            Edit Part 1
          </button>
        )}
        {heroImage && (
          <div className="article-hero-image" style={{ marginBottom: '1rem' }}>
            <img 
              src={heroImage.image_url} 
              alt={newsItem.title}
              style={{ 
                width: '100%', 
                height: '400px', 
                objectFit: 'cover',
                objectPosition: 'center',
                borderRadius: '8px'
              }}
            />
          </div>
        )}
        <div className="article-header">
          <h1 className="article-title" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>{newsItem.title}</h1>
          {newsItem.summary && (
            <p className="article-subtitle" style={{ fontSize: '1.25rem', color: '#555', marginBottom: '0.5rem' }}>{newsItem.summary}</p>
          )}
          <p className="article-date" style={{ fontSize: '0.875rem', color: '#888' }}>{new Date(newsItem.date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* PART 2: MIDDLE - Text with small inline image */}
      <div 
        className="article-part article-part--middle" 
        style={{ 
          padding: '2rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          position: 'relative',
          transition: 'box-shadow 0.3s ease'
        }}
        onMouseEnter={() => isStaff && setHoveredPart('middle')}
        onMouseLeave={() => isStaff && setHoveredPart(null)}
      >
        {isStaff && hoveredPart === 'middle' && (
          <button
            className="btn btn-hm btn-hm-editor"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 10,
              opacity: 0.9
            }}
            onClick={() => handleEditPart('middle')}
          >
            <i className="bi bi-pencil me-2"></i>
            Edit Part 2
          </button>
        )}
        <div className="article-text-with-image">
          {inlineImage && (
            <div style={{ float: 'right', marginLeft: '20px', marginBottom: '20px', maxWidth: '350px' }}>
              <img 
                src={inlineImage.image_url} 
                alt={inlineImage.image_caption || 'Article image'}
                className="article-inline-image"
                style={{
                  width: '100%',
                  height: 'auto'
                }}
              />
            </div>
          )}
          <p className="article-text" style={{ margin: 0 }}>{middleText}</p>
        </div>
      </div>

      {/* PART 3: BOTTOM - Full-width text + Full-width image */}
      <div 
        className="article-part article-part--bottom" 
        style={{ 
          width: '100vw',
          position: 'relative',
          left: '50%',
          right: '50%',
          marginLeft: '-50vw',
          marginRight: '-50vw',
          padding: '3rem 0',
          transition: 'box-shadow 0.3s ease'
        }}
        onMouseEnter={() => isStaff && setHoveredPart('bottom')}
        onMouseLeave={() => isStaff && setHoveredPart(null)}
      >
        {isStaff && hoveredPart === 'bottom' && (
          <button
            className="btn btn-hm btn-hm-editor"
            style={{
              position: 'fixed',
              top: '50%',
              right: '20px',
              transform: 'translateY(-50%)',
              zIndex: 1000,
              opacity: 0.9
            }}
            onClick={() => handleEditPart('bottom')}
          >
            <i className="bi bi-pencil me-2"></i>
            Edit Part 3
          </button>
        )}
        <div className="article-author-section" style={{ padding: '0 20px', marginTop: '2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {bottomImage && (
              <img 
                src={bottomImage.image_url} 
                alt="Author avatar"
                className="article-author-avatar"
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(0, 0, 0, 0.1)',
                  flexShrink: 0
                }}
              />
            )}
            {bottomText && (
              <div className="article-author-info">
                <p className="article-author-name" style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#333' }}>
                  {bottomText}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modals */}
      {/* Top Part Modal - Edit Title, Summary, and Hero Image */}
      <Modal show={editingPart === 'top'} onHide={() => setEditingPart(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Part 1 - Title & Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              autoFocus
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Summary</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newsSummary}
              onChange={(e) => setNewsSummary(e.target.value)}
              placeholder="Optional brief summary..."
            />
          </Form.Group>
          {heroImage && (
            <Form.Group>
              <Form.Label>Hero Image</Form.Label>
              <div className="mb-2">
                <img 
                  src={imagePreview || heroImage.image_url} 
                  alt="Hero preview" 
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} 
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                id="modal-hero-upload"
                style={{ display: 'none' }}
              />
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => document.getElementById('modal-hero-upload').click()}
              >
                <i className="bi bi-upload me-1"></i> {selectedImageFile ? 'Change Image' : 'Select New Image'}
              </Button>
              {selectedImageFile && (
                <div className="mt-2">
                  <small className="text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    New image selected: {selectedImageFile.name}
                  </small>
                </div>
              )}
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingPart(null)}>Cancel</Button>
          <button className="btn btn-hm btn-hm-primary" onClick={handleSavePart} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Middle Part Modal - Edit Text and Inline Image */}
      <Modal show={editingPart === 'middle'} onHide={() => setEditingPart(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Part 2 - Middle Section</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Text Content</Form.Label>
            <Form.Control
              as="textarea"
              rows={8}
              value={blockText}
              onChange={(e) => setBlockText(e.target.value)}
              autoFocus
            />
          </Form.Group>
          {inlineImage && (
            <Form.Group>
              <Form.Label>Inline Image</Form.Label>
              <div className="mb-2">
                <img 
                  src={imagePreview || inlineImage.image_url} 
                  alt="Inline preview" 
                  style={{ width: '100%', maxWidth: '300px', borderRadius: '8px' }} 
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                id="modal-inline-upload"
                style={{ display: 'none' }}
              />
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => document.getElementById('modal-inline-upload').click()}
              >
                <i className="bi bi-upload me-1"></i> {selectedImageFile ? 'Change Image' : 'Select New Image'}
              </Button>
              {selectedImageFile && (
                <div className="mt-2">
                  <small className="text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    New image selected: {selectedImageFile.name}
                  </small>
                </div>
              )}
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingPart(null)}>Cancel</Button>
          <button className="btn btn-hm btn-hm-primary" onClick={handleSavePart} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Bottom Part Modal - Edit Author Info */}
      <Modal show={editingPart === 'bottom'} onHide={() => setEditingPart(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Part 3 - Author Info</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Author Name</Form.Label>
            <Form.Control
              type="text"
              value={blockText}
              onChange={(e) => setBlockText(e.target.value)}
              placeholder="Enter author name"
              autoFocus
            />
          </Form.Group>
          {bottomImage && (
            <Form.Group>
              <Form.Label>Author Avatar</Form.Label>
              <div className="mb-2">
                <img 
                  src={imagePreview || bottomImage.image_url} 
                  alt="Author avatar preview" 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', border: '2px solid rgba(0, 0, 0, 0.1)' }} 
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                id="modal-bottom-upload"
                style={{ display: 'none' }}
              />
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => document.getElementById('modal-bottom-upload').click()}
              >
                <i className="bi bi-upload me-1"></i> {selectedImageFile ? 'Change Image' : 'Select New Image'}
              </Button>
              {selectedImageFile && (
                <div className="mt-2">
                  <small className="text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    New image selected: {selectedImageFile.name}
                  </small>
                </div>
              )}
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingPart(null)}>Cancel</Button>
          <button className="btn btn-hm btn-hm-primary" onClick={handleSavePart} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </Modal.Footer>
      </Modal>
    </article>
  );
};

export default NewsArticleStructured;
