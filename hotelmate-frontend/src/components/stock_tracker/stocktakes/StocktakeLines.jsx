/**
 * StocktakeLines Component
 * 
 * ✅ BACKEND CALCULATES ALL VALUES - Frontend only displays
 * ✅ NO OPTIMISTIC UPDATES - Pusher handles real-time sync
 * ✅ FRONTEND VALIDATES INPUT FORMAT ONLY - No business logic calculations
 * 
 * Architecture:
 * 1. User enters counted values → Frontend validates format → Sends to backend
 * 2. Backend calculates everything → Saves to database → Broadcasts via Pusher
 * 3. All clients receive Pusher event → Update UI with backend values
 * 
 * What Frontend Does:
 * - Validates user input format (whole numbers for B/M-Doz, 2 decimals for D/S/W)
 * - Sends counted_full_units and counted_partial_units to backend
 * - Displays backend values directly (expected, counted, variance, values)
 * - Updates UI from Pusher events (real-time sync across all users)
 * 
 * What Backend Does:
 * - Calculates expected_qty = opening + purchases - waste
 * - Calculates counted_qty from user input with category-specific formulas
 * - Calculates variance_qty = counted - expected
 * - Converts to display units with category-specific rounding
 * - Calculates all values (€) using frozen valuation_cost
 * 
 * See: BACKEND_API_COMPLETE_REFERENCE_FOR_FRONTEND.md for full API documentation
 */
import React, { useState, useContext } from 'react';
import { Card, Table, Form, Button, Badge } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';
import { getCountingLabels } from '../utils/categoryHelpers';
import { SubcategoryBadge, getSubcategoryHelpText } from '../utils/SubcategoryBadge';
import { CategoryTotalsRow } from './CategoryTotalsRow';
import { useCategoryTotals } from '../hooks/useCategoryTotals';
import { MovementsList } from './MovementsList';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  validatePartialUnits,
  formatUserInput,
  getInputConfig
} from '../utils/stocktakeCalculations';

export const StocktakeLines = ({ lines = [], isLocked, onUpdateLine, onLineUpdated, hotelSlug, stocktakeId }) => {
  const { user } = useAuth();
  const [lineInputs, setLineInputs] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [showPurchases, setShowPurchases] = useState({});
  const [showWaste, setShowWaste] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const { categoryTotals, loading: totalsLoading, refetch: refetchTotals } =
    useCategoryTotals(hotelSlug, stocktakeId);

  // Clear ALL validation errors when clicking anywhere
  React.useEffect(() => {
    const handleClickAnywhere = (e) => {
      // Check if click is on a Save button (don't clear errors when clicking Save)
      const isSaveButton = e.target.closest('button')?.textContent?.includes('Save');
      if (!isSaveButton && Object.keys(validationErrors).length > 0) {
        setValidationErrors({});
      }
    };

    document.addEventListener('click', handleClickAnywhere);
    return () => document.removeEventListener('click', handleClickAnywhere);
  }, [validationErrors]);

  // Filter lines based on search term (includes subcategories)
  const filteredLines = searchTerm
    ? lines.filter(line => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (line.item_name || '').toLowerCase().includes(searchLower) ||
          (line.item_sku || '').toLowerCase().includes(searchLower) ||
          (line.category_name || '').toLowerCase().includes(searchLower) ||
          (line.subcategory || '').toLowerCase().includes(searchLower) ||
          (line.subcategory_name || '').toLowerCase().includes(searchLower)
        );
      })
    : lines;

  // Auto-scroll to first search result
  React.useEffect(() => {
    if (searchTerm && filteredLines.length > 0) {
      const firstCategory = filteredLines[0]?.category_name || 'Uncategorized';
      setTimeout(() => {
        scrollToCategory(firstCategory);
      }, 100);
    }
  }, [searchTerm, filteredLines.length]);

  // Group lines by category name and sort by item name within each category
  const groupedLines = filteredLines.reduce((acc, line) => {
    const cat = line.category_name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(line);
    return acc;
  }, {});

  // Sort items alphabetically by name within each category
  Object.keys(groupedLines).forEach(category => {
    groupedLines[category].sort((a, b) => {
      const nameA = (a.item_name || '').toLowerCase();
      const nameB = (b.item_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  // Function to scroll to category
  const scrollToCategory = (categoryName) => {
    const element = document.getElementById(`category-${categoryName}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getLineInputs = (lineId, line) => {
    // If user has interacted with this line, return their input state
    if (lineInputs[lineId]) return lineInputs[lineId];
    
    // For SYRUPS, WINES, SPIRITS, and BIB: combine full + partial from backend into single fullUnits field
    if (line.subcategory_name === 'SYRUPS' || line.subcategory === 'SYRUPS' ||
        line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') {
      const combinedValue = (Number(line.counted_full_units || 0) + Number(line.counted_partial_units || 0));
      return {
        fullUnits: combinedValue !== 0 ? combinedValue.toFixed(2) : '',  // ✅ Always show combined value
        partialUnits: '',  // ✅ Hide partialUnits
        wasteQuantity: '',
        purchasesQty: '',
        openingFullUnits: '',
        openingPartialUnits: '',
      };
    }
    
    return {
      fullUnits:
        line.counted_full_units !== null && line.counted_full_units !== undefined
          ? line.counted_full_units
          : '',
      partialUnits:
        line.counted_partial_units !== null && line.counted_partial_units !== undefined
          ? line.counted_partial_units
          : '',
      wasteQuantity: '',
      purchasesQty: '',
      openingFullUnits: '',
      openingPartialUnits: '',
    };
  };

  const updateLineInput = (lineId, field, value) => {
    setLineInputs((prev) => {
      const current = prev[lineId] || {
        fullUnits: '',
        partialUnits: '',
        wasteQuantity: '',
        purchasesQty: '',
        openingFullUnits: '',
        openingPartialUnits: '',
      };
      return {
        ...prev,
        [lineId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const validateInputs = (line, inputs) => {
    const errors = {};
    const categoryCode = line.category_code;
    const size = line.item_size;
    const subcategory = line.subcategory;
    const uom = parseFloat(line.item_uom || line.uom || 1);
    
    // Get labels to access partialMax from API if available
    const labels = getCountingLabels(categoryCode, size, line.input_fields, subcategory);
    
    // Get input config for this category
    const config = getInputConfig({ category_code: categoryCode, item_size: size, subcategory });
    
    // Validate counted full units (always whole numbers) - Skip for SYRUPS
    if (labels.showFull !== false && inputs.fullUnits !== '') {
      const full = parseInt(inputs.fullUnits, 10);
      if (isNaN(full)) {
        errors.fullUnits = 'Please enter a valid whole number.';
      } else if (full < 0) {
        errors.fullUnits = 'Must be 0 or greater';
      }
    }
    
    // Validate counted partial units (category-specific decimal rules)
    if (inputs.partialUnits !== '') {
      const partial = parseFloat(inputs.partialUnits);
      
      if (isNaN(partial)) {
        errors.partialUnits = 'Please enter a valid number.';
      } else if (partial < 0) {
        errors.partialUnits = 'Must be 0 or greater';
      } else {
        // ✅ Subcategory-specific validation for Minerals
        if (categoryCode === 'M' && subcategory === 'SYRUPS') {
          // SYRUPS: Single total bottles field with decimals (e.g., 10.5, 100.567)
          // Allow decimals up to 3 places, NO max limit
          const rounded = parseFloat(partial.toFixed(3));
          if (Math.abs(partial - rounded) > 0.0001) {
            errors.partialUnits = 'Maximum 3 decimal places allowed';
          }
          // NO max constraint - can be any positive amount
        } else if (categoryCode === 'M' && subcategory === 'JUICES') {
          // JUICES: bottles with decimals (e.g., 8.008 = 8 bottles + 8ml)
          // Allow decimals up to 3 places for ml tracking
          const rounded = parseFloat(partial.toFixed(3));
          if (Math.abs(partial - rounded) > 0.0001) {
            errors.partialUnits = 'Maximum 3 decimal places allowed';
          }
          // NO max constraint - bottles can be any reasonable amount
        } else if (categoryCode === 'M' && subcategory === 'BULK_JUICES') {
          // BULK_JUICES: fractional bottles (0.5 = half bottle, max 0.99)
          // Allow step of 0.5 (half bottles)
          if (partial > 0.99) {
            errors.partialUnits = 'Partial must be 0.99 or less (0.5 = half bottle)';
          }
        } else if (labels.partialMax && partial > labels.partialMax) {
          // ✅ Check API-provided max value for other subcategories (e.g., SOFT_DRINKS max=11)
          errors.partialUnits = `${labels.partialLabel} cannot exceed ${labels.partialMax}`;
        } else if (categoryCode === 'B') {
          // Bottled Beer - whole numbers only, max = uom - 1
          if (partial !== Math.round(partial)) {
            errors.partialUnits = 'Bottled beer must be whole bottles (no decimals)';
          } else if (partial >= uom) {
            errors.partialUnits = `Must be 0–${uom - 1} bottles`;
          }
        } else if (categoryCode === 'M' && size?.includes('Doz')) {
          // Dozen minerals - whole numbers only, max 11
          if (partial !== Math.round(partial)) {
            errors.partialUnits = 'Dozen items must be whole numbers (no decimals)';
          } else if (partial > 11) {
            errors.partialUnits = 'Must be 0–11 bottles';
          }
        } else {
          // D, S, W, M (non-dozen) - max 2 decimals
          const rounded = parseFloat(partial.toFixed(2));
          if (Math.abs(partial - rounded) > 0.001) {
            errors.partialUnits = 'Maximum 2 decimal places allowed';
          }
          if (partial >= uom) {
            errors.partialUnits = `Must be less than ${uom}`;
          }
        }
      }
    }
    
    // Validate waste (always allows 2 decimals)
    if (inputs.wasteQuantity !== '' && isNaN(parseFloat(inputs.wasteQuantity))) {
      errors.wasteQuantity = 'Please enter a valid number.';
    } else {
      const waste = inputs.wasteQuantity !== '' ? parseFloat(inputs.wasteQuantity) : null;
      if (waste !== null && waste < 0) errors.wasteQuantity = 'Must be 0 or greater';
    }
    
    // Validate purchases (always allows 2 decimals)
    if (inputs.purchasesQty !== '' && isNaN(parseFloat(inputs.purchasesQty))) {
      errors.purchasesQty = 'Please enter a valid number.';
    } else {
      const purchase = inputs.purchasesQty !== '' ? parseFloat(inputs.purchasesQty) : null;
      if (purchase !== null && purchase < 0) errors.purchasesQty = 'Must be 0 or greater';
    }
    
    return errors;
  };

  const handleClear = (lineId, line) => {
    setLineInputs((prev) => ({
      ...prev,
      [lineId]: {
        fullUnits:
          line.counted_full_units !== null && line.counted_full_units !== undefined
            ? line.counted_full_units
            : '',
        partialUnits:
          line.counted_partial_units !== null && line.counted_partial_units !== undefined
            ? line.counted_partial_units
            : '',
        wasteQuantity: '',
        purchasesQty: '',
      },
    }));
    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });
    setShowPurchases((p) => ({ ...p, [lineId]: false }));
    setShowWaste((p) => ({ ...p, [lineId]: false }));
  };

  /**
   * Handles saving counted quantities (cases and bottles).
   * Backend expects: { counted_full_units, counted_partial_units }
   * NO optimistic updates - update from backend response only
   * 
   * ✅ SYRUPS SPECIAL HANDLING:
   * User enters: 10.5 bottles (single decimal input)
   * Frontend splits: full_units=10, partial_units=0.5
   * Backend receives TWO fields for proper storage
   */
  const handleSaveCount = async (lineId, line) => {
    console.log('💾 SAVE COUNT - Line:', lineId);
    const inputs = getLineInputs(lineId, line);
    console.log('📥 Raw inputs:', inputs);
    
    // Clear any previous validation errors
    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });

    // Parse inputs - send whatever user entered, backend will validate
    let fullUnits, partialUnits;
    
    // ✅ SYRUPS, WINES, SPIRITS, and BIB: Read from fullUnits field and split into full + partial
    // SYRUPS: User enters 10.5 bottles → full=10, partial=0.5
    // BIB: User enters 2.5 boxes → full=2, partial=0.5
    // SPIRITS/WINE: User enters 7.6 bottles → full=7, partial=0.6
    if ((line.category_code === 'M' && line.subcategory === 'SYRUPS') ||
        line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') {
      const combinedValue = parseFloat(inputs.fullUnits);
      if (isNaN(combinedValue)) {
        fullUnits = 0;
        partialUnits = 0;
      } else {
        fullUnits = Math.floor(combinedValue);  // 10 bottles or 2 boxes
        partialUnits = parseFloat((combinedValue - fullUnits).toFixed(3));  // 0.5
      }
      console.log('🍯 Combined value split (SYRUPS/BIB/WINE/SPIRITS):', { 
        category: line.category_code, 
        subcategory: line.subcategory,
        original: inputs.fullUnits, 
        full: fullUnits, 
        partial: partialUnits 
      });
    } else {
      // Normal categories: separate full and partial
      fullUnits = parseInt(inputs.fullUnits, 10);
      if (isNaN(fullUnits)) fullUnits = 0;
      
      partialUnits = parseFloat(inputs.partialUnits);
      if (isNaN(partialUnits)) partialUnits = 0;
    }
    
    console.log('🔢 Parsed values:', { fullUnits, partialUnits });
    
    // NO frontend validation - backend handles all validation
    // Just send the raw values to backend

    try {
      const payload = {
        counted_full_units: fullUnits,
        counted_partial_units: partialUnits,
      };
      
      console.log('🧮 Count Payload:', payload);

      // ✅ CORRECT ENDPOINT: /api/stock_tracker/{hotel_identifier}/stocktake-lines/{id}/
      const response = await api.patch(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/`,
        payload
      );

      console.log('✅ Count saved - Updating UI from backend:', {
        counted_full_units: response.data?.counted_full_units,
        counted_partial_units: response.data?.counted_partial_units,
        counted_qty: response.data?.counted_qty,
        variance_qty: response.data?.variance_qty
      });

      // Update with authoritative backend data (no optimistic update)
      if (response.data && typeof onLineUpdated === 'function') {
        onLineUpdated(response.data);
      }
      
      // Refetch totals to update category summaries
      refetchTotals?.();
    } catch (err) {
      console.error('❌ Save count failed:', err);
      console.error('Error details:', err.response?.data);
      
      setValidationErrors({
        [lineId]: { general: `Failed to save count: ${err.response?.data?.message || err.message}` }
      });
    }
  };

  /**
   * Handles saving purchases.
   * Backend expects: { movement_type: 'PURCHASE', quantity, notes }
   */
  const handleSavePurchases = async (lineId, line) => {
    console.log('\n🚀 ========== SAVE PURCHASES START ==========');
    console.log('📋 Line ID:', lineId);
    console.log('📦 Item:', line.item_name, '(SKU:', line.item_sku + ')');
    console.log('👤 Current User:', user ? { id: user.id, name: user.staff_name || user.username } : 'NOT FOUND');
    
    const inputs = getLineInputs(lineId, line);
    console.log('📝 Inputs:', inputs);
    
    if (!inputs.purchasesQty || inputs.purchasesQty === '') {
      console.warn('❌ Validation failed: Empty quantity');
      setValidationErrors({ [lineId]: { purchasesQty: 'Please enter a purchases quantity' } });
      return;
    }

    const purchasesQty = parseFloat(inputs.purchasesQty);
    console.log('🔢 Parsed quantity:', purchasesQty);
    
    if (isNaN(purchasesQty) || purchasesQty <= 0) {
      console.warn('❌ Validation failed: Invalid quantity');
      setValidationErrors({ [lineId]: { purchasesQty: 'Must be a valid number greater than 0' } });
      return;
    }

    console.log('✅ Validation passed');
    
    // Clear error only if validation passes
    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });

    try {
      const payload = {
        movement_type: 'PURCHASE',
        quantity: purchasesQty,
        notes: 'Added via stocktake',
      };
      
      // Add staff info if available
      if (user) {
        if (user.id) payload.staff_id = user.id;
        if (user.staff_name) payload.staff_name = user.staff_name;
        if (user.username && !user.staff_name) payload.staff_name = user.username;
      }
      
      console.log('📤 Payload:', JSON.stringify(payload, null, 2));
      console.log('🌐 Endpoint:', `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`);

      console.log('⏳ Sending request...');
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`,
        payload
      );

      console.log('📥 Response received!');
      console.log('📊 Status:', response.status);
      console.log('📦 Full response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns updated line in response.data.line
      const updatedLine = response.data.line || response.data;
      
      if (!updatedLine) {
        console.error('❌ No updated line in response!');
        console.error('Response structure:', Object.keys(response.data));
        return;
      }
      
      console.log('✅ Purchases saved successfully!');
      console.log('📈 Line updates:', {
        id: updatedLine.id,
        purchases_OLD: line.purchases,
        purchases_NEW: updatedLine.purchases,
        expected_qty_OLD: line.expected_qty,
        expected_qty_NEW: updatedLine.expected_qty,
        variance_qty_NEW: updatedLine.variance_qty,
      });
      
      // Update UI silently with backend data (no optimistic update)
      console.log('🔄 Checking onLineUpdated callback...');
      console.log('   - updatedLine exists:', !!updatedLine);
      console.log('   - onLineUpdated type:', typeof onLineUpdated);
      console.log('   - onLineUpdated is function:', typeof onLineUpdated === 'function');
      
      if (updatedLine && typeof onLineUpdated === 'function') {
        console.log('🔄 Calling onLineUpdated with line:', updatedLine.id);
        try {
          onLineUpdated(updatedLine);
          console.log('✅ onLineUpdated callback executed successfully');
        } catch (callbackErr) {
          console.error('❌ onLineUpdated callback failed:', callbackErr);
        }
      } else {
        console.warn('⚠️ Cannot update UI!');
        console.warn('   updatedLine:', !!updatedLine);
        console.warn('   onLineUpdated:', typeof onLineUpdated);
      }

      // Clear input after successful save
      console.log('🧹 Clearing input...');
      setLineInputs((prev) => ({
        ...prev,
        [lineId]: {
          ...prev[lineId],
          purchasesQty: '',
        },
      }));
      console.log('✅ Input cleared');
      
      // Refetch totals to update category summaries
      if (refetchTotals) {
        console.log('🔄 Refetching totals...');
        refetchTotals();
      }
      
      console.log('🎉 ========== SAVE PURCHASES COMPLETE ==========\n');
    } catch (err) {
      console.error('\n💥 ========== SAVE PURCHASES FAILED ==========');
      console.error('❌ Error:', err);
      console.error('📝 Message:', err.message);
      console.error('🌐 Status:', err.response?.status);
      console.error('📦 Response:', JSON.stringify(err.response?.data, null, 2));
      console.error('🔗 URL:', err.config?.url);
      
      setValidationErrors({
        [lineId]: { purchasesQty: `Failed to save: ${err.response?.data?.message || err.message}` }
      });
    }
  };

  /**
   * Handles saving waste.
   * Backend expects: { movement_type: 'WASTE', quantity, notes }
   */
  const handleSaveWaste = async (lineId, line) => {
    console.log('\n🚀 ========== SAVE WASTE START ==========');
    console.log('📋 Line ID:', lineId);
    console.log('📦 Item:', line.item_name, '(SKU:', line.item_sku + ')');
    console.log('👤 Current User:', user ? { id: user.id, name: user.staff_name || user.username } : 'NOT FOUND');
    
    const inputs = getLineInputs(lineId, line);
    console.log('📝 Inputs:', inputs);
    
    if (!inputs.wasteQuantity || inputs.wasteQuantity === '') {
      console.warn('❌ Validation failed: Empty quantity');
      setValidationErrors({ [lineId]: { wasteQuantity: 'Please enter a waste quantity' } });
      return;
    }

    const wasteQty = parseFloat(inputs.wasteQuantity);
    console.log('🔢 Parsed quantity:', wasteQty);
    
    if (isNaN(wasteQty) || wasteQty <= 0) {
      console.warn('❌ Validation failed: Invalid quantity');
      setValidationErrors({ [lineId]: { wasteQuantity: 'Must be a valid number greater than 0' } });
      return;
    }

    console.log('✅ Validation passed');
    
    // Clear error only if validation passes
    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });

    try {
      const payload = {
        movement_type: 'WASTE',
        quantity: wasteQty,
        notes: 'Added via stocktake',
      };
      
      // Add staff info if available
      if (user) {
        if (user.id) payload.staff_id = user.id;
        if (user.staff_name) payload.staff_name = user.staff_name;
        if (user.username && !user.staff_name) payload.staff_name = user.username;
      }
      
      console.log('📤 Payload:', JSON.stringify(payload, null, 2));
      console.log('🌐 Endpoint:', `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`);

      console.log('⏳ Sending request...');
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/add-movement/`,
        payload
      );

      console.log('📥 Response received!');
      console.log('📊 Status:', response.status);
      console.log('📦 Full response:', JSON.stringify(response.data, null, 2));
      
      // Backend returns updated line in response.data.line
      const updatedLine = response.data.line || response.data;
      
      if (!updatedLine) {
        console.error('❌ No updated line in response!');
        console.error('Response structure:', Object.keys(response.data));
        return;
      }
      
      console.log('✅ Waste saved successfully!');
      console.log('📈 Line updates:', {
        id: updatedLine.id,
        waste_OLD: line.waste,
        waste_NEW: updatedLine.waste,
        expected_qty_OLD: line.expected_qty,
        expected_qty_NEW: updatedLine.expected_qty,
        variance_qty_NEW: updatedLine.variance_qty,
      });
      
      // Update UI silently with backend data (no optimistic update)
      console.log('🔄 Checking onLineUpdated callback...');
      console.log('   - updatedLine exists:', !!updatedLine);
      console.log('   - onLineUpdated type:', typeof onLineUpdated);
      console.log('   - onLineUpdated is function:', typeof onLineUpdated === 'function');
      
      if (updatedLine && typeof onLineUpdated === 'function') {
        console.log('🔄 Calling onLineUpdated with line:', updatedLine.id);
        try {
          onLineUpdated(updatedLine);
          console.log('✅ onLineUpdated callback executed successfully');
        } catch (callbackErr) {
          console.error('❌ onLineUpdated callback failed:', callbackErr);
        }
      } else {
        console.warn('⚠️ Cannot update UI!');
        console.warn('   updatedLine:', !!updatedLine);
        console.warn('   onLineUpdated:', typeof onLineUpdated);
      }

      // Clear input after successful save
      console.log('🧹 Clearing input...');
      setLineInputs((prev) => ({
        ...prev,
        [lineId]: {
          ...prev[lineId],
          wasteQuantity: '',
        },
      }));
      console.log('✅ Input cleared');
      
      // Refetch totals to update category summaries
      if (refetchTotals) {
        console.log('🔄 Refetching totals...');
        refetchTotals();
      }
      
      console.log('🎉 ========== SAVE WASTE COMPLETE ==========\n');
    } catch (err) {
      console.error('\n💥 ========== SAVE WASTE FAILED ==========');
      console.error('❌ Error:', err);
      console.error('📝 Message:', err.message);
      console.error('🌐 Status:', err.response?.status);
      console.error('📦 Response:', JSON.stringify(err.response?.data, null, 2));
      console.error('🔗 URL:', err.config?.url);
      
      setValidationErrors({
        [lineId]: { wasteQuantity: `Failed to save: ${err.response?.data?.message || err.message}` }
      });
    }
  };

  /**
   * Handles saving opening stock (manual entry).
   * Backend expects: PATCH with opening_full_units and opening_partial_units
   * Backend will calculate opening_qty = (full × uom) + partial
   */
  const handleSaveOpeningStock = async (lineId, line) => {
    const inputs = getLineInputs(lineId, line);
    
    // Clear any previous validation errors
    setValidationErrors((prev) => {
      const { [lineId]: _, ...rest } = prev;
      return rest;
    });

    // Parse inputs - send whatever user entered, backend will validate
    let fullUnits = parseFloat(inputs.openingFullUnits) || 0;
    let partialUnits = parseFloat(inputs.openingPartialUnits) || 0;
    const uom = parseFloat(line.item_uom || line.uom || 1);

    try {
      // ✅ SYRUPS, SPIRITS, WINES & BIB: opening_qty = bottles/boxes directly (no conversion!)
      // User enters 10.5 → send opening_qty = 10.5
      let payload;
      
      if ((line.category_code === 'M' && line.subcategory === 'SYRUPS') || 
          line.subcategory === 'BIB' || 
          line.category_code === 'W' || 
          line.category_code === 'S') {
        payload = {
          opening_qty: parseFloat(partialUnits).toFixed(4)
        };
        console.log('🍯 Combined opening (SYRUPS/SPIRITS/WINES/BIB - bottles/boxes directly):', { 
          input: inputs.openingPartialUnits,
          opening_qty: partialUnits,
          category: line.category_code,
          subcategory: line.subcategory
        });
      } else {
        // Other categories: calculate from full + partial
        const opening_qty = (fullUnits * uom) + partialUnits;
        payload = {
          opening_qty: opening_qty.toFixed(4)
        };
      }
      
      console.log('🧮 Opening Stock Payload:', payload);

      // ✅ PATCH endpoint to update opening_qty
      const response = await api.patch(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/`,
        payload
      );

      const updatedLine = response.data;
      
      console.log('✅ Opening stock saved - Full backend response:', {
        opening_qty: updatedLine?.opening_qty,
        expected_qty: updatedLine?.expected_qty,
        variance_qty: updatedLine?.variance_qty,
        opening_display_full: updatedLine?.opening_display_full_units,
        opening_display_partial: updatedLine?.opening_display_partial_units
      });
      
      // Update UI with backend data
      if (updatedLine && typeof onLineUpdated === 'function') {
        console.log('🔄 Calling onLineUpdated with updated line');
        onLineUpdated(updatedLine);
      }

      // Clear inputs after successful save
      setLineInputs((prev) => ({
        ...prev,
        [lineId]: {
          ...prev[lineId],
          openingFullUnits: '',
          openingPartialUnits: '',
        },
      }));
      
      // Refetch totals to update category summaries
      refetchTotals?.();
    } catch (err) {
      console.error('❌ Save opening stock failed:', err);
      console.error('Error details:', err.response?.data);
      
      setValidationErrors({
        [lineId]: { 
          openingFullUnits: `Failed to save: ${err.response?.data?.message || err.message}` 
        }
      });
    }
  };

  const renderLineRow = (line) => {
    const labels = getCountingLabels(line.category_code, line.item_size, line.input_fields, line.subcategory);
    const uom = parseFloat(line.item_uom || line.uom || 1);
    const inputs = getLineInputs(line.id, line);
    const lineErrors = validationErrors[line.id] || {};
    const cumulativePurchases = parseFloat(line.purchases || 0);
    const cumulativeWaste = parseFloat(line.waste || 0);
    
    // Get input configuration for this category
    const inputConfig = getInputConfig({ category_code: line.category_code, item_size: line.item_size, subcategory: line.subcategory });

    // ✅ BACKEND CALCULATES ALL VALUES - Frontend only displays
    // No optimistic updates - Pusher handles real-time sync
    const varianceQty = parseFloat(line.variance_qty) || 0;
    const varianceValue = parseFloat(line.variance_value) || 0;
    
    // ✅ Use backend-calculated display units (already rounded per category rules)
    const varianceDisplayFull = line.variance_display_full_units || '0';
    const varianceDisplayPartial = line.variance_display_partial_units || '0';
    
    // Debug logging for SYRUPS variance
    if (line.subcategory === 'SYRUPS' && line.sku === 'M0006') {
      console.log('🔍 M0006 Variance Debug:', {
        sku: line.sku,
        name: line.name,
        variance_display_full_units: line.variance_display_full_units,
        variance_display_partial_units: line.variance_display_partial_units,
        varianceDisplayFull,
        varianceDisplayPartial,
        calculated: Number(varianceDisplayFull) + Number(varianceDisplayPartial)
      });
    }
    
    const isShortage = varianceValue < 0;
    const isSurplus = varianceValue > 0;
    const isSignificant = Math.abs(varianceValue) > 10;
    const bgClass = isShortage ? 'bg-danger-subtle' : isSurplus ? 'bg-success-subtle' : '';
    const textClass = isShortage ? 'text-danger' : isSurplus ? 'text-success' : 'text-muted';
    const strongClass = isSignificant ? 'fw-bold' : '';

    return (
      <tr key={line.id}>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <code className="small">{line.item_sku}</code>
        </td>
        <td style={{ borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column">
            <strong>{line.item_name}</strong>
            {line.subcategory && (
              <div className="mt-1">
                <SubcategoryBadge subcategory={line.subcategory} size="xs" />
              </div>
            )}
          </div>
        </td>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <Badge bg="secondary" className="small">
            {line.category_name || 'Uncategorized'}
          </Badge>
        </td>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          {line.item_size ? (
            <small className="text-muted">{line.item_size}</small>
          ) : (
            <small className="text-muted">-</small>
          )}
        </td>
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <Badge bg="light" text="dark" className="small">
            {uom.toFixed(0)}
          </Badge>
        </td>

        {/* Opening - Editable */}
        <td className="text-center bg-info-subtle" style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-2 p-2" style={{ width: '100%' }}>
            <div 
              className="border rounded bg-white shadow-sm p-2 w-100 d-flex flex-column align-items-center gap-2"
              style={{ minWidth: 180 }}
            >
              {/* SYRUPS, WINES, SPIRITS & BIB: Show current opening value above input */}
              {(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') && (line.opening_display_full_units || line.opening_display_partial_units || line.opening_qty) && (
                <div className="text-center mb-2 p-2 bg-info-subtle rounded">
                  <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>Current Opening</small>
                  <strong className="text-primary" style={{ fontSize: '0.9rem' }}>
                    {(Number(line.opening_display_full_units || 0) + Number(line.opening_display_partial_units || 0)).toFixed(2)} {line.subcategory === 'BIB' ? 'boxes' : line.category_code === 'S' ? 'bottles' : 'bottles'}
                  </strong>
                </div>
              )}
              
              {/* Input fields for editing opening stock */}
              <div className="d-flex flex-column gap-2 w-100">
                {/* Full Units - Hidden for SYRUPS, SPIRITS, WINES & BIB (combined decimal input) */}
                {labels.showFull !== false && line.subcategory !== 'SYRUPS' && line.subcategory !== 'BIB' && line.category_code !== 'W' && line.category_code !== 'S' && (
                  <div>
                    <small className="text-muted d-block text-center mb-1" style={{ fontSize: '0.7rem' }}>
                      {labels.unit}
                    </small>
                    <Form.Control
                      type="number"
                      step="1"
                      min="0"
                      size="sm"
                      value={inputs.openingFullUnits !== '' ? inputs.openingFullUnits : (line.opening_display_full_units || '0')}
                    onChange={(e) => {
                      const value = e.target.value;
                      // For B and M-Doz, only allow whole numbers
                      if (line.category_code === 'B' || (line.category_code === 'M' && line.item_size?.includes('Doz'))) {
                        if (value === '' || /^\d+$/.test(value)) {
                          updateLineInput(line.id, 'openingFullUnits', value);
                        }
                      } else {
                        updateLineInput(line.id, 'openingFullUnits', value);
                      }
                    }}
                    onFocus={(e) => {
                      e.target.classList.add('bg-info-subtle');
                      e.target.dataset.originalValue = e.target.value;
                      e.target.value = '';  // Clear on focus for new entry
                      if (lineErrors.openingFullUnits) {
                        setValidationErrors((prev) => {
                          const { [line.id]: lineErr, ...rest } = prev;
                          if (lineErr) {
                            const { openingFullUnits, ...otherErrors } = lineErr;
                            return Object.keys(otherErrors).length > 0 
                              ? { ...rest, [line.id]: otherErrors } 
                              : rest;
                          }
                          return rest;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      e.target.classList.remove('bg-info-subtle');
                      if (e.target.value === '') {
                        updateLineInput(line.id, 'openingFullUnits', '');  // Keep empty if no input
                      }
                    }}
                    className="bg-light text-center"
                    placeholder={`${labels.unit}`}
                    isInvalid={!!lineErrors.openingFullUnits}
                    disabled={isLocked}
                  />
                
                </div>
                )}

                {/* Partial Units (Combined input for SYRUPS, SPIRITS, WINES, BIB) */}
                <div>
                  <small className="text-muted d-block text-center mb-1" style={{ fontSize: '0.7rem' }}>
                    {(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S')
                      ? `${labels.servingUnit} (Full: ${Math.floor(Number(line.opening_display_full_units || 0) + Number(line.opening_display_partial_units || 0))} + Partial: ${((Number(line.opening_display_full_units || 0) + Number(line.opening_display_partial_units || 0)) % 1).toFixed(2)})`
                      : labels.servingUnit
                    }
                  </small>
                  <Form.Control
                    type="number"
                    step={(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') ? '0.01' : inputConfig.step}
                    min="0"
                    size="sm"
                    value={inputs.openingPartialUnits !== '' 
                      ? inputs.openingPartialUnits 
                      : ((line.category_code === 'M' && line.subcategory === 'SYRUPS') || line.category_code === 'S'
                          ? (parseFloat(line.opening_qty || 0).toFixed(2))
                          : (line.opening_display_partial_units || '0'))
                    }
                    onChange={(e) => updateLineInput(line.id, 'openingPartialUnits', e.target.value)}
                    onFocus={(e) => {
                      e.target.classList.add('bg-info-subtle');
                      e.target.dataset.originalValue = e.target.value;
                      e.target.value = '';  // Clear on focus for new entry
                      if (lineErrors.openingPartialUnits) {
                        setValidationErrors((prev) => {
                          const { [line.id]: lineErr, ...rest } = prev;
                          if (lineErr) {
                            const { openingPartialUnits, ...otherErrors } = lineErr;
                            return Object.keys(otherErrors).length > 0 
                              ? { ...rest, [line.id]: otherErrors } 
                              : rest;
                          }
                          return rest;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      e.target.classList.remove('bg-info-subtle');
                      if (e.target.value === '') {
                        updateLineInput(line.id, 'openingPartialUnits', '');  // Keep empty if no input
                      }
                    }}
                    className="bg-light text-center"
                    placeholder={
                      line.subcategory === 'BIB' ? 'boxes (e.g. 2.50)' :
                      (line.subcategory === 'SYRUPS' || line.category_code === 'W' || line.category_code === 'S') ? 'bottles (e.g. 10.50)' : 
                      labels.servingUnit
                    }
                    isInvalid={!!lineErrors.openingPartialUnits}
                    disabled={isLocked}
                  />
                    {/* Display opening stock in total bottles for Bottled Beer (cases) */}
                  {line.category_code === 'B' && line.item_size?.includes('Doz') && (
                    <small className="text-success d-block text-center mt-1" style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                      ({((parseFloat(line.opening_display_full_units || 0) * (line.uom || 12)) + parseFloat(line.opening_display_partial_units || 0))} bottles)
                    </small>
                  )}
                </div>
              </div>

              {(lineErrors.openingFullUnits || lineErrors.openingPartialUnits) && (
                <small className="text-danger d-block mb-1">
                  {lineErrors.openingFullUnits || lineErrors.openingPartialUnits}
                </small>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveOpeningStock(line.id, line)}
                title="Save Opening Stock"
                style={{ fontSize: '0.75rem', padding: '4px 12px', width: '100%' }}
                disabled={isLocked}
              >
                💾 Save
              </Button>
            </div>
          </div>
        </td>

        {/* Movements (Purchases + Waste) */}
        <td className="text-center bg-white" style={{ verticalAlign: 'middle', borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-row align-items-start justify-content-center gap-3 p-2" style={{ width: '100%' }}>
            {/* Purchases */}
            <div 
              className="border rounded bg-white shadow-sm p-2 d-flex flex-column align-items-center gap-2"
              style={{ flex: 1, minWidth: 140 }}
            >
              <div className="d-flex align-items-center justify-content-center w-100">
                <div
                  className={`fw-bold ${
                    cumulativePurchases > 0 ? 'text-success' : 'text-muted'
                  }`}
                  style={{ fontSize: '0.95rem', minWidth: 50, textAlign: 'center' }}
                  title="Total purchases"
                >
                  +{cumulativePurchases.toFixed(2)}
                </div>
              </div>
              
              {/* Movement History Button */}
              <div className="mb-1" style={{ width: '100%' }}>
                <MovementsList
                  lineId={line.id}
                  hotelSlug={hotelSlug}
                  isLocked={isLocked}
                  onMovementDeleted={onLineUpdated}
                  itemName={line.item_name}
                  itemSku={line.item_sku}
                />
              </div>
              
              <Form.Control
                type="number"
                step="0.01"
                size="sm"
                value={inputs.purchasesQty}
                onChange={(e) => {
                  updateLineInput(line.id, 'purchasesQty', e.target.value);
                }}
                onFocus={(e) => {
                  e.target.classList.add('bg-info-subtle');
                  if (e.target.value === '0' || e.target.value === '0.00') e.target.value = '';
                  if (lineErrors.purchasesQty) {
                    setValidationErrors((prev) => {
                      const { [line.id]: lineErr, ...rest } = prev;
                      if (lineErr) {
                        const { purchasesQty, ...otherErrors } = lineErr;
                        return Object.keys(otherErrors).length > 0 
                          ? { ...rest, [line.id]: otherErrors }
                          : rest;
                      }
                      return prev;
                    });
                  }
                }}
                onBlur={(e) => {
                  e.target.classList.remove('bg-info-subtle');
                  if (e.target.value === '') updateLineInput(line.id, 'purchasesQty', '0');
                }}
                className="bg-light text-center mb-2"
                style={{ width: '100%' }}
                placeholder="Purchases"
                isInvalid={!!lineErrors.purchasesQty}
                disabled={isLocked}
              />
              {lineErrors.purchasesQty && (
                <small className="text-danger d-block mb-1">{lineErrors.purchasesQty}</small>
              )}
              <Button
                variant="success"
                size="sm"
                onClick={() => handleSavePurchases(line.id, line)}
                title="Save Purchases"
                style={{ fontSize: '0.75rem', padding: '2px 8px', width: '100%' }}
                disabled={isLocked}
              >
                💾 Save
              </Button>
            </div>

            {/* Waste */}
            <div 
              className="border rounded bg-white shadow-sm p-2 d-flex flex-column align-items-center gap-2"
              style={{ flex: 1, minWidth: 140 }}
            >
              <div className="text-center">
                <div
                  className={`fw-bold ${cumulativeWaste > 0 ? 'text-danger' : 'text-muted'}`}
                  style={{ fontSize: '0.95rem' }}
                  title="Total waste"
                >
                  -{cumulativeWaste.toFixed(2)}
                </div>
              </div>
              
              {/* Movement History Button */}
              <div className="mb-1" style={{ width: '100%' }}>
                <MovementsList
                  lineId={line.id}
                  hotelSlug={hotelSlug}
                  isLocked={isLocked}
                  onMovementDeleted={onLineUpdated}
                  itemName={line.item_name}
                  itemSku={line.item_sku}
                />
              </div>
              
              <Form.Control
                type="number"
                step="0.01"
                size="sm"
                value={inputs.wasteQuantity}
                onChange={(e) => {
                  updateLineInput(line.id, 'wasteQuantity', e.target.value);
                }}
                onFocus={(e) => {
                  e.target.classList.add('bg-info-subtle');
                  if (e.target.value === '0' || e.target.value === '0.00') e.target.value = '';
                  if (lineErrors.wasteQuantity) {
                    setValidationErrors((prev) => {
                      const { [line.id]: lineErr, ...rest } = prev;
                      if (lineErr) {
                        const { wasteQuantity, ...otherErrors } = lineErr;
                        return Object.keys(otherErrors).length > 0 
                          ? { ...rest, [line.id]: otherErrors }
                          : rest;
                      }
                      return prev;
                    });
                  }
                }}
                onBlur={(e) => {
                  e.target.classList.remove('bg-info-subtle');
                  if (e.target.value === '') updateLineInput(line.id, 'wasteQuantity', '0');
                }}
                className="bg-light text-center mb-2"
                style={{ width: '100%' }}
                placeholder="Waste"
                isInvalid={!!lineErrors.wasteQuantity}
                disabled={isLocked}
              />
              {lineErrors.wasteQuantity && (
                <small className="text-danger d-block mb-1">{lineErrors.wasteQuantity}</small>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleSaveWaste(line.id, line)}
                title="Save Waste"
                style={{ fontSize: '0.75rem', padding: '2px 8px', width: '100%' }}
                disabled={isLocked}
              >
                💾 Save
              </Button>
            </div>
          </div>
        </td>

        {/* Expected */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6', backgroundColor: 'rgba(25, 135, 84, 0.08)' }}>
          <div className="d-flex flex-column align-items-center gap-1 border border-success border-1 rounded p-2 bg-white shadow-sm">
            {/* SYRUPS: Show combined bottles value only */}
            {line.subcategory === 'SYRUPS' ? (
              <div>
                <strong className="text-success">{(Number(line.expected_display_full_units || 0) + Number(line.expected_display_partial_units || 0)).toFixed(2)}</strong>
                <small className="text-muted ms-1">bottles</small>
              </div>
            ) : (
              <>
                <div>
                  <strong className="text-success">{line.expected_display_full_units || '0'}</strong>
                  <small className="text-muted ms-1">{(line.subcategory === 'SOFT_DRINKS' || line.subcategory === 'CORDIALS') ? 'cases' : labels.unit}</small>
                </div>
                <div>
                  <strong className="text-success">{line.expected_display_partial_units || '0'}</strong>
                  <small className="text-muted ms-1">{(line.subcategory === 'SOFT_DRINKS' || line.subcategory === 'CORDIALS') ? 'bottles' : labels.servingUnit}</small>
                </div>
              </>
            )}
            <div className="d-flex flex-column align-items-center mt-1">
              <small className="text-muted" style={{ fontSize: '0.6rem' }}>value</small>
              <span className="text-success" style={{ fontSize: '0.75rem' }}>€{parseFloat(line.expected_value || 0).toFixed(2)}</span>
            </div>
            <div className="d-flex flex-column align-items-center mt-1">
              <small className="text-muted" style={{ fontSize: '0.6rem' }}>servings</small>
              <span className="text-success" style={{ fontSize: '0.75rem' }}>
                {parseFloat(line.expected_qty || 0).toFixed(2)}
              </span>
            </div>
            {/* BIB ONLY: Show drink servings from backend */}
            {line.subcategory === 'BIB' && line.expected_drink_servings && (
              <small className="text-info" style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                ({Math.abs(parseFloat(line.expected_drink_servings)).toLocaleString()})
              </small>
            )}
          </div>
        </td>

        {/* Counted (Cases + Bottles in one column) */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column align-items-center gap-2 p-2" style={{ width: '100%' }}>
            <div 
              className="border rounded bg-white shadow-sm p-2 w-100 d-flex flex-column align-items-center gap-2"
              style={{ minWidth: 200 }}
            >
              {line.subcategory && line.subcategory !== 'SYRUPS' && line.subcategory !== 'BIB' && line.category_code !== 'W' && (
                <small className="text-info d-block text-center" style={{ fontSize: '0.65rem' }}>
                  {getSubcategoryHelpText(line.subcategory)?.split('.')[0]}
                </small>
              )}
              
              {/* SYRUPS, WINES, SPIRITS & BIB: Show current counted value above input */}
              {(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') && (line.counted_full_units !== null || line.counted_partial_units !== null) && (
                <div className="text-center mb-2 p-2 bg-success-subtle rounded">
                  <small className="text-muted d-block" style={{ fontSize: '0.6rem' }}>Current Counted</small>
                  <strong className="text-success" style={{ fontSize: '0.9rem' }}>
                    {(Number(line.counted_full_units || 0) + Number(line.counted_partial_units || 0)).toFixed(2)} {line.subcategory === 'BIB' ? 'boxes' : line.category_code === 'S' ? 'bottles' : 'bottles'}
                  </strong>
                </div>
              )}
              
              {/* Two inputs stacked vertically */}
              <div className="d-flex flex-column gap-2 w-100">
                {/* Cases/Full Units - SHOW for SYRUPS, BIB, WINES & SPIRITS (combined value), SHOW for others */}
                {(labels.showFull !== false || line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') && (
                  <div>
                    <small className="text-muted d-block text-center mb-1" style={{ fontSize: '0.7rem' }}>
                      {(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S')
                        ? `${labels.servingUnit} (Full: ${Math.floor(Number(line.counted_full_units || 0) + Number(line.counted_partial_units || 0))} + Partial: ${((Number(line.counted_full_units || 0) + Number(line.counted_partial_units || 0)) % 1).toFixed(2)})`
                        : labels.unit
                      }
                    </small>
                    <Form.Control
                      type="number"
                      step={(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') ? '0.01' : '1'}
                      min="0"
                      size="sm"
                      value={inputs.fullUnits}
                    onChange={(e) => {
                      const value = e.target.value;
                      // SYRUPS, BIB, WINES & SPIRITS: allow decimals, others: whole numbers only
                      if (line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') {
                        updateLineInput(line.id, 'fullUnits', value);
                      } else if (value === '' || /^\d+$/.test(value)) {
                        updateLineInput(line.id, 'fullUnits', value);
                      }
                    }}
                    onKeyDown={(e) => {
                      // SYRUPS, BIB, WINES & SPIRITS: allow decimals, others: block decimals
                      if (line.subcategory !== 'SYRUPS' && line.subcategory !== 'BIB' && line.category_code !== 'W' && line.category_code !== 'S') {
                        if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }
                    }}
                    onFocus={(e) => {
                      e.target.classList.add('bg-info-subtle');
                      e.target.dataset.originalValue = e.target.value;
                      e.target.value = '';  // ✅ Clear on focus for new entry
                      if (validationErrors[line.id]) {
                        setValidationErrors((prev) => {
                          const { [line.id]: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      e.target.classList.remove('bg-info-subtle');
                      if (e.target.value === '') {
                        updateLineInput(line.id, 'fullUnits', '');  // ✅ Keep empty if no input
                      }
                    }}
                    className="bg-light text-center"
                    placeholder={
                      line.subcategory === 'BIB' ? 'boxes (e.g. 2.50)' :
                      (line.subcategory === 'SYRUPS' || line.category_code === 'W' || line.category_code === 'S') ? 'bottles (e.g. 10.50)' : 
                      labels.unit
                    }
                    isInvalid={!!lineErrors.fullUnits}
                    disabled={isLocked}
                  />
                </div>
                )}
                
                {/* Bottles/Partial Units - Hidden for SYRUPS, BIB, WINES & SPIRITS */}
                {line.subcategory !== 'SYRUPS' && line.subcategory !== 'BIB' && line.category_code !== 'W' && line.category_code !== 'S' && (
                <div>
                  <small className="text-muted d-block text-center mb-1" style={{ fontSize: '0.7rem' }}>
                    {labels.servingUnit}
                  </small>
                  <Form.Control
                    type="number"
                    step={inputConfig.step}
                    min="0"
                    max={labels.partialMax}
                    size="sm"
                    value={inputs.partialUnits}
                    onChange={(e) => updateLineInput(line.id, 'partialUnits', e.target.value)}
                    onFocus={(e) => {
                      e.target.classList.add('bg-info-subtle');
                      e.target.dataset.originalValue = e.target.value;
                      e.target.value = '';
                      if (validationErrors[line.id]) {
                        setValidationErrors((prev) => {
                          const { [line.id]: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      e.target.classList.remove('bg-info-subtle');
                      if (e.target.value === '') {
                        const originalValue = e.target.dataset.originalValue || '0';
                        updateLineInput(line.id, 'partialUnits', originalValue);
                      } else {
                        const formatted = formatUserInput(e.target.value, line.category_code, line.item_size);
                        updateLineInput(line.id, 'partialUnits', formatted);
                      }
                    }}
                    className="bg-light text-center"
                    placeholder={labels.servingUnit}
                    isInvalid={!!lineErrors.partialUnits}
                    disabled={isLocked}
                  />
                </div>
                )}
              </div>
              
              {/* Validation errors */}
              {(lineErrors.fullUnits || lineErrors.partialUnits) && (
                <small className="text-danger d-block text-center">
                  {lineErrors.fullUnits || lineErrors.partialUnits}
                </small>
              )}
              
              {/* Save button */}
              <Button
                variant="success"
                size="sm"
                onClick={() => handleSaveCount(line.id, line)}
                title="Save Count"
                style={{ fontSize: '0.75rem', padding: '4px 12px', width: '100%' }}
                disabled={isLocked}
              >
                💾 Save
              </Button>
              
              {/* Stock value and quantity - muted text below inputs */}
              {(line.counted_full_units !== null || line.counted_partial_units !== null) && (
                <div className="mt-2 pt-2 border-top w-100 text-center">
                  <div className="d-flex justify-content-around align-items-center">
                    <div className="d-flex flex-column align-items-center">
                      <small className="text-muted" style={{ fontSize: '0.65rem' }}>Stock Value</small>
                      <small className="text-success fw-bold" style={{ fontSize: '0.75rem' }}>
                        €{parseFloat(line.counted_value || 0).toFixed(2)}
                      </small>
                    </div>
                    <div className="d-flex flex-column align-items-center">
                      <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                        {/* For UOM=1 (SYRUPS, SPIRITS, WINES, BIB), counted_qty = bottles */}
                        {/* For UOM>1 (DRAUGHT, BOTTLED BEER, SOFT_DRINKS), counted_qty = servings */}
                        {line.subcategory === 'SYRUPS' || line.subcategory === 'BULK_JUICES' 
                          ? 'Bottles' 
                          : line.category_code === 'S' || line.category_code === 'W'
                            ? 'Bottles'
                            : 'Servings'
                        }
                      </small>
                      <small className="text-primary fw-bold" style={{ fontSize: '0.75rem' }}>
                        {line.subcategory === 'BIB' && line.variance_drink_servings 
                          ? `${Math.abs(parseFloat(line.variance_drink_servings)).toLocaleString()}`
                          : parseFloat(line.counted_qty || 0).toFixed(2)
                        }
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Variance - Backend values only, NO optimistic preview */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          {!line.counted_full_units && !line.counted_partial_units ? (
            <div className="d-flex flex-column align-items-center gap-1 p-2">
              <span className="text-muted">-</span>
            </div>
          ) : (
            <div className={`d-flex flex-column align-items-center gap-2 p-2 rounded ${bgClass}`}>
              {/* SYRUPS, BIB, WINES, SPIRITS: Show combined decimal value only */}
              {(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') ? (
                <div className="d-flex flex-column align-items-center">
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>({line.subcategory === 'BIB' ? 'boxes' : 'bottles'})</small>
                  <strong className={`${textClass} ${strongClass}`}>
                    {varianceValue >= 0 ? '+' : ''}
                    {(Number(varianceDisplayFull) + Number(varianceDisplayPartial)).toFixed(2)}
                  </strong>
                </div>
              ) : (
                <>
                  {/* Full units variance - only show if labels.unit exists */}
                  {labels.unit && (
                    <div className="d-flex flex-column align-items-center">
                      <small className="text-muted" style={{ fontSize: '0.65rem' }}>({(line.subcategory === 'SOFT_DRINKS' || line.subcategory === 'CORDIALS') ? 'cases' : labels.unit})</small>
                      <strong className={`${textClass} ${strongClass}`}>
                        {isShortage ? '-' : '+'}
                        {Math.abs(parseFloat(varianceDisplayFull))}
                      </strong>
                    </div>
                  )}
                  {/* Partial units variance - always show */}
                  <div className="d-flex flex-column align-items-center">
                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>({(line.subcategory === 'SOFT_DRINKS' || line.subcategory === 'CORDIALS') ? 'bottles' : labels.servingUnit})</small>
                    <strong className={`${textClass} ${strongClass}`}>
                      {isShortage ? '-' : '+'}
                      {Math.abs(parseFloat(varianceDisplayPartial))}
                    </strong>
                  </div>
                </>
              )}
              
              {/* Stock Value section */}
              <div className="d-flex flex-column align-items-center mt-1 pt-1 w-100" style={{ borderTop: '2px solid rgba(255, 255, 255, 1.0)' }}>
                <small className="text-muted" style={{ fontSize: '0.65rem' }}>(Stock Value)</small>
                <strong className={`${textClass} ${strongClass}`} style={{ fontSize: '0.9rem' }}>
                  {varianceValue >= 0 ? '+' : ''}€{varianceValue.toFixed(2)}
                  {isSignificant && <span className="ms-1">⚠️</span>}
                </strong>
              </div>
              
              {/* Servings info */}
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                ({varianceQty >= 0 ? '+' : ''}{varianceQty.toFixed(2)} {line.subcategory === 'BIB' ? 'boxes' : 'servings'})
              </small>
              
              {/* BIB ONLY: Show drink servings from variance */}
              {line.subcategory === 'BIB' && line.variance_drink_servings && (
                <small className="text-info" style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                  ({Math.abs(parseFloat(line.variance_drink_servings)).toLocaleString()} drink servings)
                </small>
              )}
            </div>
          )}
        </td>

        {/* Actions */}
        {!isLocked && (
          <td>
            <Button variant="danger" size="sm" onClick={() => handleClear(line.id, line)} title="Clear" style={{ fontSize: '0.75rem', color: 'white' }}>
              Clear
            </Button>
          </td>
        )}
      </tr>
    );
  };

  // Simplified render for LOCKED stocktakes - Clean, stylish, NO inputs
  const renderLockedLineRow = (line) => {
    const labels = getCountingLabels(line.category_code, line.item_size, line.input_fields, line.subcategory);
    
    // DEBUG: Log labels for SYRUPS
    if (line.subcategory === 'SYRUPS') {
      console.log('🔍 SYRUPS labels:', { 
        sku: line.item_sku, 
        showFull: labels.showFull,
        counted_full: line.counted_full_units,
        counted_partial: line.counted_partial_units
      });
    }
    
    const uom = parseFloat(line.item_uom || line.uom || 1);
    const cumulativePurchases = parseFloat(line.purchases || 0);
    const cumulativeWaste = parseFloat(line.waste || 0);
    const varianceQty = parseFloat(line.variance_qty) || 0;
    const varianceValue = parseFloat(line.variance_value) || 0;
    
    // ✅ Use backend-calculated display units (already rounded per category rules)
    const varianceDisplayFull = line.variance_display_full_units || '0';
    const varianceDisplayPartial = line.variance_display_partial_units || '0';
    
    const isShortage = varianceValue < 0;
    const isSurplus = varianceValue > 0;
    const isSignificant = Math.abs(varianceValue) > 10;
    const bgClass = isShortage ? 'bg-danger-subtle' : isSurplus ? 'bg-success-subtle' : '';
    const textClass = isShortage ? 'text-danger' : isSurplus ? 'text-success' : 'text-muted';
    const strongClass = isSignificant ? 'fw-bold' : '';

    return (
      <tr key={line.id}>
        {/* SKU */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <code className="small">{line.item_sku}</code>
        </td>
        
        {/* Name */}
        <td style={{ borderRight: '1px solid #dee2e6' }}>
          <div className="d-flex flex-column">
            <strong>{line.item_name}</strong>
            {line.subcategory && (
              <div className="mt-1">
                <SubcategoryBadge subcategory={line.subcategory} size="xs" />
              </div>
            )}
          </div>
        </td>
        
        {/* Category */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <Badge bg="secondary" className="small">{line.category_name || 'N/A'}</Badge>
        </td>
        
        {/* Size */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          {line.item_size ? <small className="text-muted">{line.item_size}</small> : <small className="text-muted">-</small>}
        </td>
        
        {/* UOM */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>
          <Badge bg="light" text="dark" className="small">{uom.toFixed(0)}</Badge>
        </td>
        
        {/* Opening */}
        <td className="text-center bg-info-subtle" style={{ borderRight: '1px solid #dee2e6', padding: '12px' }}>
          <div className="d-flex flex-column align-items-center gap-1">
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0d6efd' }}>
                {line.opening_display_full_units || '0'}
              </span>
              <small className="text-muted ms-1">{labels.unit}</small>
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0dcaf0' }}>
                {line.opening_display_partial_units || '0'}
              </span>
              <small className="text-muted ms-1">{labels.servingUnit}</small>
            </div>
            <small className="text-muted">{parseFloat(line.opening_qty || 0).toFixed(2)} servings</small>
          </div>
        </td>
        
        {/* Movements (Purchases + Waste) */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6', padding: '12px' }}>
          <div className="d-flex flex-row align-items-center justify-content-center gap-4">
            {/* Purchases */}
            <div className="d-flex flex-column align-items-center">
              <small className="text-muted mb-1" style={{ fontSize: '0.65rem' }}>Purchases</small>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: cumulativePurchases > 0 ? '#198754' : '#6c757d' }}>
                +{cumulativePurchases.toFixed(2)}
              </div>
            </div>
            
            {/* Waste */}
            <div className="d-flex flex-column align-items-center">
              <small className="text-muted mb-1" style={{ fontSize: '0.65rem' }}>Waste</small>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: cumulativeWaste > 0 ? '#dc3545' : '#6c757d' }}>
                -{cumulativeWaste.toFixed(2)}
              </div>
            </div>
          </div>
        </td>
        
        {/* Expected */}
        <td className="text-center bg-warning-subtle" style={{ borderRight: '1px solid #dee2e6', padding: '12px' }}>
          <div className="d-flex flex-column align-items-center gap-1">
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc3545' }}>
                {line.expected_display_full_units || '0'}
              </span>
              <small className="text-muted ms-1">{labels.unit}</small>
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc3545' }}>
                {line.expected_display_partial_units || '0'}
              </span>
              <small className="text-muted ms-1">{labels.servingUnit}</small>
            </div>
            <small className="text-muted">€{parseFloat(line.expected_value || 0).toFixed(2)}</small>
            <small className="text-muted">{parseFloat(line.expected_qty || 0).toFixed(2)} servings</small>
            {/* BIB ONLY: Show drink servings from backend */}
            {line.subcategory === 'BIB' && line.expected_drink_servings && (
              <small className="text-info" style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                ({Math.abs(parseFloat(line.expected_drink_servings)).toLocaleString()} drink servings)
              </small>
            )}
          </div>
        </td>
        
        {/* Counted (Cases + Bottles) */}
        <td className="text-center" style={{ borderRight: '1px solid #dee2e6', padding: '12px' }}>
          <div className="d-flex flex-column align-items-center gap-2">
            {/* Display counted values */}
            {labels.showFull === false ? (
              // SYRUPS: Show full + partial bottles separately (no "cases" label)
              <div className="d-flex flex-column align-items-center gap-1">
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#212529' }}>
                  {line.counted_full_units !== null ? line.counted_full_units : '-'}
                </div>
                <div className="d-flex align-items-center gap-1">
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#212529' }}>
                    {line.counted_partial_units !== null ? parseFloat(line.counted_partial_units).toFixed(2) : '-'}
                  </div>
                  <small className="text-muted">{labels.servingUnit}</small>
                </div>
              </div>
            ) : (
              // Other categories: Show full + partial separately
              <div className="d-flex gap-3 align-items-center">
                <div className="d-flex flex-column align-items-center">
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>{labels.unit}</small>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#212529' }}>
                    {line.counted_full_units !== null ? line.counted_full_units : '-'}
                  </div>
                </div>
                <div className="d-flex flex-column align-items-center">
                  <small className="text-muted" style={{ fontSize: '0.65rem' }}>{labels.servingUnit}</small>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#212529' }}>
                    {line.counted_partial_units !== null ? parseFloat(line.counted_partial_units).toFixed(2) : '-'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Stock value and quantity */}
            {(line.counted_full_units !== null || line.counted_partial_units !== null) && (
              <div className="d-flex flex-column align-items-center gap-1 mt-2">
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                  Stock Value: €{parseFloat(line.counted_value || 0).toFixed(2)} | {line.subcategory === 'BIB' && line.variance_drink_servings 
                    ? `${Math.abs(parseFloat(line.variance_drink_servings)).toLocaleString()} drink servings`
                    : line.subcategory === 'SYRUPS' || line.subcategory === 'BULK_JUICES' || line.category_code === 'S' || line.category_code === 'W'
                      ? `${parseFloat(line.counted_qty || 0).toFixed(2)} bottles`
                      : `${parseFloat(line.counted_qty || 0).toFixed(2)} servings`
                  }
                </small>
              </div>
            )}
          </div>
        </td>
        
        {/* Variance */}
        <td className={`text-center ${bgClass}`} style={{ borderRight: '1px solid #dee2e6', padding: '12px' }}>
          {!line.counted_full_units && !line.counted_partial_units ? (
            <span className="text-muted">-</span>
          ) : (
            <div className="d-flex flex-column align-items-center gap-2">
              {/* SYRUPS, BIB, WINES, SPIRITS: Show combined decimal value only */}
              {(line.subcategory === 'SYRUPS' || line.subcategory === 'BIB' || line.category_code === 'W' || line.category_code === 'S') ? (
                <div className="d-flex flex-column align-items-center">
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>({line.subcategory === 'BIB' ? 'boxes' : 'bottles'})</small>
                  <span className={`${textClass} ${strongClass}`} style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                    {varianceValue >= 0 ? '+' : ''}
                    {(Number(varianceDisplayFull) + Number(varianceDisplayPartial)).toFixed(2)}
                  </span>
                </div>
              ) : (
                <>
                  {/* Full units variance - only show if labels.unit exists */}
                  {labels.unit && (
                    <div className="d-flex flex-column align-items-center">
                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>({(line.subcategory === 'SOFT_DRINKS' || line.subcategory === 'CORDIALS') ? 'cases' : labels.unit})</small>
                      <span className={`${textClass} ${strongClass}`} style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                        {isShortage ? '-' : '+'}
                        {Math.abs(parseFloat(varianceDisplayFull))}
                      </span>
                    </div>
                  )}
                  {/* Partial units variance - always show */}
                  <div className="d-flex flex-column align-items-center">
                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>({(line.subcategory === 'SOFT_DRINKS' || line.subcategory === 'CORDIALS') ? 'bottles' : labels.servingUnit})</small>
                    <span className={`${textClass} ${strongClass}`} style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                      {isShortage ? '-' : '+'}
                      {Math.abs(parseFloat(varianceDisplayPartial))}
                    </span>
                  </div>
                </>
              )}
              
              {/* Stock Value section */}
              <div className="d-flex flex-column align-items-center mt-2 pt-2 w-100" style={{ borderTop: '2px solid rgba(255, 255, 255, 1.0)' }}>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>(Stock Value)</small>
                <strong className={`${textClass} ${strongClass}`} style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>
                  {varianceValue >= 0 ? '+' : ''}€{varianceValue.toFixed(2)}
                  {isSignificant && <span className="ms-1">⚠️</span>}
                </strong>
              </div>
              
              {/* Servings info */}
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                ({varianceQty >= 0 ? '+' : ''}{varianceQty.toFixed(2)} {line.subcategory === 'BIB' ? 'boxes' : 'servings'})
              </small>
              
              {/* BIB ONLY: Show drink servings from variance */}
              {line.subcategory === 'BIB' && line.variance_drink_servings && (
                <small className="text-info" style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                  ({Math.abs(parseFloat(line.variance_drink_servings)).toLocaleString()} drink servings)
                </small>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  // Debug - Use effect to run after lines are loaded
  const [debugLine, setDebugLine] = React.useState(null);
  
  React.useEffect(() => {
    if (lines && lines.length > 0) {
      // Try both property names - can be changed to any SKU for debugging
      const foundLine = lines.find(line => line.sku === 'M0006' || line.item_sku === 'M0006');
      setDebugLine(foundLine);
    }
  }, [lines]);

  // Get all unique categories for navigation
  const categories = Object.keys(groupedLines).sort();

  return (
    <>
      {/* Debug Panel */}
      {showDebugPanel && debugLine && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#2c3e50',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 999999,
          maxWidth: '450px',
          fontSize: '13px',
          fontFamily: 'monospace',
          border: '2px solid #3498db'
        }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
              🔍 Debug Panel
            </div>
            <button
              onClick={() => setShowDebugPanel(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 5px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '5px' }}>
            <div><strong>Total Lines:</strong> {lines.length}</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '10px', paddingTop: '10px' }}>
              <strong>Debug Item: {debugLine.item_sku}</strong>
            </div>
            <div><strong>Name:</strong> {debugLine.item_name}</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '10px', paddingTop: '10px' }}>
              <strong>Backend Values:</strong>
            </div>
            <div>variance_display_full: <span style={{ color: '#f39c12' }}>{debugLine.variance_display_full_units || 'NULL'}</span></div>
            <div>variance_display_partial: <span style={{ color: '#f39c12' }}>{debugLine.variance_display_partial_units || 'NULL'}</span></div>
            <div>variance_qty: <span style={{ color: '#e74c3c' }}>{debugLine.variance_qty}</span></div>
            <div>counted_qty: <span style={{ color: '#2ecc71' }}>{debugLine.counted_qty}</span></div>
            <div>expected_qty: <span style={{ color: '#3498db' }}>{debugLine.expected_qty}</span></div>
          </div>
        </div>
      )}

      {/* Search and Category Navigation */}
      <div className="stocktake-nav-sticky">
        <div className="d-flex flex-column gap-3 py-3 justify-content-center align-items-center">
          {/* Search Bar */}
          <div className="stocktake-saerch">
            <div style={{ position: 'relative', width: '100%' }}>
              <Form.Control
                type="text"
                placeholder="🔍 Search by name, SKU, category, or subcategory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="contextual-action-btn"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)',
                  paddingRight: searchTerm ? '35px' : '12px'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#6c757d',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: '0.6',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {searchTerm && (
              <small className="text-muted d-block mt-1">
                Found {filteredLines.length} items
              </small>
            )}
          </div>

          {/* Category Quick Links */}
          <div className="stocktake-saerch-categories">
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              {categories.map(categoryName => (
                <button
                  key={categoryName}
                  onClick={() => scrollToCategory(categoryName)}
                  className="contextual-action-btn zoom-buttons"
                  style={{ 
                    color: '#3498db',
                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)'
                  }}
                >
                  <span className="action-label">{categoryName} ({groupedLines[categoryName].length})</span>
                </button>
              ))}
              
              {/* Debug Toggle Button */}
              {debugLine && (
                <button
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="contextual-action-btn zoom-buttons"
                  style={{ 
                    color: showDebugPanel ? '#e74c3c' : '#95a5a6',
                    boxShadow: showDebugPanel ? '0 4px 15px rgba(231, 76, 60, 0.4)' : '0 4px 15px rgba(149, 165, 166, 0.4)'
                  }}
                  title="Toggle Debug Panel"
                >
                  <span className="action-label">🔍 Debug</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {Object.entries(groupedLines).map(([categoryName, catLines]) => {
        const categoryCode = catLines[0]?.category_code || '';
        const totals = categoryTotals?.[categoryCode] || null;

        return (
          <Card key={categoryName} className="mb-4" id={`category-${categoryName}`}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{categoryName}</strong>{' '}
                <Badge bg="light" text="dark">
                  {catLines.length} items
                </Badge>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                {isLocked ? (
                  /* LOCKED/CLOSED: Clean, stylish view with NO inputs */
                  <Table hover size="sm" className="mb-0 align-middle">
                    <thead>
                      <tr>
                        <th style={{ borderRight: '1px solid #dee2e6' }}>SKU</th>
                        <th style={{ borderRight: '1px solid #dee2e6' }}>Name</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Cat</th>
                        <th style={{ borderRight: '1px solid #dee2e6' }}>Size</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>UOM</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Opening</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Movements</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Expected</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Counted</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Variance</th>
                      </tr>
                    </thead>
                    <tbody>{catLines.map((line) => renderLockedLineRow(line))}</tbody>
                    <tfoot>
                      {totalsLoading ? (
                        <tr>
                          <td colSpan="10" className="text-center text-muted py-3">
                            <small>Loading category totals...</small>
                          </td>
                        </tr>
                      ) : totals ? (
                        <CategoryTotalsRow
                          categoryCode={categoryCode}
                          categoryName={categoryName}
                          totals={totals}
                          isLocked={isLocked}
                          onSaveManualValues={() => {}}
                        />
                      ) : null}
                    </tfoot>
                  </Table>
                ) : (
                  /* ACTIVE/DRAFT: Full interactive view with all inputs */
                  <Table hover size="sm" className="mb-0 align-middle">
                    <thead>
                      <tr>
                        <th style={{ borderRight: '1px solid #dee2e6' }}>SKU</th>
                        <th style={{ borderRight: '1px solid #dee2e6' }}>Name</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Cat</th>
                        <th style={{ borderRight: '1px solid #dee2e6' }}>Size</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>UOM</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Opening</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Movements</th>
                        <th className="text-end" style={{ borderRight: '1px solid #dee2e6' }}>Expected</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Counted</th>
                        <th className="text-center" style={{ borderRight: '1px solid #dee2e6' }}>Variance</th>
                        <th className="text-center">Clear</th>
                      </tr>
                    </thead>
                    <tbody>{catLines.map((line) => renderLineRow(line))}</tbody>

                    <tfoot>
                      {totalsLoading ? (
                        <tr>
                          <td colSpan="11" className="text-center text-muted py-3">
                            <small>Loading category totals...</small>
                          </td>
                        </tr>
                      ) : totals ? (
                        <CategoryTotalsRow
                          categoryCode={categoryCode}
                          categoryName={categoryName}
                          totals={totals}
                          isLocked={isLocked}
                          onSaveManualValues={() => {}}
                        />
                      ) : null}
                    </tfoot>
                  </Table>
                )}
              </div>
            </Card.Body>
          </Card>
        );
      })}
    </>
  );
};
