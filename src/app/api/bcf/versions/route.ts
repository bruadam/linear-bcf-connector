import { NextResponse } from "next/server";

/**
 * BCF API 3.0 – Versions endpoint
 * Solibri calls this to discover supported BCF versions.
 */
export async function GET() {
  return NextResponse.json({
    versions: [
      {
        version_id: "3.0",
        detailed_version: "3.0",
        link_to_documentation: "https://github.com/buildingSMART/BCF-API",
      },
    ],
  });
}
