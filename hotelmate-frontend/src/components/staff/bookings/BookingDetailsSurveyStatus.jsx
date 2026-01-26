import React from 'react';
import { Alert } from 'react-bootstrap';
import { format } from 'date-fns';

const BookingDetailsSurveyStatus = ({ booking }) => {
  // Check if booking is eligible (COMPLETED status)
  if (booking?.status !== 'COMPLETED') {
    return (
      <Alert variant="secondary">
        <Alert.Heading>— Survey</Alert.Heading>
        <p>Survey will be available after checkout.</p>
      </Alert>
    );
  }

  const surveyScheduledAt = booking?.survey_send_at;
  const surveySentAt = booking?.survey_sent_at;
  const surveyCompleted = booking?.survey_completed;
  const surveyResponse = booking?.survey_response;
  const surveyLastSentTo = booking?.survey_last_sent_to;

  // State 5: Completed
  if (surveyCompleted) {
    const surveyResponse = booking?.survey_response;
    const surveyPayload = surveyResponse?.payload;
    const submittedAt = surveyResponse?.submitted_at;
    const overallRating = surveyResponse?.overall_rating || booking?.survey_rating;

    // Debug logging to see what survey data we have
    console.log('🔍 Survey Response Debug:', {
      surveyResponse,
      surveyPayload, 
      overallRating,
      bookingSurveyRating: booking?.survey_rating
    });

    return (
      <Alert variant="success">
        <Alert.Heading>✅ Survey completed</Alert.Heading>
        {submittedAt ? (
          <p><strong>Submitted:</strong> {format(new Date(submittedAt), 'MMM dd, yyyy HH:mm')}</p>
        ) : surveySentAt && (
          <p><strong>Completed after:</strong> {format(new Date(surveySentAt), 'MMM dd, yyyy HH:mm')}</p>
        )}
        {overallRating && (
          <p><strong>Overall rating:</strong> {overallRating}/5</p>
        )}
        
        {/* Survey Response Information */}
        <h6>Survey Information</h6>
        {surveyPayload && Object.keys(surveyPayload).length > 0 ? (
          // Expected structure: survey_response.payload contains all fields
          <ul>
            {Object.entries(surveyPayload).map(([key, value]) => {
              // Skip if value is null/empty
              if (value == null || value === '') return null;
              
              return (
                <li key={key}>
                  <strong>{key.replace(/_/g, ' ')}:</strong> {
                    (key.includes('_rating') || key === 'overall_rating') && value ? `${value}/5` :
                    key === 'contact_permission' ? (value ? '✅ Yes' : '❌ No') :
                    key === 'recommend_hotel' ? (value ? '✅ Yes' : '❌ No') :
                    typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : 
                    value
                  }
                </li>
              );
            })}
          </ul>
        ) : surveyResponse && Object.keys(surveyResponse).length > 0 ? (
          // Fallback: if no payload, try to display response fields directly
          <ul>
            {Object.entries(surveyResponse).map(([key, value]) => {
              // Skip internal fields and already displayed fields
              if (['submitted_at', 'overall_rating'].includes(key) || value == null || value === '') return null;
              
              return (
                <li key={key}>
                  <strong>{key.replace(/_/g, ' ')}:</strong> {
                    (key.includes('_rating') || key === 'overall_rating') && value ? `${value}/5` :
                    key === 'contact_permission' ? (value ? '✅ Yes' : '❌ No') :
                    key === 'recommend_hotel' ? (value ? '✅ Yes' : '❌ No') :
                    typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : 
                    value
                  }
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Survey completed - detailed response data will appear here once backend provides survey_response.payload</p>
        )}
      </Alert>
    );
  }

  // State 4: Sent
  if (surveySentAt) {
    return (
      <Alert variant="info">
        <Alert.Heading>📨 Survey sent</Alert.Heading>
        <p><strong>Sent:</strong> {format(new Date(surveySentAt), 'MMM dd, yyyy HH:mm')}</p>
        {surveyLastSentTo && (
          <p><strong>Sent to:</strong> {surveyLastSentTo}</p>
        )}
      </Alert>
    );
  }

  // State 3: Scheduled
  if (surveyScheduledAt) {
    return (
      <Alert variant="warning">
        <Alert.Heading>🕒 Survey scheduled</Alert.Heading>
        <p><strong>Scheduled:</strong> {format(new Date(surveyScheduledAt), 'MMM dd, yyyy HH:mm')}</p>
      </Alert>
    );
  }

  // State 2: Eligible but not scheduled/sent
  return (
    <Alert variant="secondary">
      <Alert.Heading>⏳ Survey not scheduled</Alert.Heading>
      <p>Survey is eligible to be sent but has not been scheduled.</p>
    </Alert>
  );
};

export default BookingDetailsSurveyStatus;