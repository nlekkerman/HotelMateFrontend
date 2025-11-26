import React, { useState } from 'react';
import { Card, Button, Form, Spinner, Modal, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  createNewsItem,
  updateNewsItem,
  deleteNewsItem,
  createContentBlock,
  updateContentBlock,
  uploadContentBlockImage,
  deleteContentBlock,
} from '@/services/sectionEditorApi';

/**
 * NewsSectionEditor - Manage news items with ordered content blocks
 */
const NewsSectionEditor = ({ section, hotelSlug, onUpdate }) => {
  const newsItems = section.news_items || [];
  
  const [showAddNews, setShowAddNews] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    summary: '',
  });
  const [savingNews, setSavingNews] = useState(false);
  
  const [expandedNews, setExpandedNews] = useState(null);
  const [showAddBlock, setShowAddBlock] = useState(null);
  const [blockType, setBlockType] = useState('text');
  const [blockText, setBlockText] = useState('');
  const [blockImagePosition, setBlockImagePosition] = useState('full_width');
  const [blockImageCaption, setBlockImageCaption] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);

  const handleSaveNews = async () => {
    if (!newsForm.title.trim()) {
      toast.error('Please enter a news title');
      return;
    }

    try {
      setSavingNews(true);
      
      if (editingNews) {
        await updateNewsItem(hotelSlug, editingNews.id, newsForm);
        toast.success('News updated successfully');
      } else {
        await createNewsItem(hotelSlug, {
          section: section.id,
          ...newsForm,
          sort_order: newsItems.length,
        });
        toast.success('News created successfully');
      }
      
      setShowAddNews(false);
      setEditingNews(null);
      setNewsForm({ title: '', date: new Date().toISOString().split('T')[0], summary: '' });
      onUpdate();
    } catch (error) {
      console.error('Failed to save news:', error);
      toast.error('Failed to save news');
    } finally {
      setSavingNews(false);
    }
  };

  const handleDeleteNews = async (newsId, newsTitle) => {
    if (!confirm(`Delete news "${newsTitle}"? This will also delete all content blocks.`)) {
      return;
    }

    try {
      await deleteNewsItem(hotelSlug, newsId);
      toast.success('News deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete news:', error);
      toast.error('Failed to delete news');
    }
  };

  const handleAddContentBlock = async () => {
    if (blockType === 'text' && !blockText.trim()) {
      toast.error('Please enter text content');
      return;
    }

    if (!showAddBlock) return;

    try {
      setSavingBlock(true);
      
      const blockData = {
        news_item: showAddBlock,
        block_type: blockType,
        sort_order: 0,
      };

      if (blockType === 'text') {
        blockData.body = blockText;
      } else {
        blockData.image_position = blockImagePosition;
        blockData.image_caption = blockImageCaption;
      }

      const result = await createContentBlock(hotelSlug, blockData);
      
      toast.success('Content block created successfully');
      
      // If it's an image block, we need to upload the image
      if (blockType === 'image') {
        setUploadingImage(result.id);
      } else {
        setShowAddBlock(null);
        setBlockText('');
        setBlockImageCaption('');
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to add content block:', error);
      toast.error('Failed to add content block');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleUploadBlockImage = async (blockId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadContentBlockImage(hotelSlug, blockId, file);
      toast.success('Image uploaded successfully');
      setUploadingImage(null);
      setShowAddBlock(null);
      setBlockText('');
      setBlockImageCaption('');
      onUpdate();
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Delete this content block?')) return;

    try {
      await deleteContentBlock(hotelSlug, blockId);
      toast.success('Content block deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete content block:', error);
      toast.error('Failed to delete content block');
    }
  };

  const openEditNews = (news) => {
    setEditingNews(news);
    setNewsForm({
      title: news.title,
      date: news.date,
      summary: news.summary || '',
    });
    setShowAddNews(true);
  };

  const closeNewsModal = () => {
    setShowAddNews(false);
    setEditingNews(null);
    setNewsForm({ title: '', date: new Date().toISOString().split('T')[0], summary: '' });
  };

  const closeBlockModal = () => {
    setShowAddBlock(null);
    setBlockType('text');
    setBlockText('');
    setBlockImagePosition('full_width');
    setBlockImageCaption('');
    setUploadingImage(null);
  };

  return (
    <Card className="mb-3">
      <Card.Header className="bg-warning text-dark d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-newspaper me-2"></i>
          News Section
        </h5>
        <Button
          variant="dark"
          size="sm"
          onClick={() => setShowAddNews(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add News
        </Button>
      </Card.Header>
      <Card.Body>
        {newsItems.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-newspaper" style={{ fontSize: '3rem' }}></i>
            <p className="mt-2">No news yet. Click "Add News" to create one.</p>
          </div>
        ) : (
          newsItems.map((news) => (
            <Card key={news.id} className="mb-3">
              <Card.Header>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="mb-1">{news.title}</h6>
                    <small className="text-muted">
                      <i className="bi bi-calendar me-1"></i>
                      {new Date(news.date).toLocaleDateString()}
                    </small>
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => setExpandedNews(expandedNews === news.id ? null : news.id)}
                    >
                      <i className={`bi bi-chevron-${expandedNews === news.id ? 'up' : 'down'}`}></i>
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => openEditNews(news)}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteNews(news.id, news.title)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </div>
                {news.summary && (
                  <p className="mt-2 mb-0 small text-muted">{news.summary}</p>
                )}
              </Card.Header>
              
              {expandedNews === news.id && (
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6>Content Blocks</h6>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowAddBlock(news.id)}
                    >
                      <i className="bi bi-plus me-1"></i>
                      Add Block
                    </Button>
                  </div>

                  {news.content_blocks && news.content_blocks.length > 0 ? (
                    news.content_blocks.map((block) => (
                      <Card key={block.id} className="mb-2">
                        <Card.Body>
                          <div className="d-flex justify-content-between">
                            <div className="flex-grow-1">
                              {block.block_type === 'text' ? (
                                <>
                                  <small className="text-muted">
                                    <i className="bi bi-text-paragraph me-1"></i>
                                    Text Block
                                  </small>
                                  <p className="mb-0 mt-2">{block.body}</p>
                                </>
                              ) : (
                                <>
                                  <small className="text-muted">
                                    <i className="bi bi-image me-1"></i>
                                    Image Block ({block.image_position})
                                  </small>
                                  {block.image_url && (
                                    <img
                                      src={block.image_url}
                                      alt={block.image_caption || 'News image'}
                                      className="mt-2 rounded"
                                      style={{ maxWidth: '100%', maxHeight: '200px' }}
                                    />
                                  )}
                                  {block.image_caption && (
                                    <p className="mt-2 mb-0 small text-muted">{block.image_caption}</p>
                                  )}
                                </>
                              )}
                            </div>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteBlock(block.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    ))
                  ) : (
                    <Alert variant="info" className="mb-0">
                      No content blocks yet. Click "Add Block" to add text or images.
                    </Alert>
                  )}
                </Card.Body>
              )}
            </Card>
          ))
        )}
      </Card.Body>

      {/* Add/Edit News Modal */}
      <Modal show={showAddNews} onHide={closeNewsModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingNews ? 'Edit News' : 'Add News'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title *</Form.Label>
            <Form.Control
              type="text"
              value={newsForm.title}
              onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
              placeholder="News title"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Date *</Form.Label>
            <Form.Control
              type="date"
              value={newsForm.date}
              onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Summary</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newsForm.summary}
              onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
              placeholder="Brief summary (optional)"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeNewsModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveNews} disabled={savingNews}>
            {savingNews ? 'Saving...' : 'Save News'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Content Block Modal */}
      <Modal show={!!showAddBlock} onHide={closeBlockModal}>
        <Modal.Header closeButton>
          <Modal.Title>Add Content Block</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Block Type</Form.Label>
            <Form.Select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              disabled={!!uploadingImage}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
            </Form.Select>
          </Form.Group>

          {blockType === 'text' ? (
            <Form.Group className="mb-3">
              <Form.Label>Text Content *</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={blockText}
                onChange={(e) => setBlockText(e.target.value)}
                placeholder="Enter text content"
              />
            </Form.Group>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Image Position</Form.Label>
                <Form.Select
                  value={blockImagePosition}
                  onChange={(e) => setBlockImagePosition(e.target.value)}
                  disabled={!!uploadingImage}
                >
                  <option value="full_width">Full Width</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="inline_grid">Inline Grid</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Image Caption</Form.Label>
                <Form.Control
                  type="text"
                  value={blockImageCaption}
                  onChange={(e) => setBlockImageCaption(e.target.value)}
                  placeholder="Image caption (optional)"
                  disabled={!!uploadingImage}
                />
              </Form.Group>

              {uploadingImage && (
                <Form.Group className="mb-3">
                  <Form.Label>Upload Image *</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadBlockImage(uploadingImage, e)}
                  />
                  <Form.Text className="text-muted">
                    Block created. Now upload the image.
                  </Form.Text>
                </Form.Group>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeBlockModal}>
            Cancel
          </Button>
          {!uploadingImage && (
            <Button variant="primary" onClick={handleAddContentBlock} disabled={savingBlock}>
              {savingBlock ? 'Creating...' : 'Add Block'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default NewsSectionEditor;
