// hooks/usePdfExporter.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export const usePdfExporter = () => {
  const generateStockMovementsPdf = (data) => {
    const doc = new jsPDF();
    const columns = ["Item", "Direction", "Quantity", "Staff", "Timestamp"];
    const rows = data.map((m) => [
      m.item.name,
      m.direction.toUpperCase(),
      m.quantity,
      m.staff_name,
      format(new Date(m.timestamp), "dd/MM/yy HH:mm"),
    ]);

    doc.text("Stock Movements Report", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [columns],
      body: rows,
    });
    doc.save("stock_movements.pdf");
  };

  return { generateStockMovementsPdf };
};
