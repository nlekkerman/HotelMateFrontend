import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export const useDailyPlanPdfExporter = () => {
  const generateDailyPlanPdf = ({ hotelName, date, department, entries }) => {
    const doc = new jsPDF();

    // Format "HH:mm" from "HH:mm:ss" or "HH:mm"
    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [hour, minute] = timeStr.split(":");
      const date = new Date();
      date.setHours(parseInt(hour), parseInt(minute), 0);
      return format(date, "HH:mm");
    };
    const capitalizeWords = (str) =>
      str.replace(/\b\w/g, (char) => char.toUpperCase());
    // Colors and styles
    const titleColor = "#004080";
    const headerBgColor = "#cce5ff";
    const locationColor = "#007bff";
    const textColor = "#333333";

    // Title
    doc.setTextColor(titleColor);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`Daily Plan for ${capitalizeWords(hotelName)}`, 14, 20);
    // Date & department
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text(`Date: ${format(new Date(date), "EEEE, dd MMMM yyyy")}`, 14, 28);
    if (department) {
      doc.text(`Department: ${department}`, 14, 36);
    }

    // Divider line
    doc.setDrawColor(titleColor);
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    // Group entries by location with time
    const grouped = entries.reduce((acc, entry) => {
      const loc = entry.location_name || entry.location?.name || "No Location";
      const staff =
        entry.staff_name ||
        entry.staff?.full_name ||
        entry.staff?.name ||
        "Unknown Staff";
      const shiftStart = formatTime(entry.shift_start);
      const shiftEnd = formatTime(entry.shift_end);
      const timeStr = shiftStart && shiftEnd ? `${shiftStart}–${shiftEnd}` : "";
      const staffLine = timeStr ? `${staff} (${timeStr})` : staff;

      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(staffLine);
      return acc;
    }, {});

    // Render tables per location
    let currentY = 46;

    Object.entries(grouped).forEach(([location, staffList], idx) => {
      doc.setTextColor(locationColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(location, 14, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        theme: "grid",
        head: [["Staff Members"]],
        body: staffList.map((s) => [s]),
        styles: {
          fontSize: 11,
          cellPadding: 4,
          textColor: textColor,
          font: "helvetica",
        },
        headStyles: {
          fillColor: headerBgColor,
          textColor: "#004080",
          fontStyle: "bold",
          halign: "center",
        },
        margin: { left: 14, right: 14 },
        tableWidth: 182,
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        },
      });

      if (currentY > 270 && idx !== Object.entries(grouped).length - 1) {
        doc.addPage();
        currentY = 20;
      }
    });

    // Footer with page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor("#666666");
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Save
    doc.save(
      `daily_plan_${hotelName.replace(/\s+/g, "_").toLowerCase()}_${date}.pdf`
    );
  };

  return { generateDailyPlanPdf };
};
