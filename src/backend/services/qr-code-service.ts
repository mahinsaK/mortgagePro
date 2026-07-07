import QRCode from "qrcode";

export async function generateLoanQrCode(loanId: string) {
  return QRCode.toDataURL(loanId);
}
