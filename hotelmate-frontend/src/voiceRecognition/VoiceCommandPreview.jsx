import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaCheckCircle } from 'react-icons/fa';
import { addVoiceLog } from './VoiceDebugPanel';

/**
 * Confirmation modal for voice commands
 * Displays parsed command details and allows user to confirm or cancel
 */
export const VoiceCommandPreview = ({ command, stocktake, onConfirm, onCancel, lines = [] }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!command) return null;

  /**
   * Find matching item from stocktake lines using fuzzy matching
   * Matches against item_name, item_sku, and partial matches
   */
  const matchedItem = useMemo(() => {
    if (!command.item_identifier || !lines.length) return null;

    const identifier = command.item_identifier.toLowerCase().trim();
    
    // Try exact SKU match first
    let match = lines.find(line => 
      line.item_sku?.toLowerCase() === identifier
    );
    
    if (match) return match;
    
    // Try exact name match
    match = lines.find(line => 
      line.item_name?.toLowerCase() === identifier
    );
    
    if (match) return match;
    
    // Try partial name match (most common for voice commands)
    match = lines.find(line => 
      line.item_name?.toLowerCase().includes(identifier) ||
      identifier.includes(line.item_name?.toLowerCase())
    );
    
    if (match) return match;
    
    // Try more aggressive fuzzy matching for voice recognition errors
    // Check if identifier matches start of product name words
    match = lines.find(line => {
      const lineName = line.item_name?.toLowerCase() || '';
      const words = lineName.split(/\s+/);
      
      // Check if identifier starts with any word in the product name
      return words.some(word => 
        word.startsWith(identifier) || 
        identifier.startsWith(word.substring(0, Math.min(4, word.length)))
      );
    });
    
    if (match) return match;
    
    // Last resort: check for similar sounding words (common voice recognition errors)
    match = lines.find(line => {
      const lineName = line.item_name?.toLowerCase() || '';
      // Calculate simple similarity score based on common characters
      const commonChars = identifier.split('').filter(char => lineName.includes(char)).length;
      const similarity = commonChars / Math.max(identifier.length, lineName.length);
      return similarity > 0.6; // 60% similarity threshold
    });
    
    return match;
  }, [command.item_identifier, lines]);

  /**
   * Get category-specific labels for breakdown display
   */
  const getBreakdownLabels = (item) => {
    if (!item) return { fullLabel: 'Full Units', partialLabel: 'Partial Units' };
    
    const categoryCode = item.category_code;
    
    if (categoryCode === 'D') {
      // Draft Beer
      return { fullLabel: 'Kegs', partialLabel: 'Pints' };
    } else if (categoryCode === 'B') {
      // Bottled Beer
      return { fullLabel: 'Cases', partialLabel: 'Bottles' };
    } else if (categoryCode === 'M') {
      // Minerals - varies by subcategory
      const subcategory = item.subcategory?.toUpperCase();
      if (subcategory === 'SOFT_DRINKS' || subcategory === 'CORDIALS') {
        return { fullLabel: 'Cases', partialLabel: 'Bottles' };
      } else if (subcategory === 'BULK_JUICES') {
        return { fullLabel: 'Bottles', partialLabel: 'Partial' };
      } else if (subcategory === 'BIB') {
        return { fullLabel: 'Boxes', partialLabel: 'Liters' };
      }
      return { fullLabel: 'Cases', partialLabel: 'Bottles' };
    } else if (categoryCode === 'W') {
      // Wine
      return { fullLabel: 'Bottles', partialLabel: 'Partial' };
    } else if (categoryCode === 'S') {
      // Spirits
      return { fullLabel: 'Bottles', partialLabel: 'Partial' };
    }
    
    return { fullLabel: 'Full Units', partialLabel: 'Partial Units' };
  };

  /**
   * Calculate total servings when full_units and partial_units are provided
   */
  const calculateTotalServings = (fullUnits, partialUnits, item) => {
    if (!item || fullUnits === null || fullUnits === undefined) return null;
    
    const uom = item.item_uom || 1;
    const partial = partialUnits || 0;
    
    return (fullUnits * uom) + partial;
  };

  // Check if backend provided breakdown
  const hasBreakdown = command.full_units !== null && command.full_units !== undefined;
  
  // Get labels and total
  const labels = getBreakdownLabels(matchedItem);
  const totalServings = hasBreakdown 
    ? calculateTotalServings(command.full_units, command.partial_units, matchedItem)
    : null;

  // Log when modal opens with command details
  useEffect(() => {
    if (command) {
      addVoiceLog('info', '🎯 Voice Command Preview Modal Opened', {
        command: command,
        searchingFor: command.item_identifier,
        availableItemsCount: lines.length,
        matchedItem: matchedItem ? {
          item_name: matchedItem.item_name,
          item_sku: matchedItem.item_sku,
          category_code: matchedItem.category_code,
          item_uom: matchedItem.item_uom,
          subcategory: matchedItem.subcategory
        } : '❌ NO MATCH FOUND - Backend will do fuzzy matching',
        hasBreakdown: hasBreakdown,
        backendProvidedFullUnits: command.full_units !== null && command.full_units !== undefined,
        backendProvidedPartialUnits: command.partial_units !== null && command.partial_units !== undefined,
        labels: labels,
        totalServings: totalServings
      });
      
      // Log if backend didn't provide breakdown when transcription suggests it should have
      if (!hasBreakdown && command.transcription) {
        const transcription = command.transcription.toLowerCase();
        if (transcription.includes('case') || transcription.includes('keg') || 
            (transcription.match(/\d+/g) || []).length > 1) {
          addVoiceLog('warning', '⚠️ Backend did not parse full+partial units from transcription', {
            transcription: command.transcription,
            valueProvided: command.value,
            expectedFormat: 'Backend should return full_units and partial_units for multi-unit commands'
          });
        }
      }
    }
  }, [command]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    addVoiceLog('info', '👆 User clicked CONFIRM button', {
      commandBeingSent: command,
      matchedItemDetails: matchedItem ? {
        item_name: matchedItem.item_name,
        item_sku: matchedItem.item_sku,
        item_uom: matchedItem.item_uom
      } : null
    });

    try {
      await onConfirm(command);
      addVoiceLog('success', '✅ Confirm completed successfully');
    } catch (error) {
      addVoiceLog('error', '❌ Confirm failed in preview handler', {
        error: error.message,
        command: command
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAction = (action) => {
    const actions = {
      count: 'Count',
      purchase: 'Purchase',
      waste: 'Waste',
    };
    return actions[action] || action;
  };

  return (
    <Modal show={true} onHide={onCancel} centered size="lg" backdrop="static">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <FaCheckCircle className="me-2" />
          Confirm Voice Command
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="command-preview">
          <div className="preview-section mb-3">
            <div className="preview-row">
              <span className="label fw-bold">Action:</span>
              <span className="value">
                <span className={`badge bg-${command.action === 'count' ? 'info' : command.action === 'purchase' ? 'success' : 'warning'}`}>
                  {formatAction(command.action)}
                </span>
              </span>
            </div>

            <div className="preview-row">
              <span className="label fw-bold">Product:</span>
              <span className="value">
                {matchedItem ? (
                  <>
                    {matchedItem.item_name}
                    {matchedItem.item_sku && (
                      <span className="text-muted ms-2">({matchedItem.item_sku})</span>
                    )}
                  </>
                ) : (
                  command.item_identifier
                )}
              </span>
            </div>
          </div>

          {/* Show full_units and partial_units breakdown when available */}
          {hasBreakdown && (
            <div className="preview-section mb-3">
              <h6 className="text-muted mb-2">Breakdown:</h6>
              
              <div className="preview-row">
                <span className="label">{labels.fullLabel}:</span>
                <span className="value fw-bold text-success">{command.full_units}</span>
              </div>

              {command.partial_units !== null && command.partial_units !== undefined && (
                <div className="preview-row">
                  <span className="label">{labels.partialLabel}:</span>
                  <span className="value fw-bold text-warning">{command.partial_units}</span>
                </div>
              )}

              {/* Show calculated total when item is matched */}
              {totalServings !== null && (
                <div className="preview-row border-top pt-2 mt-2">
                  <span className="label fw-bold">Total Servings:</span>
                  <span className="value fw-bold text-primary fs-5">{totalServings}</span>
                </div>
              )}
            </div>
          )}

          {/* Single value display - only show if no breakdown available */}
          {!hasBreakdown && (
            <div className="preview-section mb-3 border-top pt-3">
              <div className="preview-row total">
                <span className="label fw-bold fs-5">Quantity:</span>
                <span className="value fw-bold fs-5 text-primary">{command.value}</span>
              </div>
            </div>
          )}

          {/* Transcription */}
          {command.transcription && (
            <div className="preview-section bg-light p-3 rounded">
              <div className="preview-row transcription">
                <span className="label text-muted small">You said:</span>
                <span className="value fst-italic">"{command.transcription}"</span>
              </div>
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={onCancel} 
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleConfirm} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Updating...
            </>
          ) : (
            'Confirm'
          )}
        </Button>
      </Modal.Footer>

      <style>{`
        .command-preview {
          padding: 0.5rem;
        }

        .preview-section {
          margin-bottom: 1rem;
        }

        .preview-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #eee;
        }

        .preview-row:last-child {
          border-bottom: none;
        }

        .preview-row.total {
          border-top: 2px solid #0d6efd;
          border-bottom: none;
          margin-top: 0.5rem;
        }

        .preview-row .label {
          color: #666;
        }

        .preview-row .value {
          text-align: right;
        }

        .preview-row.transcription {
          border: none;
          padding: 0;
        }

        .preview-row.transcription .label,
        .preview-row.transcription .value {
          display: block;
          text-align: left;
        }

        .preview-row.transcription .value {
          margin-top: 0.25rem;
        }
      `}</style>
    </Modal>
  );
};
