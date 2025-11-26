import React, { useState } from 'react';
import { Container, Row, Col, Card, Modal, Button, Form } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { updateContentBlock, uploadContentBlockImage, deleteContentBlock, createContentBlock, updateNewsItem } from '@/services/sectionEditorApi';

const NewsSectionView = ({ section, onUpdate }) => {
  const { isStaff } = useAuth();
  const { slug } = useParams();
  const newsItems = section.news_items || [];
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [deletingBlock, setDeletingBlock] = useState(null);
  const [editingNews, setEditingNews] = useState(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockText, setBlockText] = useState('');
  const [showButtons, setShowButtons] = useState({});

  if (newsItems.length === 0) {
    return null;
  }

  const handleEditNews = (news) => {
    setEditingNews(news);
    setNewsTitle(news.title || '');
    setNewsSummary(news.summary || '');
  };

  const handleSaveNews = async () => {
    try {
      setSaving(true);
      await updateNewsItem(slug, editingNews.id, {
        title: newsTitle,
        summary: newsSummary
      });
      toast.success('News updated successfully');
      setEditingNews(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update news:', error);
      toast.error('Failed to update news');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
    setBlockText(block.body || '');
  };

  const handleSaveBlock = async () => {
    try {
      setSaving(true);
      await updateContentBlock(slug, editingBlock.id, { body: blockText });
      toast.success('Text updated successfully');
      setEditingBlock(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update text:', error);
      toast.error('Failed to update text');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (blockId, event) => {
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

    try {
      setUploadingImage(blockId);
      await uploadContentBlockImage(slug, blockId, file);
      toast.success('Image uploaded successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Delete this content block?')) return;
    
    try {
      setDeletingBlock(blockId);
      await deleteContentBlock(slug, blockId);
      toast.success('Content block deleted');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete block:', error);
      toast.error('Failed to delete block');
    } finally {
      setDeletingBlock(null);
    }
  };

  const handleAddBlock = async (newsItemId, blockType, position) => {
    try {
      const blockData = {
        news_item: newsItemId,
        block_type: blockType,
        sort_order: position,
      };

      if (blockType === 'text') {
        blockData.body = 'Add your text here...';
      } else if (blockType === 'image') {
        blockData.image_position = 'full_width';
      }

      await createContentBlock(slug, blockData);
      toast.success(`${blockType === 'text' ? 'Paragraph' : 'Image block'} added`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to add block:', error);
      toast.error('Failed to add block');
    }
  };

  const renderMainImage = (block) => {
    return (
      <div 
        key={block.id}
        className="mb-4 position-relative"
        onMouseEnter={() => setShowButtons(prev => ({ ...prev, [block.id]: true }))}
        onMouseLeave={() => setShowButtons(prev => ({ ...prev, [block.id]: false }))}
      >
        {isStaff && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(block.id, e)}
            style={{ display: 'none' }}
            id={`image-upload-${block.id}`}
            disabled={uploadingImage === block.id}
          />
        )}
        {block.image_url ? (
          <div style={{ position: 'relative' }}>
            <img
              src={block.image_url}
              alt={block.image_caption || 'News image'}
              style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: '8px' }}
            />
            {isStaff && showButtons[block.id] && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  className="position-absolute bottom-0 end-0 m-2 shadow-sm"
                  onClick={() => document.getElementById(`image-upload-${block.id}`).click()}
                  disabled={uploadingImage === block.id}
                >
                  {uploadingImage === block.id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-1"></i> Change
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  className="position-absolute top-0 end-0 m-2"
                  onClick={() => handleDeleteBlock(block.id)}
                  disabled={deletingBlock === block.id}
                  style={{ zIndex: 10 }}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </>
            )}
          </div>
        ) : isStaff ? (
          <div
            className="rounded bg-light border border-2 border-dashed d-flex flex-column align-items-center justify-content-center p-4"
            style={{
              width: '100%',
              height: '400px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById(`image-upload-${block.id}`).click()}
          >
            {uploadingImage === block.id ? (
              <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Uploading...</span>
                </div>
                <p className="mb-0 mt-2 small text-muted">Uploading image...</p>
              </div>
            ) : (
              <>
                <i className="bi bi-cloud-upload text-primary" style={{ fontSize: '3rem' }}></i>
                <p className="mb-1 mt-3 fw-semibold">Click to upload main image</p>
                <small className="text-muted mt-1">Max size: 5MB</small>
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderInlineImage = (block) => {
    return (
      <div 
        key={block.id}
        className="my-3 position-relative"
        onMouseEnter={() => setShowButtons(prev => ({ ...prev, [block.id]: true }))}
        onMouseLeave={() => setShowButtons(prev => ({ ...prev, [block.id]: false }))}
      >
        {isStaff && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(block.id, e)}
            style={{ display: 'none' }}
            id={`image-upload-${block.id}`}
            disabled={uploadingImage === block.id}
          />
        )}
        {block.image_url ? (
          <div style={{ position: 'relative' }}>
            <img
              src={block.image_url}
              alt={block.image_caption || 'Inline image'}
              style={{ 
                width: block.image_position === 'left' || block.image_position === 'right' ? '50%' : '100%',
                height: '250px',
                objectFit: 'cover',
                borderRadius: '8px',
                float: block.image_position === 'left' ? 'left' : block.image_position === 'right' ? 'right' : 'none',
                marginRight: block.image_position === 'left' ? '1rem' : '0',
                marginLeft: block.image_position === 'right' ? '1rem' : '0',
                marginBottom: '1rem'
              }}
            />
            {isStaff && showButtons[block.id] && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  className="position-absolute bottom-0 end-0 m-2 shadow-sm"
                  onClick={() => document.getElementById(`image-upload-${block.id}`).click()}
                  disabled={uploadingImage === block.id}
                  style={{ zIndex: 10 }}
                >
                  {uploadingImage === block.id ? 'Uploading...' : <><i className="bi bi-upload me-1"></i> Change</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  className="position-absolute top-0 end-0 m-2"
                  onClick={() => handleDeleteBlock(block.id)}
                  disabled={deletingBlock === block.id}
                  style={{ zIndex: 10 }}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </>
            )}
          </div>
        ) : isStaff ? (
          <div
            className="rounded bg-light border border-2 border-dashed d-flex flex-column align-items-center justify-content-center p-3"
            style={{
              width: '100%',
              height: '200px',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById(`image-upload-${block.id}`).click()}
          >
            <i className="bi bi-cloud-upload text-primary" style={{ fontSize: '2rem' }}></i>
            <p className="mb-0 mt-2 small">Click to upload inline image</p>
          </div>
        ) : null}
      </div>
    );
  };

  const renderImageRow = (blocks) => {
    return (
      <Row className="g-3 mt-3">
        {blocks.map((block) => (
          <Col key={block.id} xs={12} md={6} lg={4}>
            <div 
              className="position-relative"
              onMouseEnter={() => setShowButtons(prev => ({ ...prev, [block.id]: true }))}
              onMouseLeave={() => setShowButtons(prev => ({ ...prev, [block.id]: false }))}
            >
              {isStaff && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(block.id, e)}
                  style={{ display: 'none' }}
                  id={`image-upload-${block.id}`}
                  disabled={uploadingImage === block.id}
                />
              )}
              {block.image_url ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={block.image_url}
                    alt={block.image_caption || 'Gallery image'}
                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  {isStaff && showButtons[block.id] && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        className="position-absolute bottom-0 end-0 m-2 shadow-sm"
                        onClick={() => document.getElementById(`image-upload-${block.id}`).click()}
                        disabled={uploadingImage === block.id}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {uploadingImage === block.id ? 'Up...' : <i className="bi bi-upload"></i>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        className="position-absolute top-0 end-0 m-2"
                        onClick={() => handleDeleteBlock(block.id)}
                        disabled={deletingBlock === block.id}
                        style={{ fontSize: '0.75rem' }}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </>
                  )}
                </div>
              ) : isStaff ? (
                <div
                  className="rounded bg-light border border-2 border-dashed d-flex flex-column align-items-center justify-content-center p-3"
                  style={{
                    width: '100%',
                    height: '200px',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById(`image-upload-${block.id}`).click()}
                >
                  <i className="bi bi-cloud-upload text-primary" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-0 mt-2 small">Upload</p>
                </div>
              ) : null}
            </div>
          </Col>
        ))}
      </Row>
    );
  };

  const renderTextBlock = (block) => {
    return (
      <div 
        key={block.id} 
        className="mb-3 position-relative"
        onMouseEnter={() => setShowButtons(prev => ({ ...prev, [block.id]: true }))}
        onMouseLeave={() => setShowButtons(prev => ({ ...prev, [block.id]: false }))}
      >
        <div
          onClick={() => isStaff && handleEditBlock(block)}
          style={{
            cursor: isStaff ? 'pointer' : 'default',
            padding: isStaff ? '0.5rem' : '0',
            borderRadius: '4px',
          }}
        >
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {block.body}
          </p>
        </div>
        {isStaff && showButtons[block.id] && (
          <Button
            size="sm"
            variant="outline-danger"
            className="position-absolute top-0 end-0"
            onClick={() => handleDeleteBlock(block.id)}
            disabled={deletingBlock === block.id}
            style={{ opacity: 0.9 }}
          >
            <i className="bi bi-trash"></i>
          </Button>
        )}
      </div>
    );
  };

  const organizeContent = (blocks) => {
    if (!blocks || blocks.length === 0) return { mainImage: null, textBlocks: [], inlineImage: null, imageRow: [] };

    const images = blocks.filter(b => b.block_type === 'image');
    const texts = blocks.filter(b => b.block_type === 'text');

    const mainImage = images[0] || null;
    const midIndex = Math.floor(texts.length / 2);
    const inlineImage = images[1] || null;
    const imageRow = images.slice(2);

    return {
      mainImage,
      textBlocksBeforeInline: texts.slice(0, midIndex),
      inlineImage,
      textBlocksAfterInline: texts.slice(midIndex),
      imageRow
    };
  };

  return (
    <section 
      className="news-section-view py-5" 
      style={{ 
        width: '100vw', 
        marginLeft: 'calc(-50vw + 50%)',
        backgroundColor: '#f8f9fa'
      }}
    >
      <Container fluid className="px-3 px-md-5">
        <h2 className="text-center mb-5">{section.name}</h2>
        
        <Row className="justify-content-center">
          {newsItems.map((news) => {
            const { mainImage, textBlocksBeforeInline, inlineImage, textBlocksAfterInline, imageRow } = organizeContent(news.content_blocks);
            
            return (
              <Col key={news.id} xs={12} className="mb-5">
                <Card className="shadow-sm">
                  <Card.Body className="p-4 p-md-5">
                    {mainImage && renderMainImage(mainImage)}
                    
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div 
                        className="flex-grow-1"
                        onClick={() => isStaff && handleEditNews(news)}
                        style={{
                          cursor: isStaff ? 'pointer' : 'default',
                          padding: isStaff ? '0.5rem' : '0',
                          borderRadius: '4px',
                        }}
                      >
                        <Card.Title as="h3">{news.title}</Card.Title>
                        {news.summary && (
                          <Card.Subtitle className="mb-0 text-muted mt-2">
                            {news.summary}
                          </Card.Subtitle>
                        )}
                      </div>
                      <small className="text-muted text-nowrap ms-3">
                        <i className="bi bi-calendar me-1"></i>
                        {new Date(news.date).toLocaleDateString()}
                      </small>
                    </div>
                    
                    <div className="news-content">
                      {textBlocksBeforeInline.map(block => renderTextBlock(block))}
                      
                      {inlineImage && renderInlineImage(inlineImage)}
                      
                      {textBlocksAfterInline.map(block => renderTextBlock(block))}
                      
                      {imageRow.length > 0 && renderImageRow(imageRow)}
                    </div>

                    {isStaff && (
                      <div className="d-flex gap-2 mt-4 pt-3 border-top">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleAddBlock(news.id, 'text', news.content_blocks?.length || 0)}
                        >
                          <i className="bi bi-plus-circle me-1"></i> Add Paragraph
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleAddBlock(news.id, 'image', news.content_blocks?.length || 0)}
                        >
                          <i className="bi bi-image me-1"></i> Add Image
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Container>

      {/* Edit Title & Summary Modal */}
      <Modal show={!!editingNews} onHide={() => setEditingNews(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit News Title & Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              autoFocus
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Summary</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newsSummary}
              onChange={(e) => setNewsSummary(e.target.value)}
              placeholder="Optional brief summary..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingNews(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveNews} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Text Block Modal */}
      <Modal show={!!editingBlock} onHide={() => setEditingBlock(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Text Block</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Content</Form.Label>
            <Form.Control
              as="textarea"
              rows={8}
              value={blockText}
              onChange={(e) => setBlockText(e.target.value)}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingBlock(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveBlock} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
};

export default NewsSectionView;
