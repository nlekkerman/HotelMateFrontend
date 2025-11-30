# Face Recognition Enhancement Migration Guide

This guide helps you migrate existing face recognition components to use the enhanced API with face encodings and improved security.

## 🔄 Migration Steps

### 1. Update Dependencies

Ensure you have `face-api.js` installed if not already:

```bash
npm install face-api.js
```

### 2. Load Face Recognition Models

The enhanced API requires 128-dimensional face encoding vectors. Use the new hook to handle model loading:

```javascript
import { useFaceRecognitionModels, useFaceEncoder } from '@/features/faceAttendance';

function FaceRegistrationComponent() {
  const { modelsLoaded, loading, error } = useFaceRecognitionModels();
  const { extractFaceEncoding, validateFaceQuality, processing } = useFaceEncoder();
  
  // Wait for models to load before enabling face operations
  if (!modelsLoaded) {
    return <div>Loading face recognition models...</div>;
  }
  
  // ... rest of component
}
```

### 3. Update Face Registration Flow

**Before (Deprecated):**
```javascript
import { useFaceApi } from '@/features/faceAttendance';

function RegisterFace() {
  const { registerFace } = useFaceApi();
  
  const handleRegister = async (imageBase64) => {
    await registerFace({
      hotelSlug,
      staffId,
      imageBase64
    });
  };
}
```

**After (Enhanced):**
```javascript
import { useFaceApi, useFaceEncoder, FaceRecognitionUtils } from '@/features/faceAttendance';

function RegisterFace() {
  const { registerFace } = useFaceApi();
  const { extractFaceEncoding, validateFaceQuality } = useFaceEncoder();
  const [consent, setConsent] = useState(false);
  
  const handleRegister = async (imageBase64) => {
    // 1. Validate consent
    if (!consent) {
      alert('Please provide consent for face data processing');
      return;
    }
    
    // 2. Validate image quality
    const validation = await validateFaceQuality(imageBase64);
    if (!validation.valid) {
      alert(`Image quality issues: ${validation.issues.join(', ')}`);
      return;
    }
    
    // 3. Extract face encoding
    const result = await extractFaceEncoding(imageBase64);
    if (!result.encoding) {
      alert(FaceRecognitionUtils.getErrorMessage(result.error));
      return;
    }
    
    // 4. Register with encoding
    await registerFace({
      hotelSlug,
      staffId,
      imageBase64,
      encoding: result.encoding,
      consentGiven: consent
    });
  };
  
  return (
    <div>
      <label>
        <input 
          type="checkbox" 
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
        />
        I consent to storing my facial data for attendance tracking
      </label>
      <button onClick={() => handleRegister(capturedImage)}>
        Register Face
      </button>
    </div>
  );
}
```

### 4. Update Face Clock-In Flow

**Before (Deprecated):**
```javascript
const handleClockIn = async (imageBase64) => {
  await clockInWithFace({
    hotelSlug,
    imageBase64,
    locationNote
  });
};
```

**After (Enhanced):**
```javascript
const handleClockIn = async (imageBase64) => {
  // 1. Extract face encoding
  const result = await extractFaceEncoding(imageBase64);
  if (!result.encoding) {
    alert(FaceRecognitionUtils.getErrorMessage(result.error));
    return;
  }
  
  // 2. Clock in with encoding
  try {
    const response = await clockInWithFace({
      hotelSlug,
      imageBase64,
      encoding: result.encoding,
      locationNote,
      forceAction: undefined // Let API determine action
    });
    
    console.log('Clock action:', response.action); // 'clock_in' or 'clock_out'
    console.log('Confidence:', response.confidence_score);
  } catch (error) {
    if (FaceRecognitionUtils.isRetryableError(error.code)) {
      // Show retry option
      alert(`${FaceRecognitionUtils.getErrorMessage(error.code)} Please try again.`);
    } else {
      // Show different error handling
      alert('Face recognition failed. Please use manual clock-in.');
    }
  }
};
```

### 5. Add Face Status Checking

Use the new status checking function to verify registration:

```javascript
import { useFaceApi } from '@/features/faceAttendance';

function FaceAttendanceComponent() {
  const { checkFaceStatus } = useFaceApi();
  const [faceStatus, setFaceStatus] = useState(null);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkFaceStatus({ hotelSlug });
        setFaceStatus(status);
      } catch (error) {
        console.error('Failed to check face status:', error);
      }
    };
    
    checkStatus();
  }, [hotelSlug]);
  
  if (!faceStatus?.has_registered_face) {
    return <FaceRegistrationPrompt />;
  }
  
  return <FaceClockInInterface />;
}
```

### 6. Admin Face Management

For administrative functions, use the enhanced admin API:

```javascript
import { useFaceAdminApi } from '@/features/faceAttendance';

function FaceManagementAdmin() {
  const { revokeFace, getFaceAuditLogs } = useFaceAdminApi();
  
  const handleRevokeFace = async (staffId, reason) => {
    try {
      await revokeFace({
        hotelSlug,
        staffId,
        reason
      });
      alert('Face data revoked successfully');
    } catch (error) {
      alert(`Failed to revoke: ${error.message}`);
    }
  };
  
  const handleViewAuditLogs = async (staffId) => {
    try {
      const logs = await getFaceAuditLogs({
        hotelSlug,
        staffId,
        page: 1,
        pageSize: 50
      });
      console.log('Audit logs:', logs.results);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };
}
```

## 🚨 Breaking Changes Checklist

- [ ] **Face Encoding Required**: All face operations now require 128-dimensional encoding arrays
- [ ] **Consent Management**: Explicit consent must be obtained and passed to registration
- [ ] **API Response Changes**: Enhanced endpoints return different response structures
- [ ] **Error Code Updates**: New error codes for enhanced error handling
- [ ] **Model Dependencies**: Face-api.js models must be loaded and accessible
- [ ] **Confidence Scores**: Clock-in responses now include confidence scores

## 📋 Component Update Checklist

For each component using face recognition:

- [ ] Add face recognition model loading
- [ ] Implement consent collection UI
- [ ] Add face encoding extraction
- [ ] Update API calls to use new parameters
- [ ] Update error handling for new error codes
- [ ] Add face quality validation
- [ ] Test with various lighting conditions
- [ ] Verify privacy compliance (consent, revocation)

## 🔒 Security & Privacy Requirements

### Consent Management
```javascript
const ConsentDialog = ({ onConsent }) => (
  <div className="consent-dialog">
    <h3>Face Recognition Consent</h3>
    <p>
      Do you consent to storing your facial data for attendance tracking? 
      This data will be securely stored and you can revoke consent at any time.
    </p>
    <ul>
      <li>Your face image will be stored securely in the cloud</li>
      <li>Face encoding data is used only for attendance verification</li>
      <li>You can request deletion of your face data at any time</li>
      <li>All face recognition activities are logged for audit purposes</li>
    </ul>
    <button onClick={() => onConsent(true)}>Accept</button>
    <button onClick={() => onConsent(false)}>Decline</button>
  </div>
);
```

### Audit Trail Access
```javascript
const FaceAuditTrail = ({ staffId }) => {
  const { getFaceAuditLogs } = useFaceAdminApi();
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    const fetchLogs = async () => {
      const result = await getFaceAuditLogs({
        hotelSlug,
        staffId,
        page: 1,
        pageSize: 100
      });
      setLogs(result.results);
    };
    
    fetchLogs();
  }, [staffId]);
  
  return (
    <div>
      <h3>Face Data Lifecycle</h3>
      {logs.map(log => (
        <div key={log.id}>
          <strong>{log.action}</strong> by {log.performed_by_name} 
          on {new Date(log.created_at).toLocaleString()}
          {log.reason && <p>Reason: {log.reason}</p>}
        </div>
      ))}
    </div>
  );
};
```

## 🧪 Testing Recommendations

1. **Model Loading**: Test with slow network conditions
2. **Face Detection**: Test with various lighting conditions
3. **Multiple Faces**: Verify rejection of multiple faces in frame
4. **Poor Quality**: Test with blurry/low-resolution images
5. **Consent Flow**: Test consent acceptance and rejection
6. **Privacy**: Test face data revocation and audit logs
7. **Error Handling**: Test all error scenarios
8. **Performance**: Test encoding extraction speed

## 📚 Additional Resources

- [Face-API.js Documentation](https://github.com/justadudewhohacks/face-api.js)
- [HotelMate Backend API Guide](./FRONTEND_ATTENDANCE_ROSTER_API_GUIDE.md)
- [Privacy Compliance Guidelines](./PRIVACY_COMPLIANCE.md)

## ⚠️ Common Gotchas

1. **Model Files**: Ensure face-api.js model files are in `/public/models/`
2. **CORS Issues**: Face-api.js needs proper CORS headers for model loading
3. **Memory Usage**: Face encoding extraction can be memory-intensive
4. **Browser Compatibility**: Some face-api.js features require modern browsers
5. **Image Formats**: Ensure consistent image format handling (JPEG recommended)
6. **Async Operations**: Proper loading state management for encoding extraction

## 🆘 Troubleshooting

### Models Not Loading
```javascript
// Check if model files exist
const modelPaths = [
  '/models/tiny_face_detector_model-weights_manifest.json',
  '/models/face_landmark_68_model-weights_manifest.json', 
  '/models/face_recognition_model-weights_manifest.json'
];

modelPaths.forEach(async path => {
  try {
    const response = await fetch(path);
    console.log(`${path}: ${response.ok ? 'OK' : 'MISSING'}`);
  } catch (error) {
    console.error(`${path}: ERROR -`, error);
  }
});
```

### Face Not Detected
- Check image quality and lighting
- Ensure face is clearly visible and unobstructed
- Verify camera resolution is adequate
- Test with different face positions

### Poor Recognition Performance
- Increase image resolution during capture
- Improve lighting conditions
- Ensure consistent camera positioning
- Consider face registration re-training