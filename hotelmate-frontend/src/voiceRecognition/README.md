# Voice Recognition Module

This module provides voice command functionality for the stocktake system, using backend OpenAI Whisper transcription and GPT parsing.

## Architecture

**Frontend (Browser):**
- Records audio using MediaRecorder API
- Sends audio Blob to backend via REST API
- Displays preview modal with parsed command
- Executes stocktake updates on user confirmation

**Backend (Django + OpenAI):**
- Transcribes audio using OpenAI Whisper
- Parses commands using GPT (or rule-based parsing)
- Returns structured command data
- Does NOT update database (preview only)

## Files

### `useVoiceRecorder.js`
React hook for audio recording using MediaRecorder API.

**Returns:**
- `isRecording` - Boolean recording state
- `isProcessing` - Boolean processing state
- `audioBlob` - Recorded audio Blob (webm format)
- `error` - Error message if recording fails
- `startRecording()` - Start recording
- `stopRecording()` - Stop recording
- `reset()` - Clear state

**Audio Format:** `audio/webm;codecs=opus` (compatible with OpenAI Whisper)

### `voiceApi.js`
API service for sending voice commands to backend.

**Function:** `sendVoiceCommand(audioBlob, stocktakeId, hotelSlug)`

**Request:** 
- Method: POST
- Endpoint: `/api/stock_tracker/{hotel_slug}/stocktake-lines/voice-command/`
- Content-Type: multipart/form-data
- Body: audio file + stocktake_id

**Response:**
```javascript
{
  success: true,
  command: {
    action: "count" | "purchase" | "waste",
    item_identifier: "Product Name",
    value: 24,
    full_units: 2,          // Optional: for dozen products
    partial_units: 3,       // Optional: for dozen products
    transcription: "count heineken twenty four"
  },
  stocktake_id: 123
}
```

### `VoiceRecorder.jsx`
Recording button component with visual states.

**Props:**
- `stocktakeId` - Active stocktake ID
- `hotelSlug` - Hotel identifier
- `onCommandReceived` - Callback with command data
- `isLocked` - Disable if stocktake is locked

**States:**
- Idle: Blue mic button
- Recording: Red pulsing button with "REC" indicator
- Processing: Yellow button with spinner
- Success: Green button (2 seconds)
- Error: Red button with error message (3 seconds)

### `VoiceCommandPreview.jsx`
Confirmation modal for voice commands.

**Props:**
- `command` - Parsed command object
- `stocktake` - Stocktake data
- `onConfirm` - Callback to execute command
- `onCancel` - Callback to dismiss modal

**Display:**
- Action badge (Count/Purchase/Waste)
- Product name
- Full units (if applicable)
- Partial units (if applicable)
- Total value
- Original transcription
- Confirm/Cancel buttons

## Integration

### StocktakeDetail.jsx

**State:**
```javascript
const [voicePreviewCommand, setVoicePreviewCommand] = useState(null);
```

**Handlers:**
```javascript
const handleVoiceCommandReceived = (command) => {
  setVoicePreviewCommand(command);
};

const handleVoiceCommandConfirm = async (command) => {
  // Find matching line
  // Map action to API call
  // Update state
  // Close modal
};

const handleVoiceCommandCancel = () => {
  setVoicePreviewCommand(null);
};
```

**Components:**
```jsx
<VoiceRecorder
  stocktakeId={parseInt(id)}
  hotelSlug={hotel_slug}
  onCommandReceived={handleVoiceCommandReceived}
  isLocked={isLocked}
/>

{voicePreviewCommand && (
  <VoiceCommandPreview
    command={voicePreviewCommand}
    stocktake={stocktake}
    onConfirm={handleVoiceCommandConfirm}
    onCancel={handleVoiceCommandCancel}
  />
)}
```

## Voice Command Flow

1. User clicks mic button → start recording
2. User clicks again → stop recording
3. Frontend sends audio Blob + stocktake_id to backend
4. Backend transcribes with Whisper
5. Backend parses with GPT (or rules)
6. Backend returns preview JSON
7. Frontend shows confirmation modal
8. User clicks Confirm
9. Frontend finds matching stocktake line
10. Frontend calls existing PATCH API
11. Pusher broadcasts update
12. UI updates in real-time

## Product Matching

Frontend uses fuzzy matching to find stocktake lines:

```javascript
const matchingLine = lines.find(line => 
  line.item_name.toLowerCase().includes(productName) ||
  productName.includes(line.item_name.toLowerCase()) ||
  line.item_sku?.toLowerCase() === productName
);
```

**Priority:**
1. Exact SKU match
2. Product name contains identifier
3. Identifier contains product name

## API Mapping

### Count Action
```javascript
PATCH /stock_tracker/{hotel_slug}/stocktake-lines/{line_id}/

// With full/partial units
{
  counted_full_units: 2,
  counted_partial_units: 3
}

// OR single value
{
  counted_quantity: 27
}
```

### Purchase/Waste Actions
```javascript
PATCH /stock_tracker/{hotel_slug}/stocktake-lines/{line_id}/

// With full/partial units
{
  purchases_full_units: 2,
  purchases_partial_units: 3
}

// OR single value
{
  purchases: 27  // or waste: 27
}
```

## Error Handling

**Microphone Access Denied:**
- Shows error message below button
- Auto-clears after 3 seconds

**Backend API Error:**
- Shows error message below button
- Logs to console
- Auto-clears after 3 seconds

**Product Not Found:**
- Shows toast error after confirmation
- Closes modal
- Does not update stocktake

**Network Error:**
- Shows error from axios interceptor
- User can retry

## Browser Compatibility

**MediaRecorder API:**
- ✅ Chrome 47+
- ✅ Edge 79+
- ✅ Firefox 25+
- ✅ Safari 14.1+
- ❌ IE (not supported)

**Audio Format:**
- Primary: `audio/webm;codecs=opus`
- Fallback: `audio/webm`

## Backend Requirements

Backend must implement:

**Endpoint:** `POST /api/stock_tracker/{hotel_slug}/stocktake-lines/voice-command/`

**Request:**
- `multipart/form-data`
- `audio`: File (webm, mp4, mpeg, mpga, m4a, wav, mp3)
- `stocktake_id`: String

**Response:**
```javascript
{
  success: boolean,
  command: {
    action: string,
    item_identifier: string,
    value: number,
    full_units: number | null,
    partial_units: number | null,
    transcription: string
  },
  stocktake_id: number
}
```

**Error Response:**
```javascript
{
  success: false,
  error: string,
  details?: object
}
```

## Testing

1. Open stocktake in browser
2. Click microphone button (grants permission)
3. Speak command: "count Heineken 24"
4. Click stop button
5. Wait for processing (2-5 seconds)
6. Review preview modal
7. Click Confirm
8. Verify stocktake line updated

## Future Enhancements

- Voice feedback (read back parsed command)
- Batch commands ("count all beer")
- Custom pronunciation dictionary
- Offline mode with local STT
- Multi-language support
- Voice command history
- Analytics dashboard
