import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const useAnalyticsPdfExporter = () => {
  const slugify = (text) =>
    text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

  const generateAnalyticsPdf = (data, startDate, endDate, hotelName = "Unknown Hotel") => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();
    const columns = ["Item", "Opening Stock", "Added", "Removed", "Closing Stock"];

    const formatNumber = (num) =>
      Number(num) % 1 === 0
        ? Number(num)
        : Number(num).toFixed(2).replace(/\.?0+$/, "");

    const rows = data.map((item) => [
      item.item_name,
      formatNumber(item.opening_stock),
      formatNumber(item.added),
      formatNumber(item.removed),
      formatNumber(item.closing_stock),
    ]);
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
  const year = String(date.getFullYear()).slice(-2); // last 2 digits
  return `${day}/${month}/${year}`;
};

    doc.setFontSize(16);
    doc.text(`Stock Analytics Report`, 14, 15);
    doc.setFontSize(12);
    doc.text(`Hotel: ${hotelName}`, 14, 20);
    doc.setFontSize(11);
   doc.text(
  `For Period that is Open on: ${formatDate(startDate)} and Closed on: ${formatDate(endDate)}`,
  14,
  27
);

    autoTable(doc, {
      startY: 34,
      head: [columns],
      body: rows,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      headStyles: { fillColor: [54, 162, 235], textColor: 255, halign: "center" },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
      },
      theme: "grid",
      didParseCell: (data) => {
        const value = parseFloat(data.cell.text);
        // All negative numbers
        if (!isNaN(value) && value < 0) {
          data.cell.styles.textColor = [255, 102, 102]; // light red
        }

        // "Added" column positive → green
        if (data.column.index === 2 && !isNaN(value) && value > 0) {
          data.cell.styles.fillColor = [102, 255, 102]; // light green
        }

        // "Removed" column positive → red
        if (data.column.index === 3 && !isNaN(value) && value > 0) {
          data.cell.styles.fillColor = [255, 102, 102]; // light red
        }
      },
    });

    const fileName = `stock_analytics_${slugify(hotelName)}_${startDate}_${endDate}.pdf`;
    doc.save(fileName);
  };

  return { generateAnalyticsPdf };
};
