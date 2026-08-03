const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export async function fetchLoanQrPng(url: string, signal?: AbortSignal) {
  const response = await fetch(url, {
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    throw new Error("The QR image request failed.");
  }

  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (contentType !== "image/png") {
    throw new Error("The QR download was not a PNG image.");
  }

  const blob = await response.blob();
  const signature = new Uint8Array(
    await blob.slice(0, PNG_SIGNATURE.length).arrayBuffer(),
  );
  const isPng =
    signature.length === PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => signature[index] === byte);

  if (!isPng) {
    throw new Error("The QR download contained invalid image data.");
  }

  return blob;
}

export function downloadLoanQrBlob(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = "loan-qr-code.png";
  anchor.href = objectUrl;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
