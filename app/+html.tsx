import { ScrollViewStyleReset } from "expo-router/html";
import { PropsWithChildren } from "react";

const darkBackground = "#1C1B1F";

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ backgroundColor: darkBackground }}>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="theme-color" content={darkBackground} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html,
              body,
              #root {
                background-color: ${darkBackground};
              }

              body {
                overscroll-behavior-y: none;
              }
            `
          }}
        />
      </head>
      <body style={{ backgroundColor: darkBackground }}>{children}</body>
    </html>
  );
}
