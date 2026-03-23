"use server";

import { getSession } from "@/lib/auth";
import { projects } from "@/lib/db";

export async function getProjects() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return projects.findManyByUser(session.userId);
}
