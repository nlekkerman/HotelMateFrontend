import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for managing precheckin form state, validation, and payload building
 */
export const usePrecheckinForm = ({ booking, booker, party, registry, config }) => {
  // Form state for party data
  const [primaryGuest, setPrimaryGuest] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_staying: true
  });
  
  const [companions, setCompanions] = useState([]);
  
  // Form state for extras (config-driven fields)
  const [extrasValues, setExtrasValues] = useState({});
  
  // Form state and validation
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Initialize form data when party data loads
  useEffect(() => {
    if (party) {
      setPrimaryGuest(party.primary || {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        is_staying: true
      });
      setCompanions(party.companions || []);
    }
  }, [party]);
  
  // Calculate expected party structure based on booking
  const expectedGuests = booking ? (booking.adults || 1) + (booking.children || 0) : 1;
  const maxCompanions = Math.max(0, expectedGuests - 1);
  
  // Create fixed companion slots (no dynamic add/remove)
  const companionSlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i < maxCompanions; i++) {
      slots.push(companions[i] || {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        is_staying: true
      });
    }
    return slots;
  }, [companions, maxCompanions]);
  
  // Calculate missing guest count
  const missingGuestCount = useMemo(() => {
    const filledSlots = companionSlots.filter(slot => 
      slot.first_name?.trim() && slot.last_name?.trim()
    ).length;
    const primaryFilled = primaryGuest.first_name?.trim() && primaryGuest.last_name?.trim() ? 1 : 0;
    return Math.max(0, expectedGuests - (primaryFilled + filledSlots));
  }, [primaryGuest, companionSlots, expectedGuests]);
  
  // Get active fields from registry (only enabled fields)
  const activeFields = useMemo(() => {
    if (!registry || !config?.enabled) return [];
    
    const fields = Object.entries(registry).filter(([key]) => config.enabled[key] === true);
    
    // Sort by order if available, else by label
    fields.sort((a, b) => {
      const [keyA, metaA] = a;
      const [keyB, metaB] = b;
      
      if (metaA.order && metaB.order) {
        return metaA.order - metaB.order;
      }
      
      return (metaA.label || keyA).localeCompare(metaB.label || keyB);
    });
    
    return fields;
  }, [registry, config?.enabled]);
  
  // Check if booker and primary guest are the same person
  const isBookerSamePrimary = useMemo(() => {
    if (!booker || !primaryGuest) return false;
    
    return (
      booker.first_name === primaryGuest.first_name &&
      booker.last_name === primaryGuest.last_name &&
      booker.email === primaryGuest.email &&
      booker.phone === primaryGuest.phone
    );
  }, [booker, primaryGuest]);
  
  // Copy booker info to primary guest
  const copyBookerToPrimary = () => {
    if (booker) {
      setPrimaryGuest({
        first_name: booker.first_name || '',
        last_name: booker.last_name || '',
        email: booker.email || '',
        phone: booker.phone || '',
        is_staying: true
      });
      
      // Clear primary guest errors
      setErrors(prev => ({
        ...prev,
        party: {
          ...prev.party,
          primary: {}
        }
      }));
    }
  };
  
  // Handle primary guest field changes
  const updatePrimaryGuest = (field, value) => {
    setPrimaryGuest(prev => ({ ...prev, [field]: value }));
    
    // Clear field error
    if (errors.party?.primary?.[field]) {
      setErrors(prev => ({
        ...prev,
        party: {
          ...prev.party,
          primary: {
            ...prev.party.primary,
            [field]: undefined
          }
        }
      }));
    }
  };
  
  // Handle companion field changes
  const updateCompanion = (index, field, value) => {
    const newCompanions = [...companions];
    
    // Ensure we have enough slots
    while (newCompanions.length <= index) {
      newCompanions.push({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        is_staying: true
      });
    }
    
    newCompanions[index] = { ...newCompanions[index], [field]: value };
    setCompanions(newCompanions);
    
    // Clear field error
    if (errors.party?.companions?.[index]?.[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.party?.companions?.[index]) {
          newErrors.party.companions[index][field] = undefined;
        }
        return newErrors;
      });
    }
  };
  
  // Handle extras field changes
  const updateExtrasField = (fieldKey, value) => {
    setExtrasValues(prev => ({ ...prev, [fieldKey]: value }));
    
    // Clear field error
    if (errors.extras?.[fieldKey]) {
      setErrors(prev => ({
        ...prev,
        extras: {
          ...prev.extras,
          [fieldKey]: undefined
        }
      }));
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = { party: { primary: {}, companions: [] }, extras: {} };
    
    // Validate primary guest
    if (!primaryGuest.first_name?.trim()) {
      newErrors.party.primary.first_name = "First name is required";
    }
    if (!primaryGuest.last_name?.trim()) {
      newErrors.party.primary.last_name = "Last name is required";
    }
    
    // Validate companions (only filled slots need validation)
    companionSlots.forEach((companion, index) => {
      const companionErrors = {};
      
      // If either name field is filled, both must be filled
      const hasAnyName = companion.first_name?.trim() || companion.last_name?.trim();
      if (hasAnyName) {
        if (!companion.first_name?.trim()) {
          companionErrors.first_name = "First name is required";
        }
        if (!companion.last_name?.trim()) {
          companionErrors.last_name = "Last name is required";
        }
      }
      
      if (Object.keys(companionErrors).length > 0) {
        newErrors.party.companions[index] = companionErrors;
      }
    });
    
    // Validate extras (only required fields)
    activeFields.forEach(([fieldKey, meta]) => {
      if (config?.required?.[fieldKey] && !extrasValues[fieldKey]?.trim()) {
        newErrors.extras[fieldKey] = `${meta.label} is required`;
      }
    });
    
    return newErrors;
  };
  
  // Check if form is valid
  const isValid = useMemo(() => {
    const validationErrors = validateForm();
    
    const hasPartyErrors = 
      Object.keys(validationErrors.party.primary).length > 0 ||
      validationErrors.party.companions.some(c => c && Object.keys(c).length > 0);
    
    const hasExtrasErrors = Object.keys(validationErrors.extras).length > 0;
    
    return !hasPartyErrors && !hasExtrasErrors;
  }, [primaryGuest, companionSlots, extrasValues, activeFields, config]);
  
  // Build submission payload
  const buildPayload = () => {
    // Build extras object from active fields only
    const extras = {};
    activeFields.forEach(([fieldKey]) => {
      extras[fieldKey] = extrasValues[fieldKey] || '';
    });
    
    // Filter out empty companion slots for submission
    const filledCompanions = companionSlots.filter(companion => 
      companion.first_name?.trim() && companion.last_name?.trim()
    );
    
    const payload = {
      party: {
        primary: primaryGuest,
        companions: filledCompanions
      },
      extras: extras
    };
    
    // Temporary compatibility: also send extras flattened at root
    Object.keys(extras).forEach(key => {
      payload[key] = extras[key];
    });
    
    return payload;
  };
  
  // Submit form
  const submitForm = () => {
    const validationErrors = validateForm();
    const hasErrors = 
      Object.keys(validationErrors.party.primary).length > 0 ||
      validationErrors.party.companions.some(c => c && Object.keys(c).length > 0) ||
      Object.keys(validationErrors.extras).length > 0;
    
    if (hasErrors) {
      setErrors(validationErrors);
      return { success: false, errors: validationErrors };
    }
    
    setErrors({});
    return { success: true, payload: buildPayload() };
  };
  
  return {
    // State
    primaryGuest,
    companionSlots,
    extrasValues,
    errors,
    submitting,
    setSubmitting,
    
    // Computed values
    expectedGuests,
    maxCompanions,
    missingGuestCount,
    activeFields,
    isBookerSamePrimary,
    isValid,
    
    // Actions
    copyBookerToPrimary,
    updatePrimaryGuest,
    updateCompanion,
    updateExtrasField,
    submitForm,
    buildPayload
  };
};