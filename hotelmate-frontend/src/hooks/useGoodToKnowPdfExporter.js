import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const useGoodToKnowPdfExporter = () => {
  const generateGoodToKnowPdf = (entries) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const imageSize = 50;
    const gap = 10;
    const itemsPerRow = Math.floor((pageWidth - margin * 2) / (imageSize + gap));
    let x = margin;
    let y = 20;
    let rowCount = 0;

    doc.setFontSize(18);
    doc.text("Good To Know QR Codes", pageWidth / 2, 15, { align: "center" });

    entries.forEach((entry, index) => {
      if (!entry.qr_url) return;

      // Add QR code image
      doc.addImage(
        entry.qr_url,
        "PNG",
        x,
        y,
        imageSize,
        imageSize,
        undefined,
        "FAST"
      );

      // Add title below the QR
      doc.setFontSize(10);
      const title = entry.title.length > 20 ? entry.title.slice(0, 17) + "..." : entry.title;
      doc.text(title, x + imageSize / 2, y + imageSize + 8, { align: "center" });

      // Move x position for next image
      x += imageSize + gap;
      rowCount++;

      // Wrap to next row if necessary
      if (rowCount >= itemsPerRow) {
        rowCount = 0;
        x = margin;
        y += imageSize + 25;
        // Add new page if overflow
        if (y + imageSize + 25 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = 20;
        }
      }
    });

    doc.save(`good_to_know_qr_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return { generateGoodToKnowPdf };
};
