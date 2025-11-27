import { useState } from 'react';
import { toast } from 'react-toastify';
import { createListContainer, createCard, uploadCardImage, updateCard, deleteCard } from '@/services/sectionEditorApi';

/**
 * Custom hook for managing list and card creation actions
 */
export const useListSectionActions = (hotelSlug, section, onUpdate) => {
  const [showAddList, setShowAddList] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [listForm, setListForm] = useState({ title: '' });
  const [cardForm, setCardForm] = useState({ title: '', subtitle: '', description: '' });
  const [cardImage, setCardImage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create new list
  const handleCreateList = async () => {
    if (!listForm.title.trim()) {
      toast.error('Please enter a list title');
      return;
    }

    try {
      setSaving(true);
      await createListContainer(hotelSlug, {
        section: section.id,
        title: listForm.title,
        sort_order: section.lists?.length || 0,
      });
      toast.success('List created successfully');
      setListForm({ title: '' });
      setShowAddList(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to create list:', error);
      toast.error('Failed to create list');
    } finally {
      setSaving(false);
    }
  };

  // Create new card
  const handleCreateCard = async () => {
    if (!cardForm.title.trim()) {
      toast.error('Please enter a card title');
      return;
    }

    try {
      setSaving(true);
      const newCard = await createCard(hotelSlug, {
        list_container: selectedList.id,
        title: cardForm.title,
        subtitle: cardForm.subtitle,
        description: cardForm.description,
        sort_order: selectedList.cards?.length || 0,
      });

      // Upload image if provided
      if (cardImage) {
        await uploadCardImage(hotelSlug, newCard.id, cardImage);
      }

      toast.success('Card created successfully');
      setCardForm({ title: '', subtitle: '', description: '' });
      setCardImage(null);
      setShowAddCard(false);
      setSelectedList(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to create card:', error);
      toast.error('Failed to create card');
    } finally {
      setSaving(false);
    }
  };

  // Open add card modal for specific list
  const openAddCard = (list) => {
    setSelectedList(list);
    setShowAddCard(true);
  };

  // Open edit card modal
  const openEditCard = (card, list) => {
    setSelectedCard(card);
    setSelectedList(list);
    setCardForm({
      title: card.title || '',
      subtitle: card.subtitle || '',
      description: card.description || '',
    });
    setShowEditCard(true);
  };

  // Update existing card
  const handleUpdateCard = async () => {
    if (!cardForm.title.trim()) {
      toast.error('Please enter a card title');
      return;
    }

    try {
      setSaving(true);
      await updateCard(hotelSlug, selectedCard.id, {
        title: cardForm.title,
        subtitle: cardForm.subtitle,
        description: cardForm.description,
      });

      // Upload new image if provided
      if (cardImage) {
        await uploadCardImage(hotelSlug, selectedCard.id, cardImage);
      }

      toast.success('Card updated successfully');
      closeEditModal();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update card:', error);
      toast.error('Failed to update card');
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteConfirm = (card) => {
    setSelectedCard(card);
    setShowDeleteConfirm(true);
  };

  // Delete card
  const handleDeleteCard = async () => {
    try {
      setSaving(true);
      await deleteCard(hotelSlug, selectedCard.id);
      toast.success('Card deleted successfully');
      closeDeleteConfirm();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete card:', error);
      toast.error('Failed to delete card');
    } finally {
      setSaving(false);
    }
  };

  // Close modals and reset forms
  const closeListModal = () => {
    setShowAddList(false);
    setListForm({ title: '' });
  };

  const closeCardModal = () => {
    setShowAddCard(false);
    setSelectedList(null);
    setCardForm({ title: '', subtitle: '', description: '' });
    setCardImage(null);
  };

  const closeEditModal = () => {
    setShowEditCard(false);
    setSelectedCard(null);
    setSelectedList(null);
    setCardForm({ title: '', subtitle: '', description: '' });
    setCardImage(null);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setSelectedCard(null);
  };

  return {
    // List state
    showAddList,
    setShowAddList,
    listForm,
    setListForm,
    
    // Card state
    showAddCard,
    showEditCard,
    showDeleteConfirm,
    selectedList,
    selectedCard,
    cardForm,
    setCardForm,
    cardImage,
    setCardImage,
    
    // Actions
    handleCreateList,
    handleCreateCard,
    handleUpdateCard,
    handleDeleteCard,
    openAddCard,
    openEditCard,
    openDeleteConfirm,
    closeListModal,
    closeCardModal,
    closeEditModal,
    closeDeleteConfirm,
    
    // Loading state
    saving,
  };
};
