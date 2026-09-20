import { ImageResponse } from "next/og";
import { loadInvite } from "./data";
import { parseThemeConfig } from "@/lib/theme";

export const alt = "Invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await loadInvite(token);
  const theme = parseThemeConfig(invite?.themeConfig ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
          color: theme.colors.foreground,
          padding: 64,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, opacity: 0.7 }}>
          {invite ? "You're invited" : "ZukaEvents"}
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, marginTop: 20 }}>
          {invite ? invite.fullName : "Invitation"}
        </div>
        {invite && (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              marginTop: 24,
              color: theme.colors.accent,
            }}
          >
            {invite.eventName}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
