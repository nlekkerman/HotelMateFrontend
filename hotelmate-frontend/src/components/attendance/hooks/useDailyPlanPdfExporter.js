import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export const useDailyPlanPdfExporter = () => {
  const generateDailyPlanPdf = ({ hotelName, date, department, entries }) => {
    const doc = new jsPDF();

    // Set up some colors and fonts
    const titleColor = "#004080"; // dark blue
    const headerBgColor = "#cce5ff"; // light blue
    const locationColor = "#007bff"; // bootstrap primary blue
    const textColor = "#333333";
    const bullet = "\u2022";

    // Title
    doc.setTextColor(titleColor);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`Daily Plan for ${hotelName}`, 14, 20);

    // Meta info - date & department
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text(`Date: ${format(new Date(date), "EEEE, dd MMMM yyyy")}`, 14, 28);
    if (department) {
      doc.text(`Department: ${department}`, 14, 36);
    }

    // Add a horizontal line under header
    doc.setDrawColor(titleColor);
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    // Prepare table data grouped by location
    const grouped = entries.reduce((acc, entry) => {
      const loc = entry.location_name || entry.location?.name || "No Location";
      const staff =
        entry.staff_name || entry.staff?.full_name || entry.staff?.name || "Unknown Staff";
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(staff);
      return acc;
    }, {});

    // We'll create an array of tables, one per location
    let currentY = 46;

    Object.entries(grouped).forEach(([location, staffList], idx) => {
      // Print location as a header
      doc.setTextColor(locationColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(location, 14, currentY);
      currentY += 8;

      // Use autoTable for staff list with custom styles
      autoTable(doc, {
        startY: currentY,
        theme: "grid",
        head: [["Staff Members"]],
        body: staffList.map((staff) => [staff]),
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
          // Update currentY after drawing the table
          currentY = data.cursor.y + 10;
        },
      });

      // Prevent content overflowing off the page
      if (currentY > 270 && idx !== Object.entries(grouped).length - 1) {
        doc.addPage();
        currentY = 20; // Reset Y position on new page
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

    // Save PDF
    doc.save(`daily_plan_${hotelName.replace(/\s+/g, "_").toLowerCase()}_${date}.pdf`);
  };

  return { generateDailyPlanPdf };
};
