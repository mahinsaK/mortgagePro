import QRCode from "qrcode";

export async function generateLoanQrCode(loanId: string) {
  return QRCode.toDataURL(loanId);
}

export async function generateLoanQrPng(loanId: string) {
  return QRCode.toBuffer(loanId, {
    errorCorrectionLevel: "M",
    margin: 2,
    type: "png",
    width: 320,
  });
}
