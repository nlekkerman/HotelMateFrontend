import { useState } from 'react';
import { toast } from 'react-toastify';
import { createListContainer, createCard, uploadCardImage } from '@/services/sectionEditorApi';

/**
 * Custom hook for managing list and card creation actions
 */
export const useListSectionActions = (hotelSlug, section, onUpdate) => {
  const [showAddList, setShowAddList] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
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

  return {
    // List state
    showAddList,
    setShowAddList,
    listForm,
    setListForm,
    
    // Card state
    showAddCard,
    selectedList,
    cardForm,
    setCardForm,
    cardImage,
    setCardImage,
    
    // Actions
    handleCreateList,
    handleCreateCard,
    openAddCard,
    closeListModal,
    closeCardModal,
    
    // Loading state
    saving,
  };
};
