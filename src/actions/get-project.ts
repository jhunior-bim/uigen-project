"use server";

import { getSession } from "@/lib/auth";
import { projects } from "@/lib/db";

export async function getProject(projectId: string) {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const project = projects.findById(projectId, session.userId);

  if (!project) {
    throw new Error("Project not found");
  }

  return {
    id: project.id,
    name: project.name,
    messages: JSON.parse(project.messages),
    data: JSON.parse(project.data),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
