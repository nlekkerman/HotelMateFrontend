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

    const columns = [
      "Item",
      "Opening",
      "Added",
      "Moved to Bar",
      "Closing"
    ];

    const formatNumber = (num) =>
      num !== null && num !== undefined && !isNaN(num)
        ? Number(num) % 1 === 0
          ? Number(num)
          : Number(num).toFixed(2).replace(/\.?0+$/, "")
        : 0;

    const rows = data.map((item) => [
      item.item_name,
      formatNumber(item.opening_storage),
      formatNumber(item.added),
      formatNumber(item.moved_to_bar),
      formatNumber(item.closing_storage),
    ]);

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
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
      didParseCell: (dataCell) => {
        const value = parseFloat(dataCell.cell.text);
        if (!isNaN(value) && value < 0) dataCell.cell.styles.textColor = [255, 102, 102]; // red for negative
        if ((dataCell.column.index === 2 || dataCell.column.index === 3) && value > 0)
          dataCell.cell.styles.fillColor = [102, 255, 102]; // green for added/moved
      },
    });

    const fileName = `stock_analytics_${slugify(hotelName)}_${startDate}_${endDate}.pdf`;
    doc.save(fileName);
  };

  return { generateAnalyticsPdf };
};
