// src/hooks/useQrPdfPrinter.js
import jsPDF from "jspdf";

export const useQrPdfPrinter = () => {
  const generateQrPdf = async (rooms) => {
    const doc = new jsPDF();

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      doc.addPage();

      // Header
      doc.setTextColor(33, 37, 41); // Bootstrap text-dark
      doc.setFontSize(22);
      doc.text(`Room ${room.room_number}`, 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(108, 117, 125); // Bootstrap text-secondary
      doc.text(
        "Welcome! Use these codes to access personalized in-room services.",
        105,
        28,
        { align: "center", maxWidth: 180 }
      );

      let y = 45;

     const drawQr = async (title, description, url, pillColor = [220, 230, 240]) => {
  const img = await toDataURL(url);

  // Draw pill background just behind the title
  const titleWidth = doc.getTextWidth(title) + 10;
  const pillX = 105 - titleWidth / 2;
  doc.setFillColor(...pillColor);
  doc.roundedRect(pillX, y, titleWidth, 10, 5, 5, 'F');

  // Title on pill
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41); // text-dark
  doc.text(title, 105, y + 7, { align: "center" });

  // Description
  y += 14;
  doc.setFontSize(10);
  doc.setTextColor(73, 80, 87); // muted
  doc.text(description, 105, y, { align: "center", maxWidth: 140 });

  // QR Code
  y += 5;
  doc.addImage(img, "PNG", 80, y, 50, 50);

  y += 65;
};


      if (room.room_service_qr_code)
        await drawQr(
          "Room Service",
          "Explore our in-room dining menu and place your order at any time.",
          room.room_service_qr_code,
          [230, 244, 255] // light blue
        );

      if (room.in_room_breakfast_qr_code)
        await drawQr(
          "In-Room Breakfast",
          "Wake up to comfort – choose and schedule your breakfast delivery.",
          room.in_room_breakfast_qr_code,
          [240, 255, 240] // light green
        );

      if (room.dinner_booking_qr_code)
        await drawQr(
          "Dinner Reservations",
          "Reserve your table for a delightful evening experience with us.",
          room.dinner_booking_qr_code,
          [255, 250, 205] // light gold
        );
    }

    doc.deletePage(1); // remove first blank page
    doc.save("Hotel_QR_Service_Guide.pdf");
  };

  const toDataURL = (url) =>
    fetch(url)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          })
      );

  return { generateQrPdf };
};
