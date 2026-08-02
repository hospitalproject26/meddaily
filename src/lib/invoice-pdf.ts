import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Keep in sync with PHARMACY_DLC_NUMBER in src/routes/_app/billing.tsx
const PHARMACY_NAME = "SRH MEDICAL";
const PHARMACY_DLC_NUMBER = "DL-20B/21B-000000";

export interface InvoiceLineItem {
  name: string;
  qty: number;
  price: number;
}

export interface InvoicePdfData {
  invoiceId: string;
  customer: string;
  date: string;
  items: Array<InvoiceLineItem>;
  total: number;
  status: string;
}

/**
 * Generates and downloads a single-invoice PDF for a sale or purchase bill.
 * Used by the Sales page ("Download PDF" per row) and the Purchases page.
 */
export function generateInvoicePdf(data: InvoicePdfData, kind: "SALE" | "PURCHASE" = "SALE") {
  const doc = new jsPDF({ unit: "mm", format: "a5" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(PHARMACY_NAME, 10, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`DL No: ${PHARMACY_DLC_NUMBER}`, 10, 18);
  doc.text(kind === "SALE" ? "SALES INVOICE" : "PURCHASE BILL", 10, 23);

  doc.setFontSize(10);
  doc.text(`Invoice: ${data.invoiceId}`, 10, 31);
  doc.text(`Date: ${data.date}`, 10, 36);
  doc.text(`${kind === "SALE" ? "Customer" : "Supplier"}: ${data.customer}`, 10, 41);
  doc.text(`Status: ${data.status}`, 10, 46);

  autoTable(doc, {
    startY: 51,
    head: [["Medicine", "Qty", "Price (Rs.)", "Amount (Rs.)"]],
    body: data.items.map((item) => [
      item.name,
      String(item.qty),
      item.price.toFixed(2),
      (item.qty * item.price).toFixed(2),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [5, 150, 105] },
  });

  // jspdf-autotable attaches this at runtime; not in jsPDF's own type defs.
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 51;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: Rs. ${data.total.toFixed(2)}`, 10, finalY + 8);

  doc.save(`${data.invoiceId}.pdf`);
}
