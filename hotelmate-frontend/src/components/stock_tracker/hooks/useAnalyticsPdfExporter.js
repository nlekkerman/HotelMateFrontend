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
    : Number(num).toFixed(2).replace(/\.?0+$/, '');

    const rows = data.map((item) => [
      item.item_name,
      formatNumber(item.opening_stock),
      formatNumber(item.added),
      formatNumber(item.removed),
      formatNumber(item.closing_stock),
    ]);

    doc.setFontSize(16);
    doc.text(`Stock Analytics Report`, 14, 15);
    doc.setFontSize(12);
    doc.text(`Hotel: ${hotelName}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Period: ${startDate} → ${endDate}`, 14, 27);

    autoTable(doc, {
      startY: 34,
      head: [columns],
      body: rows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [54, 162, 235] },
    });

    const fileName = `stock_analytics_${slugify(hotelName)}_${startDate}_${endDate}.pdf`;
    doc.save(fileName);
  };

  return { generateAnalyticsPdf };
};
