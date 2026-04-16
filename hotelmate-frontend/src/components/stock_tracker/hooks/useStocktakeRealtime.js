import { useEffect } from 'react';
import { addVoiceLog } from '@/voiceRecognition/VoiceDebugPanel';

/**
 * Custom hook for real-time stocktake updates via Pusher
 * 
 * Subscribes to stocktake line updates and automatically updates the UI
 * when purchases, waste, or counts are modified by other users.
 * 
 * Based on backend implementation:
 * - Channel: {hotelIdentifier}-stocktake-{stocktakeId}
 * - Events: line-counted-updated, line-movement-added, stocktake-status-changed, stocktake-populated
 * 
 * @param {object} pusher - Pusher instance (from context)
 * @param {string} hotelIdentifier - Hotel identifier (e.g., "hotel-killarney")
 * @param {number} stocktakeId - Stocktake ID to subscribe to
 * @param {function} onLineUpdated - Callback when a line is updated
 * @param {function} onStocktakeUpdated - Callback when stocktake status changes
 * @param {function} onStocktakePopulated - Callback when stocktake is populated with items
 * @param {boolean} enabled - Whether to enable real-time updates (default: true)
 */
export function useStocktakeRealtime(
  pusher,
  hotelIdentifier,
  stocktakeId,
  onLineUpdated,
  onStocktakeUpdated,
  onStocktakePopulated,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !pusher || !hotelIdentifier || !stocktakeId) {
      return;
    }

    // Channel name format: {hotelIdentifier}-stocktake-{stocktakeId}
    const channelName = `${hotelIdentifier}-stocktake-${stocktakeId}`;


    const channel = pusher.subscribe(channelName);

    // 1. Line counted quantities updated (by another user)
    channel.bind('line-counted-updated', (data) => {
      
      addVoiceLog('info', '📡 Pusher real-time event received: line-counted-updated', {
        channel: channelName,
        lineId: data.line_id,
        itemSku: data.item_sku,
        itemName: data.line?.item_name,
        countedFullUnits: data.line?.counted_full_units,
        countedPartialUnits: data.line?.counted_partial_units,
        countedQty: data.line?.counted_qty,
        hasFullLineData: !!data.line
      });

      if (data.line && typeof onLineUpdated === 'function') {
        onLineUpdated(data.line);
        addVoiceLog('success', '✅ UI updated from Pusher event', {
          lineId: data.line.id,
          itemName: data.line.item_name
        });
      } else {
        addVoiceLog('warning', '⚠️ Pusher event received but could not update UI', {
          hasLineData: !!data.line,
          hasCallback: typeof onLineUpdated === 'function'
        });
      }
    });

    // 2. Movement (purchase/waste) added (by another user)
    channel.bind('line-movement-added', (data) => {
      
      addVoiceLog('info', '📡 Pusher real-time event received: line-movement-added', {
        channel: channelName,
        lineId: data.line_id,
        itemSku: data.item_sku,
        movementType: data.movement_type,
        hasFullLineData: !!data.line
      });

      if (data.line && typeof onLineUpdated === 'function') {
        // Line includes updated purchases/waste/expected_qty/variance
        onLineUpdated(data.line);
        addVoiceLog('success', '✅ UI updated from Pusher movement event', {
          lineId: data.line.id,
          purchases: data.line.purchases,
          waste: data.line.waste
        });
      }
    });

    // 3. Stocktake status changed (approved/locked)
    channel.bind('stocktake-status-changed', (data) => {

      if (data.stocktake && typeof onStocktakeUpdated === 'function') {
        onStocktakeUpdated(data.stocktake);
      }
    });

    // 4. Stocktake populated with items
    channel.bind('stocktake-populated', (data) => {

      if (typeof onStocktakePopulated === 'function') {
        onStocktakePopulated(data);
      }
    });

    // Handle connection state
    channel.bind('pusher:subscription_succeeded', () => {
      addVoiceLog('success', '✅ Pusher subscription active for real-time updates', {
        channel: channelName,
        listening: ['line-counted-updated', 'line-movement-added', 'stocktake-status-changed']
      });
    });

    channel.bind('pusher:subscription_error', (error) => {
      console.error('❌ Failed to subscribe to channel:', error);
      addVoiceLog('error', '❌ Pusher subscription failed', {
        channel: channelName,
        error: error
      });
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [pusher, hotelIdentifier, stocktakeId, onLineUpdated, onStocktakeUpdated, onStocktakePopulated, enabled]);
}

/**
 * Example usage:
 * 
 * import { useStocktakeRealtime } from './hooks/useStocktakeRealtime';
 * import { usePusherContext } from '@/staff_chat/context/PusherProvider';
 * 
 * const MyComponent = ({ hotelSlug, stocktakeId }) => {
 *   const { pusher } = usePusherContext();
 *   const [lines, setLines] = useState([]);
 * 
 *   const handleLineUpdate = useCallback((updatedLine) => {
 *     setLines(prevLines => 
 *       prevLines.map(line => 
 *         line.id === updatedLine.id ? updatedLine : line
 *       )
 *     );
 *   }, []);
 * 
 *   useStocktakeRealtime(
 *     pusher,
 *     hotelSlug,
 *     stocktakeId,
 *     handleLineUpdate,
 *     true // enabled
 *   );
 * 
 *   // ... rest of component
 * };
 */
