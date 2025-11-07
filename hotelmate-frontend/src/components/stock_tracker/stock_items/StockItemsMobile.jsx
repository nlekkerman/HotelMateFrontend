import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { FaPlus, FaFilter, FaTimes } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import { useStockItems } from '../hooks/useStockItems';
import StockItemCard from './StockItemCard';
import StockItemDetail from './StockItemDetail';
import { StockItemModal } from '../modals/StockItemModal';

const StockItemsMobile = () => {
  const { hotel_slug } = useParams();
  const { items, categories, loading, error, fetchItems, createItem, updateItem, deleteItem } = useStockItems(hotel_slug);
  
  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // For detail view

  // Monitor modal state
  useEffect(() => {
    console.log('showModal changed to:', showModal);
  }, [showModal]);

  // Filter items
  useEffect(() => {
    let result = items;

    // Filter by category
    if (selectedCategory) {
      result = result.filter(item => item.category === parseInt(selectedCategory));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        (item.product_type && item.product_type.toLowerCase().includes(searchLower))
      );
    }

    // Filter low stock (items with full_units <= 2)
    if (showLowStock) {
      result = result.filter(item => parseFloat(item.current_full_units || 0) <= 2);
    }

    setFilteredItems(result);
  }, [items, selectedCategory, searchTerm, showLowStock]);

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const handleBackToList = () => {
    setSelectedItem(null);
  };

  const handleSave = async (itemData) => {
    try {
      console.log('handleSave called in StockItemsMobile');
      console.log('Item data received:', itemData);
      console.log('Is editing:', !!editingItem);
      
      // Add hotel field from localStorage
      const dataWithHotel = {
        ...itemData,
        hotel: user?.hotel_id
      };
      console.log('Data with hotel field:', dataWithHotel);
      
      if (editingItem) {
        console.log('Updating item ID:', editingItem.id);
        await updateItem(editingItem.id, dataWithHotel);
        console.log('Item updated successfully');
      } else {
        console.log('Creating new item');
        const result = await createItem(dataWithHotel);
        console.log('Item created successfully:', result);
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving item:', err);
      throw err;
    }
  };

  const handleAddNew = () => {
    console.log('handleAddNew called');
    console.log('Current showModal:', showModal);
    setEditingItem(null);
    setShowModal(true);
    console.log('Setting showModal to true');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setShowLowStock(false);
  };

  const activeFiltersCount = [selectedCategory, searchTerm, showLowStock].filter(Boolean).length;

  // If an item is selected, show the detail view
  if (selectedItem) {
    return (
      <StockItemDetail
        item={selectedItem}
        categories={categories}
        onBack={handleBackToList}
        onUpdate={updateItem}
        onDelete={deleteItem}
      />
    );
  }

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">Error: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-3 px-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Stock Items</h4>
        <Button 
          variant="primary" 
          size="sm" 
          onClick={handleAddNew}
          style={{ 
            backgroundColor: 'red',
            color: 'white',
            border: 'none',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <FaPlus /> Add
        </Button>
      </div>

      {/* Search Bar */}
      <Form.Group className="mb-3">
        <Form.Control
          type="text"
          placeholder="Search by name, SKU, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="lg"
        />
      </Form.Group>

      {/* Filter Toggle */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button 
          variant={showFilters ? "secondary" : "outline-secondary"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FaFilter /> Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>

        {activeFiltersCount > 0 && (
          <Button 
            variant="outline-danger" 
            size="sm"
            onClick={clearFilters}
          >
            <FaTimes /> Clear
          </Button>
        )}

        <div className="text-muted">
          {filteredItems.length} items
        </div>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="mb-3 p-3 bg-light rounded">
          <Form.Group className="mb-3">
            <Form.Label>Category</Form.Label>
            <Form.Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Check
            type="checkbox"
            label="Show only low stock items (≤ 2 full units)"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
          />
        </div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Alert variant="info">
          No items found. {activeFiltersCount > 0 && 'Try adjusting your filters.'}
        </Alert>
      ) : (
        <div>
          {filteredItems.map(item => (
            <StockItemCard
              key={item.id}
              item={item}
              onClick={handleItemClick}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <StockItemModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        item={editingItem}
        categories={categories}
        hotelSlug={hotel_slug}
      />
    </Container>
  );
};

export default StockItemsMobile;
