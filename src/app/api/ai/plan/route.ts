import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getProjects } from "@/lib/queries";
import { getOpenAIEnvironment } from "@/lib/env";

const requestSchema = z.object({
  request: z.string().trim().min(10).max(3000),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const environment = getOpenAIEnvironment();
  if (!environment.apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Add it to .env and restart the server." },
      { status: 503 },
    );
  }

  const projects = await getProjects(user.id);
  const portfolio = projects.map((project) => ({
    title: project.title,
    area: project.area,
    status: project.status,
    priority: project.priority,
    nextAction: project.nextAction || null,
    targetDate: project.targetDate,
  }));

  try {
    const client = new OpenAI({ apiKey: environment.apiKey });
    const response = await client.responses.create({
      model: environment.model,
      instructions:
        "You are a rigorous project portfolio adviser. Use only the supplied portfolio data. Separate facts from recommendations. Prefer a small number of active commitments, identify missing next actions, and produce concrete steps. Do not claim to have modified any project data.",
      input: `User request:
${parsed.data.request}

Current project portfolio:
${JSON.stringify(portfolio, null, 2)}`,
      max_output_tokens: 1200,
    });

    return NextResponse.json({ result: response.output_text });
  } catch (error) {
    console.error("AI planner error", error);
    return NextResponse.json(
      { error: "The OpenAI request failed. Check the API key, model name and account billing." },
      { status: 502 },
    );
  }
}

export const runtime = "nodejs";
