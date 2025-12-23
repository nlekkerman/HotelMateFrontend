import { useState, useEffect, useMemo } from 'react';
import { publicAPI } from '@/services/api';
import { toast } from 'react-toastify';

/**
 * useSurveyForm Hook
 * 
 * Mirrors usePrecheckinForm.js patterns exactly for survey functionality
 * Handles dynamic field rendering, validation, and submission
 */
export const useSurveyForm = ({ surveyConfig, fieldRegistry, token, hotelSlug }) => {
  // Form state - Mirror pre-check-in patterns
  const [surveyData, setSurveyData] = useState({}); // Only enabled field values
  const [fieldErrors, setFieldErrors] = useState({}); // Field-specific validation errors
  const [submitting, setSubmitting] = useState(false); // Form submission in progress
  const [success, setSuccess] = useState(false); // Successfully submitted

  // Get active fields (only enabled fields, sorted by order)
  const activeFields = useMemo(() => {
    if (!fieldRegistry || !surveyConfig?.enabled) return [];
    
    const fields = Object.entries(fieldRegistry).filter(([fieldKey]) => 
      surveyConfig.enabled[fieldKey] === true
    );
    
    // Sort by order, then label, then key (stable sorting)
    fields.sort((a, b) => {
      const [keyA, metaA] = a;
      const [keyB, metaB] = b;
      
      // Primary sort: order
      if (metaA.order && metaB.order) {
        return metaA.order - metaB.order;
      }
      
      // Secondary sort: label or key
      return (metaA.label || keyA).localeCompare(metaB.label || keyB);
    });
    
    return fields;
  }, [fieldRegistry, surveyConfig?.enabled]);

  // Initialize form data for enabled fields
  useEffect(() => {
    if (activeFields.length > 0) {
      const initialData = {};
      activeFields.forEach(([fieldKey, meta]) => {
        // Initialize based on field type
        switch (meta.type) {
          case 'rating':
            initialData[fieldKey] = null; // No default rating
            break;
          case 'checkbox':
            initialData[fieldKey] = false;
            break;
          case 'textarea':
          case 'text':
          default:
            initialData[fieldKey] = '';
            break;
        }
      });
      setSurveyData(initialData);
    }
  }, [activeFields]);

  // Update field value
  const updateField = (fieldKey, value) => {
    setSurveyData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    // Clear field error when user starts typing/changing
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // Validate form - Only check required fields
  const validateForm = () => {
    const errors = {};
    
    activeFields.forEach(([fieldKey, meta]) => {
      // Only validate if field is required
      if (surveyConfig.required[fieldKey] === true) {
        const value = surveyData[fieldKey];
        
        switch (meta.type) {
          case 'rating':
            if (value === null || value === undefined || value < 1 || value > 5) {
              errors[fieldKey] = `${meta.label} is required`;
            }
            break;
            
          case 'checkbox':
            if (value !== true) {
              errors[fieldKey] = `${meta.label} must be checked`;
            }
            break;
            
          case 'textarea':
          case 'text':
          default:
            if (!value || !value.toString().trim()) {
              errors[fieldKey] = `${meta.label} is required`;
            }
            break;
        }
      }
    });
    
    return errors;
  };

  // Check if form is valid
  const isValid = useMemo(() => {
    const errors = validateForm();
    return Object.keys(errors).length === 0;
  }, [surveyData, surveyConfig, activeFields]);

  // Submit form
  const submitForm = async () => {
    if (success) {
      // Prevent resubmission after success
      return;
    }

    try {
      setSubmitting(true);
      setFieldErrors({});
      
      // Pre-submit validation
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        toast.error('Please fill in all required fields');
        return;
      }
      
      // Build payload - Only include enabled fields with values
      const payload = {
        token: token,
        survey_data: {}
      };
      
      // Filter: only send enabled fields with values
      Object.entries(surveyData).forEach(([fieldKey, value]) => {
        if (surveyConfig.enabled[fieldKey] === true && value != null && value !== '') {
          payload.survey_data[fieldKey] = value;
        }
      });
      
      console.log('Submitting survey:', payload);
      
      await publicAPI.post(`/hotel/${hotelSlug}/survey/submit/`, payload);
      
      setSuccess(true);
      toast.success('Survey submitted successfully! Thank you for your feedback.');
      
    } catch (err) {
      console.error('Failed to submit survey:', err);
      
      // Handle field errors from backend
      if (err.response?.status === 400 && err.response?.data?.field_errors) {
        const mappedErrors = err.response.data.field_errors;
        setFieldErrors(mappedErrors);
        toast.error('Please check the form for errors');
      } else if (err.response?.status === 409) {
        // Survey already submitted
        setSuccess(true);
        toast.info('This survey has already been completed. Thank you!');
      } else {
        const errorMessage = err.response?.data?.detail || 'Failed to submit survey. Please try again.';
        toast.error(errorMessage);
      }
      
    } finally {
      setSubmitting(false);
    }
  };

  // Render field based on type
  const renderField = (fieldKey, meta, value, onChange, error, required) => {
    const fieldProps = {
      key: fieldKey,
      id: `survey-${fieldKey}`,
      value: value || '',
      onChange: onChange,
      isInvalid: !!error,
      required: required,
      'aria-describedby': error ? `${fieldKey}-error` : undefined
    };

    switch (meta.type) {
      case 'rating':
        return {
          type: 'rating',
          component: null, // Will be handled by the page component
          options: [1, 2, 3, 4, 5],
          ...fieldProps
        };
        
      case 'textarea':
        return {
          type: 'textarea',
          component: 'textarea',
          rows: 3,
          ...fieldProps
        };
        
      case 'checkbox':
        return {
          type: 'checkbox',
          component: 'checkbox',
          checked: value === true,
          ...fieldProps
        };
        
      case 'select':
        return {
          type: 'select',
          component: 'select',
          options: meta.choices || [],
          ...fieldProps
        };
        
      case 'date':
        return {
          type: 'date',
          component: 'date',
          ...fieldProps
        };
        
      case 'text':
      default:
        return {
          type: 'text',
          component: 'text',
          ...fieldProps
        };
    }
  };

  // Return hook interface
  return {
    // Form state
    surveyData,
    fieldErrors,
    submitting,
    success,
    
    // Computed values
    activeFields,
    isValid,
    hasChanges: Object.keys(surveyData).some(key => 
      surveyData[key] !== null && surveyData[key] !== '' && surveyData[key] !== false
    ),
    
    // Actions
    updateField,
    submitForm,
    renderField,
    
    // Form helpers
    getFieldValue: (fieldKey) => surveyData[fieldKey],
    getFieldError: (fieldKey) => fieldErrors[fieldKey],
    isFieldRequired: (fieldKey) => surveyConfig.required[fieldKey] === true,
    
    // Prevent any further interaction after success
    canSubmit: !success && !submitting && isValid
  };
};