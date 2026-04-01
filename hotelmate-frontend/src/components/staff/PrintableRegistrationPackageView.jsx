/**
 * Opens a clean print window for a registration package.
 * Uses browser print on a structured HTML view.
 */
export function printRegistrationPackage(pkg) {
  const code = pkg.registration_code || pkg.code || '';
  const hotelName = pkg.hotel_name || 'HotelMates';
  const regUrl = pkg.registration_url || '';
  const qrUrl = pkg.qr_code_url || '';
  const createdAt = pkg.created_at
    ? new Date(pkg.created_at).toLocaleString()
    : new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Staff Registration Package - ${code}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      text-align: center;
      color: #2c3e50;
    }
    .hotel-name {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .title {
      font-size: 20px;
      color: #3498db;
      margin-bottom: 30px;
    }
    .qr-code img {
      max-width: 280px;
      height: auto;
      border: 2px solid #ddd;
      padding: 10px;
      background: #fff;
    }
    .code-section {
      margin: 24px auto;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      max-width: 400px;
    }
    .code-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }
    .code-value {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 3px;
      font-family: 'Courier New', monospace;
    }
    .reg-url {
      font-size: 13px;
      color: #888;
      word-break: break-all;
      margin-top: 12px;
    }
    .instructions {
      margin-top: 32px;
      text-align: left;
      padding: 18px;
      background: #e8f4f8;
      border-radius: 8px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }
    .instructions h3 { color: #2c3e50; margin-bottom: 12px; font-size: 16px; }
    .instructions ol { line-height: 1.8; margin: 0; padding-left: 20px; }
    .footer {
      margin-top: 36px;
      font-size: 11px;
      color: #999;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="hotel-name">${hotelName}</div>
  <div class="title">Staff Registration Package</div>

  ${qrUrl ? `
  <div class="qr-code">
    <p style="color:#666;margin-bottom:12px;">Scan this QR code to start registration:</p>
    <img src="${qrUrl}" alt="Registration QR Code" />
  </div>` : ''}

  <div class="code-section">
    <div class="code-label">Registration Code</div>
    <div class="code-value">${code}</div>
  </div>

  ${regUrl ? `<div class="reg-url">${regUrl}</div>` : ''}

  <div class="instructions">
    <h3>Registration Instructions</h3>
    <ol>
      <li><strong>Scan the QR code</strong> above with your phone camera</li>
      <li>Your browser will open the registration page</li>
      <li><strong>Enter the registration code</strong> shown above</li>
      <li>Create your <strong>username</strong> and <strong>password</strong></li>
      <li>Submit the form and wait for manager approval</li>
    </ol>
  </div>

  <div class="footer">
    Generated: ${createdAt}
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
