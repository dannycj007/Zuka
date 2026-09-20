import QRCode from "qrcode";

/**
 * Renders data as an inline QR SVG string, server-side. Always
 * black-on-transparent regardless of the event's theme — QR modules need
 * strong contrast to scan reliably, and a themed accent color here risks
 * exactly the thing this feature can't afford to risk (the brief's #1
 * non-negotiable is check-in working). The surrounding page provides
 * theming; the code itself stays plain.
 *
 * Embedding via dangerouslySetInnerHTML is safe here: the markup comes
 * entirely from this trusted encoder, never from user input.
 */
export async function generateQrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#00000000" },
  });
}
