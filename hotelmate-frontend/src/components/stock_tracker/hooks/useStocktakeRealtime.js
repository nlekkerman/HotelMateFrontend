import { useEffect } from 'react';

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
      console.log('⏸️ Stocktake real-time updates disabled', {
        enabled,
        pusher: !!pusher,
        hotelIdentifier,
        stocktakeId
      });
      return;
    }

    // Channel name format: {hotelIdentifier}-stocktake-{stocktakeId}
    const channelName = `${hotelIdentifier}-stocktake-${stocktakeId}`;

    console.log('🔌 Subscribing to stocktake channel:', channelName);

    const channel = pusher.subscribe(channelName);

    // 1. Line counted quantities updated (by another user)
    channel.bind('line-counted-updated', (data) => {
      console.log('📡 Pusher: Line counted updated', data);

      if (data.line && typeof onLineUpdated === 'function') {
        onLineUpdated(data.line);
      }
    });

    // 2. Movement (purchase/waste) added (by another user)
    channel.bind('line-movement-added', (data) => {
      console.log('📡 Pusher: Movement added', data);

      if (data.line && typeof onLineUpdated === 'function') {
        // Line includes updated purchases/waste/expected_qty/variance
        onLineUpdated(data.line);
      }
    });

    // 3. Stocktake status changed (approved/locked)
    channel.bind('stocktake-status-changed', (data) => {
      console.log('� Pusher: Stocktake status changed', data);

      if (data.stocktake && typeof onStocktakeUpdated === 'function') {
        onStocktakeUpdated(data.stocktake);
      }
    });

    // 4. Stocktake populated with items
    channel.bind('stocktake-populated', (data) => {
      console.log('� Pusher: Stocktake populated', data);

      if (typeof onStocktakePopulated === 'function') {
        onStocktakePopulated(data);
      }
    });

    // Handle connection state
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ Successfully subscribed to:', channelName);
    });

    channel.bind('pusher:subscription_error', (error) => {
      console.error('❌ Failed to subscribe to channel:', error);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Unsubscribing from:', channelName);
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
