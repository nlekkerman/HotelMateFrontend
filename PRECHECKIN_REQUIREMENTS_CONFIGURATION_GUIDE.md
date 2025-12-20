# Pre-Check-In Requirements Configuration Guide

## Overview

The HotelMate system allows hotel staff to dynamically configure what information guests must provide during the pre-check-in process. This flexible system ensures hotels can collect the specific data they need while maintaining a streamlined guest experience.

## Staff Dashboard Configuration

### Accessing Pre-Check-In Settings
1. Navigate to **Settings** in the staff dashboard
2. Select **Pre-check-in Requirements** section
3. Configure fields using the **Enabled** and **Required** toggles

### Field Configuration Options

Each precheckin field has two independent settings:

| Setting | Description | Impact |
|---------|-------------|--------|
| **Enabled** | Controls whether the field appears in the guest form | ✅ ON: Field visible to guests<br>❌ OFF: Field hidden from guests |
| **Required** | Controls whether the field must be completed | ✅ ON: Guest cannot submit without completing<br>❌ OFF: Field is optional |

### Configuration Matrix

| Enabled | Required | Result |
|---------|----------|--------|
| ❌ OFF | ❌ OFF | Field not shown to guests |
| ❌ OFF | ✅ ON | Field not shown (Enabled overrides Required) |
| ✅ ON | ❌ OFF | Field shown as optional |
| ✅ ON | ✅ ON | Field shown as mandatory |

## Available Precheckin Fields

### Booking-Level Fields
These fields apply to the entire booking and are stored in `booking.precheckin_payload`:

| Field | Purpose | Data Type | Scope |
|-------|---------|-----------|-------|
| **Estimated Time of Arrival** | Guest arrival time planning | Time | Booking |
| **Special Requests** | Guest preferences/needs | Text | Booking |
| **Terms & Conditions Consent** | Legal agreement acceptance | Boolean | Booking |

### Guest-Level Fields
These fields are collected for each individual guest and stored in `BookingGuest.precheckin_payload`:

| Field | Purpose | Data Type | Scope |
|-------|---------|-----------|-------|
| **Nationality** | Immigration/reporting requirements | Country Code | Guest |
| **Country of Residence** | Tax/legal reporting | Country Code | Guest |
| **Date of Birth** | Age verification/legal compliance | Date | Guest |
| **ID Document Type** | Identity verification | Enum | Guest |
| **ID Document Number** | Identity verification | String | Guest |
| **Address Line 1** | Guest contact information | String | Guest |
| **City** | Guest contact information | String | Guest |
| **Postal Code** | Guest contact information | String | Guest |

## Configuration Best Practices

### Recommended Configurations by Hotel Type

#### **Budget Hotels**
- **Minimal Requirements**: Only enable essential fields
- Enabled: Arrival time, terms consent
- Required: Terms consent only

#### **Business Hotels**
- **Moderate Requirements**: Balance efficiency with information needs
- Enabled: Arrival time, special requests, nationality, terms consent
- Required: Nationality, terms consent

#### **Luxury Hotels**
- **Comprehensive Requirements**: Detailed guest profiling
- Enabled: All fields
- Required: Arrival time, nationality, country of residence, terms consent

### Legal Compliance Considerations

#### **EU/GDPR Requirements**
- Always require explicit consent checkbox
- Consider nationality for VAT reporting
- Limit data collection to business necessity

#### **Immigration Reporting**
- Some jurisdictions require guest nationality collection
- ID document information may be legally mandated
- Configure based on local regulations

### Guest Experience Impact

#### **Form Length Guidelines**
- **Short Form** (3-4 fields): High completion rates, basic info
- **Medium Form** (5-7 fields): Balanced approach, most common
- **Long Form** (8+ fields): Detailed data, may reduce completion

#### **Mobile Optimization**
- Shorter forms perform better on mobile devices
- Consider progressive disclosure for complex requirements
- Test completion rates after configuration changes

## Technical Implementation

### Frontend Field Rendering
Fields are dynamically rendered based on configuration:
```javascript
// Field visibility logic
if (config.enabled[fieldKey] === true) {
  renderField(fieldKey, config.required[fieldKey])
}
```

### Payload Structure
Data is organized by scope:
```json
{
  "consent_checkbox": true,           // Booking-level
  "eta": "14:30",                    // Booking-level
  "special_requests": "Late arrival", // Booking-level
  "party": {
    "primary": {
      "nationality": "IE",              // Guest-level
      "country_of_residence": "IE"      // Guest-level
    },
    "companions": [...]
  }
}
```

### Database Storage
- **Booking-scoped**: Stored in `RoomBooking.precheckin_payload`
- **Guest-scoped**: Stored in individual `BookingGuest.precheckin_payload`

## Configuration Scenarios

### Scenario 1: City Center Business Hotel
**Business Need**: Quick check-in for business travelers, minimal friction
**Configuration**:
- Enabled: Arrival time, nationality, terms consent
- Required: Terms consent only
- Result: Fast 30-second form completion

### Scenario 2: Resort with International Guests
**Business Need**: Detailed guest profiling for personalized service
**Configuration**:
- Enabled: All fields except ID documents
- Required: Arrival time, nationality, country of residence, terms consent
- Result: Comprehensive guest profiles for service customization

### Scenario 3: Budget Hostel
**Business Need**: Minimal administrative overhead
**Configuration**:
- Enabled: Terms consent only
- Required: Terms consent
- Result: Single-click precheckin process

### Scenario 4: Luxury Hotel with Legal Compliance
**Business Need**: Premium service with regulatory compliance
**Configuration**:
- Enabled: All fields
- Required: Arrival time, nationality, ID type, ID number, address, terms consent
- Result: Complete guest documentation for VIP service and legal compliance

## Monitoring and Optimization

### Key Metrics to Track
- **Completion Rate**: Percentage of guests completing precheckin
- **Abandonment Point**: Which field causes most dropoffs  
- **Time to Complete**: Average form completion duration
- **Mobile vs Desktop**: Performance differences by device

### A/B Testing Recommendations
1. Test different field combinations
2. Compare required vs optional field performance
3. Measure impact of form length on completion rates
4. Optimize field ordering for better flow

## Troubleshooting Common Issues

### Low Completion Rates
- **Reduce required fields** to essential only
- **Simplify field labels** for clarity
- **Test mobile experience** for usability issues

### Guest Complaints About Form Length
- **Review necessity** of each enabled field
- **Consider making fields optional** instead of required
- **Implement progressive disclosure** for advanced fields

### Missing Critical Information
- **Mark essential fields as required**
- **Add field validation** with clear error messages
- **Follow up with incomplete submissions** via staff contact

## Full Configuration Payload Example

When **ALL precheckin fields are enabled** (as shown in the complete dashboard configuration), the frontend will generate this comprehensive payload structure:

```json
{
  "consent_checkbox": true,
  "estimated_arrival": "14:30",
  "special_requests": "Late arrival, ground floor room preferred",
  "party": {
    "primary": {
      "first_name": "John",
      "last_name": "Smith", 
      "email": "john.smith@email.com",
      "phone": "+1234567890",
      "nationality": "US",
      "country_of_residence": "US",
      "date_of_birth": "1985-06-15",
      "id_document_type": "passport",
      "id_document_number": "A12345678",
      "address_line_1": "123 Main Street",
      "city": "New York",
      "postal_code": "10001"
    },
    "companions": [
      {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@email.com", 
        "phone": "+1234567891",
        "nationality": "US",
        "country_of_residence": "US",
        "date_of_birth": "1987-03-22",
        "id_document_type": "passport",
        "id_document_number": "B87654321",
        "address_line_1": "123 Main Street",
        "city": "New York", 
        "postal_code": "10001"
      }
    ]
  }
}
```

### Hotel-Specific Configurations

The beauty of this system is that **each hotel configures only what they need**:

- **Hotel A**: May only enable arrival time + nationality (minimal payload)
- **Hotel B**: May enable all fields (full payload above)  
- **Hotel C**: May enable identity fields but not address fields (custom payload)

The frontend dynamically adapts to whatever fields are enabled in each hotel's dashboard configuration.

## Future Enhancements

### Planned Features
- **Conditional Field Display**: Show fields based on other selections
- **Custom Field Creation**: Hotel-specific requirements
- **Integration Rules**: Auto-populate from booking systems
- **Analytics Dashboard**: Real-time completion metrics

### API Extensibility
The configuration system is designed to accommodate:
- New field types (file uploads, multi-select, etc.)
- Third-party integrations (PMS, CRM systems)
- Automated validation rules
- Dynamic field ordering

---

*This guide provides comprehensive information for hotel staff to optimize their precheckin requirements. For technical support or advanced configurations, contact the HotelMate support team.*