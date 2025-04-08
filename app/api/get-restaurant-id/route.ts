import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.headers.get("X-Authenticated-Restaurant-Id");
    const sessionToken = req.headers.get("X-Session-Token");
    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID not found" }, { status: 400 });
    }
    return NextResponse.json({ restaurantId, sessionToken }, { status: 200 });
  } catch (error) {
    console.error("Error fetching restaurant ID:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const restaurantId = req.headers.get("X-Authenticated-Restaurant-Id");
    const sessionToken = req.headers.get("X-Session-Token");
    const cookieRestaurantId = req.cookies.get("impersonationRestaurantId")?.value;

    if (!restaurantId && !cookieRestaurantId) {
      return NextResponse.json({ error: "Restaurant ID not found" }, { status: 400 });
    }

    return NextResponse.json({ restaurantId: restaurantId || cookieRestaurantId, sessionToken }, { status: 200 });
  } catch (error) {
    console.error("Error fetching restaurant ID:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}