// src/components/rooms/hooks/useSingleRoomQrPdfPrinter.js
import jsPDF from "jspdf";
import api from "@/services/api";

const CLOUDINARY_BASE = "https://res.cloudinary.com/dg0ssec7u/";

export const useSingleRoomQrPdfPrinter = () => {
  const generateSingleRoomQrPdf = async (room) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Fetch hotel name
    let hotelName = "HotelMate";

    try {
      const { data } = await api.get("/staff/me/");
      const hotel = data.user?.staff_profile?.hotel;
      if (hotel?.name) hotelName = hotel.name;
    } catch (err) {
      console.error("Failed to fetch hotel info", err);
    }

    // Add hotel name
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text(hotelName, 105, 20, { align: "center" });

    doc.setFontSize(22);
    doc.text(`Room ${room.room_number}`, 105, 35, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(108, 117, 125);
    doc.text(
      "Welcome! Use these codes to access personalized in-room services.",
      105,
      45,
      { align: "center", maxWidth: 180 }
    );

    let y = 60;

    const drawQr = async (title, description, url, pillColor = [220, 230, 240]) => {
      const qrBlockHeight = 60;

      if (y + qrBlockHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      const img = await toDataURL(url);
      const titleWidth = doc.getTextWidth(title) + 10;
      const pillX = 105 - titleWidth / 2;

      // Pill background
      doc.setFillColor(...pillColor);
      doc.roundedRect(pillX, y, titleWidth, 10, 5, 5, "F");

      // Title text
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.text(title, 105, y + 7, { align: "center" });

      y += 12;

      // Description
      doc.setFontSize(10);
      doc.setTextColor(73, 80, 87);
      doc.text(description, 105, y, { align: "center", maxWidth: 140 });

      y += 4;

      // QR image
      doc.addImage(img, "PNG", 82.5, y, 45, 45); // centered at x = 105

      y += 50;
    };

    if (room.room_service_qr_code)
      await drawQr(
        "Room Service",
        "Explore our in-room dining menu and place your order at any time.",
        room.room_service_qr_code,
        [230, 244, 255]
      );

    if (room.in_room_breakfast_qr_code)
      await drawQr(
        "In-Room Breakfast",
        "Wake up to comfort – choose and schedule your breakfast delivery.",
        room.in_room_breakfast_qr_code,
        [240, 255, 240]
      );

    if (room.dinner_booking_qr_code)
      await drawQr(
        "Dinner Reservations",
        "Reserve your table for a delightful evening experience with us.",
        room.dinner_booking_qr_code,
        [255, 250, 205]
      );

    doc.save(`Room_${room.room_number}_QR_Codes.pdf`);
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

  return { generateSingleRoomQrPdf };
};
