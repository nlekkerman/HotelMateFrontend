import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const useBarStockPdfExporter = () => {
  const slugify = (text) =>
    text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

  const generateBarStockPdf = (
    data,
    startDate,
    endDate,
    hotelName = "Unknown Hotel"
  ) => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();
    const columns = [
      "Item",
      "Closing Storage Stock",
      "Active Bar Stock",
      "Sales",
      "Waste",
      "Final Bar Stock",
      "Final Total Stock",
    ];

    const formatNumber = (num) =>
      Number(num) % 1 === 0
        ? Number(num)
        : Number(num)
            .toFixed(2)
            .replace(/\.?0+$/, "");

    const rows = data.map((item) => [
      item.item_name,
      formatNumber(item.closing_storage ?? 0),
      formatNumber(item.moved_to_bar ?? 0),
      formatNumber(item.sales ?? 0),
      formatNumber(item.waste ?? 0),
      formatNumber(item.final_bar_stock ?? 0),
      formatNumber(item.total_closing_stock ?? 0),
    ]);

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    };

    doc.setFontSize(16);
    doc.text("Bar & Storage Stock Report", 14, 15);
    doc.setFontSize(12);
    doc.text(`Hotel: ${hotelName}`, 14, 20);
    doc.setFontSize(11);
    doc.text(
      `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`,
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
      headStyles: {
        fillColor: [54, 162, 235],
        textColor: 255,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
      },
      theme: "grid",
      didParseCell: (data) => {
        const value = parseFloat(data.cell.text);

        // Highlight negative numbers
        if (!isNaN(value) && value < 0) {
          data.cell.styles.textColor = [255, 102, 102]; // light red
        }

        // "Sales" → red background
        if (data.column.index === 3 && !isNaN(value) && value > 0) {
          data.cell.styles.fillColor = [255, 102, 102];
        }

        // "Waste" → orange background
        if (data.column.index === 4 && !isNaN(value) && value > 0) {
          data.cell.styles.fillColor = [255, 178, 102];
        }

        // "Final Bar Stock" → green if positive
        if (data.column.index === 5 && !isNaN(value) && value > 0) {
          data.cell.styles.fillColor = [102, 255, 102];
        }
      },
    });

    const fileName = `bar_stock_report_${slugify(
      hotelName
    )}_${startDate}_${endDate}.pdf`;
    doc.save(fileName);
  };

  return { generateBarStockPdf };
};
