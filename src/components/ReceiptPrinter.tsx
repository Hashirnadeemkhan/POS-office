// 'use client';

// import { transform } from 'receiptline';

// const ReceiptPrinter = ({ transaction }) => {
//   const printReceipt = async () => {
//     // Receipt ka text-based design
//     const receipt = `
// Store Name
// Date: ${transaction.date}
// Item       Qty  Price
// -----------------------
// ${transaction.items
//   .map(
//     (item) =>
//       `${item.name.padEnd(10)} ${item.quantity.toString().padStart(3)}  ${item.price
//         .toFixed(2)
//         .padStart(6)}`
//   )
//   .join('\n')}
// -----------------------
// Subtotal: ${transaction.subtotal.toFixed(2).padStart(6)}
// Tax:      ${transaction.tax.toFixed(2).padStart(6)}
// Total:    ${transaction.total.toFixed(2).padStart(6)}
// Thank you for your purchase!
// `;

//     // Receipt ko ESC/POS commands mein convert karna (80mm printer ke liye 48 chars width)
//     const command = transform(receipt, { encoding: 'cp437', width: 48 });

//     try {
//       // QZ Tray se connect karna
//       await qz.websocket.connect();
//       // Printer find karna (apne printer ka naam yahan daalo)
//       const printer = await qz.printers.find('My Printer Name');
//       // Print configuration banana
//       const config = qz.configs.create(printer);
//       // Print data taiyar karna
//       const data = [
//         { type: 'raw', format: 'command', flavor: 'plain', data: command },
//       ];
//       // Print command bhejna
//       await qz.print(config, data);
//       console.log('Receipt printed successfully!');
//     } catch (error) {
//       console.error('Printing failed:', error);
//       alert('Printer se connect nahi ho saka. QZ Tray check karo.');
//     } finally {
//       // Connection close karna (optional)
//       qz.websocket.disconnect().catch((err) => console.error(err));
//     }
//   };

//   return <button onClick={printReceipt}>Print Receipt</button>;
// };

// export default ReceiptPrinter;