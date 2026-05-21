import { Sale } from './types';
import { defaultSettings } from './data';

export function printReceipt(sale: Sale) {
  const C = defaultSettings.currencySymbol;
  const date = new Date(sale.date);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const itemRows = sale.items.map(item => `
    <tr>
      <td class="td-desc">
        <span class="item-name">${item.medicineName}</span>
        <span class="item-unit">${C} ${item.price.toFixed(2)} each</span>
      </td>
      <td class="td-qty">${item.quantity}</td>
      <td class="td-amt">${C} ${item.total.toFixed(2)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt — ${sale.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    color: #111;
    background: #fff;
    width: 80mm;
    margin: 0 auto;
    padding: 12px 10px;
  }
  /* ── Header ── */
  .header { text-align: center; margin-bottom: 8px; }
  .hospital-name { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px; }
  .hospital-address { font-size: 10px; color: #444; line-height: 1.5; margin-bottom: 2px; }
  .hospital-phone { font-size: 11px; margin-bottom: 4px; }
  .receipt-label {
    font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
    color: #666; margin-top: 4px;
  }
  /* ── Dividers ── */
  .dashed { border: none; border-top: 1px dashed #aaa; margin: 7px 0; }
  .solid  { border: none; border-top: 2px solid #111; margin: 7px 0; }
  /* ── Info rows ── */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
  .info-table td { padding: 1.5px 0; font-size: 11px; }
  .info-table .lbl { color: #555; width: 46%; }
  .info-table .val { text-align: right; font-weight: 600; }
  /* ── Items table ── */
  .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  .items-table thead tr th {
    font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
    padding: 3px 0; border-bottom: 1px dashed #aaa;
  }
  .th-desc { text-align: left; }
  .th-qty  { text-align: center; width: 28px; }
  .th-amt  { text-align: right;  width: 72px; }
  .td-desc { text-align: left; padding: 4px 0; vertical-align: top; }
  .td-qty  { text-align: center; padding: 4px 0; vertical-align: top; }
  .td-amt  { text-align: right;  padding: 4px 0; vertical-align: top; font-weight: 700; }
  .item-name { display: block; font-weight: 700; }
  .item-unit { display: block; font-size: 10px; color: #666; margin-top: 1px; }
  /* ── Totals ── */
  .totals-table { width: 100%; border-collapse: collapse; }
  .totals-table td { padding: 1.5px 0; font-size: 11px; }
  .totals-table .lbl { color: #555; }
  .totals-table .val { text-align: right; }
  .grand-total td {
    font-size: 14px; font-weight: 700; padding-top: 5px;
  }
  /* ── Footer ── */
  .footer {
    text-align: center; font-size: 10px; color: #555;
    line-height: 1.6; margin-top: 8px;
  }
  /* ── Print ── */
  @page { margin: 0; size: 80mm auto; }
  @media print { html, body { width: 80mm; } }
</style>
</head>
<body>

<div class="header">
  <div class="hospital-name">${defaultSettings.hospitalName}</div>
  <div class="hospital-address">${defaultSettings.address}</div>
  <div class="hospital-phone">${defaultSettings.phone}</div>
  <div class="receipt-label">— Pharmacy Receipt —</div>
</div>

<hr class="dashed">

<table class="info-table">
  <tr><td class="lbl">Invoice</td><td class="val">${sale.invoiceNumber}</td></tr>
  <tr><td class="lbl">Date</td><td class="val">${dateStr}</td></tr>
  <tr><td class="lbl">Time</td><td class="val">${timeStr}</td></tr>
  ${sale.customerName ? `<tr><td class="lbl">Patient</td><td class="val">${sale.customerName}</td></tr>` : ''}
  <tr><td class="lbl">Cashier</td><td class="val">${sale.cashierName}</td></tr>
  <tr><td class="lbl">Payment</td><td class="val">${sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}</td></tr>
</table>

<hr class="dashed">

<table class="items-table">
  <thead>
    <tr>
      <th class="th-desc">Description</th>
      <th class="th-qty">Qty</th>
      <th class="th-amt">Amount</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<hr class="dashed">

<table class="totals-table">
  <tr><td class="lbl">Subtotal</td><td class="val">${C} ${sale.subtotal.toFixed(2)}</td></tr>
  ${sale.discount > 0 ? `<tr><td class="lbl">Discount</td><td class="val">− ${C} ${sale.discount.toFixed(2)}</td></tr>` : ''}
  <tr><td class="lbl">Tax (${defaultSettings.taxPercentage}%)</td><td class="val">${C} ${sale.tax.toFixed(2)}</td></tr>
</table>

<hr class="solid">

<table class="totals-table">
  <tr class="grand-total">
    <td>TOTAL</td>
    <td class="val">${C} ${sale.total.toFixed(2)}</td>
  </tr>
</table>

<hr class="dashed">

<div class="footer">${defaultSettings.receiptFooter}</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=380,height=650,toolbar=no,menubar=no,scrollbars=yes');
  if (!win) { alert('Please allow pop-ups to print receipts.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  // slight delay so styles are applied before the print dialog opens
  setTimeout(() => { win.print(); win.close(); }, 400);
}
