import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";

export type Group = {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
};

export async function GET() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, slug, description, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  let body: { name?: string; slug?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const slug = body.slug?.trim() ? nameToSlug(body.slug) : nameToSlug(name);
  if (!slug) {
    return NextResponse.json({ error: "Could not generate a valid slug from name" }, { status: 400 });
  }

  const description = body.description?.trim() ?? "";

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("groups")
    .insert({ name, slug, description })
    .select("id, name, slug, description, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `A group with slug "${slug}" already exists` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
